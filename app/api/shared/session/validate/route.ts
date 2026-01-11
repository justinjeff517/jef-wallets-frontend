// app/api/shared/validate-session/route.ts
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { applyRateLimit } from "@/lib/rateLimiter"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm"
import { readSession } from "@/lib/session"

export const runtime = "nodejs"

const SESSION_COOKIE_NAME = "jef_jwe_session" as const

function asStr(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

const AWS_REGION = asStr(process.env.AWS_REGION) || asStr(process.env.AWS_DEFAULT_REGION) || "ap-southeast-1"
const LAMBDA_ARN =
  asStr(process.env.LAMBDA_ARN) ||
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-iam-validate-entity-number-and-module-number"

// IMPORTANT: this can be either "11" OR "/path/to/MODULE_NUMBER"
const MODULE_NUMBER_SOURCE = asStr(process.env.MODULE_NUMBER)

const lambdaClient = new LambdaClient({ region: AWS_REGION })
const ssmClient = new SSMClient({ region: AWS_REGION })

type SessionPayloadOut = {
  session_number: string
  entity_number: string
  employee_number: string
}

type ApiResponse = {
  cookie_exists: boolean
  is_valid: string
  message: string
  module_number: string
  elapsed_time: string
  payload: SessionPayloadOut
}

type LambdaResp = { is_valid: boolean; message: string }

function emptyPayload(): SessionPayloadOut {
  return { session_number: "", entity_number: "", employee_number: "" }
}

function resp(
  cookie_exists: boolean,
  is_valid: boolean,
  message: string,
  module_number: string,
  elapsed_time: string,
  payload: SessionPayloadOut = emptyPayload(),
  status = 200,
  extraHeaders: Record<string, string> = {}
) {
  const body: ApiResponse = {
    cookie_exists: !!cookie_exists,
    is_valid: is_valid ? "true" : "false",
    message: String(message || ""),
    module_number: String(module_number || ""),
    elapsed_time: String(elapsed_time || ""),
    payload,
  }

  return NextResponse.json(body, {
    status: Number(status) || 200,
    headers: {
      "cache-control": "no-store",
      ...extraHeaders,
    },
  })
}

function payloadToText(p: unknown): string {
  try {
    if (!p) return ""
    if (typeof p === "string") return p.trim()
    if (p instanceof Uint8Array) return Buffer.from(p).toString("utf-8").trim()
    if (Buffer.isBuffer(p)) return p.toString("utf-8").trim()
    return Buffer.from(p as any).toString("utf-8").trim()
  } catch {
    return ""
  }
}

async function invokeLambda(payload: { module_number: string; entity_number: string }): Promise<LambdaResp> {
  const r = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: LAMBDA_ARN,
      InvocationType: "RequestResponse",
      Payload: Buffer.from(JSON.stringify(payload), "utf-8"),
    })
  )

  const raw = payloadToText(r.Payload as any)

  if (r.FunctionError) {
    return { is_valid: false, message: raw ? `Lambda error: ${raw}` : "Lambda error." }
  }

  if (!raw) return { is_valid: false, message: "Empty lambda response." }

  try {
    const data = JSON.parse(raw)

    const inner =
      data && typeof data === "object" && "body" in data && typeof (data as any).body === "string"
        ? (() => {
            try {
              return JSON.parse((data as any).body)
            } catch {
              return null
            }
          })()
        : null

    const final = inner && typeof inner === "object" ? inner : data

    return {
      is_valid: !!(final as any)?.is_valid,
      message: asStr((final as any)?.message) || "",
    }
  } catch {
    return { is_valid: false, message: "Invalid lambda JSON response." }
  }
}

function isDigitsOnly(s: string) {
  return /^\d+$/.test(s)
}

let moduleNumberPromise: Promise<string> | null = null

async function getModuleNumber(): Promise<string> {
  const fallback = "11"
  const src = asStr(MODULE_NUMBER_SOURCE)
  if (!src) return fallback

  // If env already contains digits, use it directly.
  if (isDigitsOnly(src)) return src

  // Otherwise treat env value as SSM parameter name/path
  if (!moduleNumberPromise) {
    moduleNumberPromise = (async () => {
      try {
        const r = await ssmClient.send(
          new GetParameterCommand({
            Name: src,
            WithDecryption: true,
          })
        )
        const val = asStr(r?.Parameter?.Value)
        return val
      } catch {
        return ""
      }
    })()
  }

  const resolved = asStr(await moduleNumberPromise)

  if (!resolved) return fallback
  if (!isDigitsOnly(resolved)) return "__INVALID_DIGITS__"
  return resolved
}

export async function GET(req: NextRequest) {
  const t0 = Date.now()

  const { allowed, retryAfter } = await applyRateLimit(req)
  if (!allowed) {
    return resp(
      false,
      false,
      "Too many requests. Please slow down.",
      "11",
      `${Date.now() - t0}ms`,
      emptyPayload(),
      429,
      { "Retry-After": String(retryAfter) }
    )
  }

  const module_number = await getModuleNumber()
  if (module_number === "__INVALID_DIGITS__") {
    return resp(
      true,
      false,
      "module_number must contain digits only.",
      asStr(MODULE_NUMBER_SOURCE) || "",
      `${Date.now() - t0}ms`,
      emptyPayload(),
      400
    )
  }

  try {
    const cookieStore = await cookies()
    const token = asStr(cookieStore.get(SESSION_COOKIE_NAME)?.value)
    const cookie_exists = !!token

    if (!cookie_exists) {
      return resp(false, false, "Session cookie not found.", module_number, `${Date.now() - t0}ms`, emptyPayload(), 401)
    }

    const s = await readSession()
    if (!s?.entity_number || !s?.employee_number) {
      return resp(true, false, "Session token is invalid or expired.", module_number, `${Date.now() - t0}ms`, emptyPayload(), 401)
    }

    const sessionPayload: SessionPayloadOut = {
      session_number: "",
      entity_number: asStr(s.entity_number),
      employee_number: asStr(s.employee_number),
    }

    const out = await invokeLambda({
      module_number,
      entity_number: sessionPayload.entity_number,
    })

    if (!out.is_valid) {
      return resp(true, false, out.message || "Entity/module validation failed.", module_number, `${Date.now() - t0}ms`, sessionPayload, 403)
    }

    return resp(true, true, out.message || "Session and module are valid.", module_number, `${Date.now() - t0}ms`, sessionPayload, 200)
  } catch (e: any) {
    return resp(true, false, `Server error: ${asStr(e?.message) || "Unknown error"}`, module_number, `${Date.now() - t0}ms`, emptyPayload(), 500)
  }
}
