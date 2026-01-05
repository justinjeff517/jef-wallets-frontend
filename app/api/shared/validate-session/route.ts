// app/api/shared/validate-session/route.ts
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { applyRateLimit } from "@/lib/rateLimiter"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"

export const runtime = "nodejs"

const SESSION_COOKIE_NAME = "jef_jwt_session" as const
const JWT_SECRET_ENV = "JEF_IAM_JWT_SECRET" as const

const AWS_REGION = process.env.AWS_REGION || "ap-southeast-1"
const LAMBDA_ARN =
  process.env.LAMBDA_ARN ||
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-iam-validate-entity-number-and-module-number"

const MODULE_NUMBER = process.env.MODULE_NUMBER

const lambdaClient = new LambdaClient({ region: AWS_REGION })

type SessionPayload = {
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
  payload: SessionPayload
}

type LambdaResp = { is_valid: boolean; message: string }

function emptyPayload(): SessionPayload {
  return { session_number: "", entity_number: "", employee_number: "" }
}

function getJwtSecret(): Uint8Array | null {
  const secret = (process.env[JWT_SECRET_ENV] || "").trim()
  if (!secret) return null
  return new TextEncoder().encode(secret)
}

function humanizeElapsedFromIat(iat: any): string {
  const iatNum = Number(iat)
  if (!Number.isFinite(iatNum) || iatNum <= 0) return ""

  const nowSec = Math.floor(Date.now() / 1000)
  let diff = nowSec - Math.floor(iatNum)
  if (!Number.isFinite(diff) || diff < 0) diff = 0

  if (diff < 60) return "just now"

  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`

  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`

  const days = Math.floor(hrs / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

function resp(
  cookie_exists: boolean,
  is_valid: boolean,
  message: string,
  module_number: string,
  elapsed_time: string,
  payload: SessionPayload = emptyPayload(),
  status = 200
) {
  const body: ApiResponse = {
    cookie_exists: !!cookie_exists,
    is_valid: is_valid ? "true" : "false",
    message: String(message || ""),
    module_number: String(module_number || ""),
    elapsed_time: String(elapsed_time || ""),
    payload,
  }
  return NextResponse.json(body, { status: Number(status) || 200 })
}

function payloadToText(p: any): string {
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
    return { is_valid: !!data?.is_valid, message: String(data?.message || "") }
  } catch {
    return { is_valid: false, message: "Invalid lambda JSON response." }
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

  const module_number = String(MODULE_NUMBER || "11").trim()
  let token: string | null = null

  try {
    const cookieStore = await cookies()
    token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null

    if (!token) {
      return resp(false, false, "Session cookie not found.", module_number, "", emptyPayload(), 401)
    }

    const secretKey = getJwtSecret()
    if (!secretKey) {
      return resp(true, false, "JWT secret is not configured.", module_number, "", emptyPayload(), 500)
    }

    let sessionPayload: SessionPayload = emptyPayload()
    let elapsed_time = ""

    try {
      const { payload } = await jwtVerify(token, secretKey)
      const raw = payload as any

      sessionPayload = {
        session_number: String(raw.session_number ?? "").trim(),
        entity_number: String(raw.entity_number ?? "").trim(),
        employee_number: String(raw.employee_number ?? "").trim(),
      }

      elapsed_time = humanizeElapsedFromIat(raw?.iat)

      if (!sessionPayload.session_number || !sessionPayload.entity_number || !sessionPayload.employee_number) {
        return resp(
          true,
          false,
          "Session token payload is missing required fields.",
          module_number,
          elapsed_time,
          sessionPayload,
          401
        )
      }
    } catch {
      return resp(true, false, "Session token is invalid or expired.", module_number, "", emptyPayload(), 401)
    }

    const out = await invokeLambda({
      module_number,
      entity_number: sessionPayload.entity_number,
    })

    if (!out.is_valid) {
      return resp(true, false, out.message || "Entity/module validation failed.", module_number, elapsed_time, sessionPayload, 403)
    }

    return resp(true, true, out.message || "Session and module are valid.", module_number, elapsed_time, sessionPayload, 200)
  } catch (e: any) {
    return resp(Boolean(token), false, `Server error: ${e?.message || "Unknown error"}`, module_number, "", emptyPayload(), 500)
  }
}
