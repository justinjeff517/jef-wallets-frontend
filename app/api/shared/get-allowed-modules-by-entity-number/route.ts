// app/api/iam/allowed-modules/route.ts
import { NextRequest, NextResponse } from "next/server"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"

import { applyRateLimit } from "@/lib/rateLimiter"
import { getEntityNumberFromCookie } from "@/lib/constant"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const AWS_REGION = process.env.AWS_REGION || "ap-southeast-1"
const LAMBDA_ARN =
  process.env.JEF_IAM_ALLOWED_MODULES_LAMBDA_ARN ||
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-iam-get-allowed-modules-by-entity-number"

type AllowedModule = {
  module_number: string
  name: string
  description: string
  href: string
}

type ApiResp = {
  exists: boolean
  message: string
  allowed_modules: AllowedModule[]
  server_time?: string
}

const EMPTY: ApiResp = { exists: false, message: "", allowed_modules: [], server_time: "" }

function asStr(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

function safeObj(raw: any) {
  return raw && typeof raw === "object" ? raw : {}
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function readBody(raw: any) {
  const obj = safeObj(raw)
  const body = obj.body
  if (body == null) return obj
  if (typeof body === "object") return body
  if (typeof body === "string") {
    const parsed = safeJsonParse(body)
    return parsed && typeof parsed === "object" ? parsed : { _raw_body: body }
  }
  return { _raw_body: String(body) }
}

const lam = new LambdaClient({ region: AWS_REGION })

async function invokeAllowedModules(entity_number: string) {
  const payload = { entity_number: String(entity_number) }

  const cmd = new InvokeCommand({
    FunctionName: LAMBDA_ARN,
    InvocationType: "RequestResponse",
    Payload: new TextEncoder().encode(JSON.stringify(payload)),
  })

  const r = await lam.send(cmd)

  const rawStr = r.Payload ? new TextDecoder().decode(r.Payload) : ""
  const parsedTop = safeJsonParse(rawStr)
  const body = readBody(parsedTop)

  return {
    status_code: r.StatusCode ?? 200,
    function_error: r.FunctionError ?? null,
    executed_version: r.ExecutedVersion ?? null,
    request: payload,
    raw_response: parsedTop ?? rawStr,
    response: body,
  }
}

function normalizeResp(body: any): ApiResp {
  const b = safeObj(body)
  const allowed = Array.isArray(b.allowed_modules) ? b.allowed_modules : []
  return {
    exists: !!b.exists,
    message: asStr(b.message),
    allowed_modules: allowed
      .filter((x: any) => x && typeof x === "object")
      .map((x: any) => ({
        module_number: asStr(x.module_number),
        name: asStr(x.name),
        description: asStr(x.description),
        href: asStr(x.href),
      })),
    server_time: asStr(b.server_time),
  }
}

export async function GET(req: NextRequest) {
  const { allowed, retryAfter } = await applyRateLimit(req)

  if (!allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
  }

  try {
    const entity_number = asStr(await getEntityNumberFromCookie())
    if (!entity_number) {
      return NextResponse.json(
        { ...EMPTY, message: "Missing entity_number (cookie)" },
        { status: 401 }
      )
    }

    const inv = await invokeAllowedModules(entity_number)
    const body = normalizeResp(inv.response)

    if (inv.function_error) {
      return NextResponse.json(
        { ...body, exists: false, message: "Lambda FunctionError" },
        {
          status: 502,
          headers: {
            "x-lambda-status": String(inv.status_code ?? ""),
            "x-lambda-function-error": String(inv.function_error),
          },
        }
      )
    }

    return NextResponse.json(body, {
      status: 200,
      headers: {
        "x-lambda-status": String(inv.status_code ?? ""),
        ...(inv.executed_version ? { "x-lambda-version": String(inv.executed_version) } : {}),
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { ...EMPTY, message: String(e?.message || e || "Error") },
      { status: 500 }
    )
  }
}
