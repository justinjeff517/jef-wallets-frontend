import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtDecrypt, base64url } from "jose"
import { applyRateLimit } from "@/lib/rateLimiter"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"

export const runtime = "nodejs"

const SESSION_COOKIE_NAME = "jef_jwe_session" as const
const SESSION_SECRET_ENV = "JEF_JWE_SESSION_SECRET_ENV" as const

const AWS_REGION = (process.env.AWS_REGION || "ap-southeast-1").trim()
const LAMBDA_ARN = (
  process.env.LAMBDA_ARN ||
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-iam-validate-entity-number-and-module-number"
).trim()

const MODULE_NUMBER_ENV = "MODULE_NUMBER" as const
const MODULE_NUMBER = (process.env[MODULE_NUMBER_ENV] || "").trim()

const lambda = new LambdaClient({ region: AWS_REGION })

function asStr(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

function toStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

function pickMsg(...msgs: Array<unknown>) {
  for (const m of msgs) {
    const s = toStr(m)
    if (s) return s
  }
  return ""
}

function getSecretKey(): Uint8Array {
  const secret = asStr(process.env[SESSION_SECRET_ENV])
  if (!secret) throw new Error(`Missing env ${SESSION_SECRET_ENV}`)

  const key = base64url.decode(secret)
  if (key.length !== 32) throw new Error(`Invalid key length: expected 32 bytes, got ${key.length}`)
  return key
}

function parseEpochSeconds(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x
  if (typeof x === "string" && x.trim() && Number.isFinite(Number(x))) return Number(x)
  return null
}

function fmtElapsed(ms: number): string {
  const abs = Math.abs(ms)
  const totalMinutes = Math.floor(abs / 60000)
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0")
  const mm = String(totalMinutes % 60).padStart(2, "0")
  return `${hh}:${mm} ago`
}

function humanizeMessage(input: string) {
  const s = (input || "").trim()

  if (!s) return "Something went wrong. Please try again."

  if (/too many requests/i.test(s)) return "Too many requests. Please wait a bit and try again."
  if (/no session cookie/i.test(s)) return "You’re not signed in yet. Please log in to continue."
  if (/invalid or expired session/i.test(s)) return "Your session has expired. Please log in again."
  if (/missing\/invalid session secret/i.test(s)) return "Server setup issue. Please contact support."
  if (/missing env/i.test(s)) return "Server setup issue. Please contact support."
  if (/invalid key length/i.test(s)) return "Server setup issue. Please contact support."
  if (/session payload missing entity_number/i.test(s)) return "Your session data looks incomplete. Please log in again."
  if (/lambda invoke failed/i.test(s)) return "We couldn’t verify your access right now. Please try again."
  if (/failed to validate/i.test(s)) return "We couldn’t verify your access right now. Please try again."
  if (/validation failed/i.test(s)) return "Access check failed. Please make sure you have the right access."
  if (/lambda error/i.test(s)) return "We hit a server error while checking access. Please try again."

  // default: pass-through, but soften
  return s
}

function jsonResp(args: {
  is_valid: boolean
  exists: boolean
  message: string
  elapsed_ms: number
  module_number: string
  entity_number?: unknown
  employee_number?: unknown
}) {
  return NextResponse.json({
    is_valid: args.is_valid,
    exists: args.exists,
    message: humanizeMessage(args.message),
    elapsed_time: fmtElapsed(args.elapsed_ms),
    module_number: args.module_number,
    payload: {
      entity_number: toStr(args.entity_number),
      employee_number: toStr(args.employee_number),
    },
  })
}

async function invokeValidateLambda(payload: { entity_number: string; module_number: string }) {
  const cmd = new InvokeCommand({
    FunctionName: LAMBDA_ARN,
    InvocationType: "RequestResponse",
    Payload: Buffer.from(JSON.stringify(payload), "utf-8"),
  })

  const resp = await lambda.send(cmd)

  const statusCode = Number(resp.StatusCode || 0)
  const fnErr = resp.FunctionError || null

  let text = ""
  if (resp.Payload) {
    try {
      text = Buffer.from(resp.Payload as any).toString("utf-8").trim()
    } catch {
      text = ""
    }
  }

  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { _raw: text }
  }

  return { statusCode, fnErr, data, rawText: text }
}

export async function GET(req: NextRequest) {
  const { allowed, retryAfter } = await applyRateLimit(req)

  if (!allowed) {
    return NextResponse.json(
      { message: humanizeMessage("Too many requests. Please slow down.") },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
  }

  const startedAt = Date.now()

  if (!MODULE_NUMBER) {
    return jsonResp({
      is_valid: false,
      exists: false,
      message: `Missing env ${MODULE_NUMBER_ENV}`,
      elapsed_ms: Date.now() - startedAt,
      module_number: "",
    })
  }

  const cookieStore = await cookies()
  const token = asStr(cookieStore.get(SESSION_COOKIE_NAME)?.value)

  if (!token) {
    return jsonResp({
      is_valid: false,
      exists: false,
      message: "No session cookie",
      elapsed_ms: Date.now() - startedAt,
      module_number: MODULE_NUMBER,
    })
  }

  let key: Uint8Array
  try {
    key = getSecretKey()
  } catch (e: any) {
    return jsonResp({
      is_valid: false,
      exists: true,
      message: pickMsg(e?.message, "Missing/invalid session secret"),
      elapsed_ms: Date.now() - startedAt,
      module_number: MODULE_NUMBER,
    })
  }

  try {
    const { payload } = await jwtDecrypt(token, key, { clockTolerance: 10 })

    const entity_number = toStr((payload as any).entity_number)
    const employee_number = toStr((payload as any).employee_number)

    const iatSec = parseEpochSeconds((payload as any).iat)
    const elapsedMs = iatSec ? Date.now() - iatSec * 1000 : Date.now() - startedAt

    if (!entity_number) {
      return jsonResp({
        is_valid: false,
        exists: true,
        message: "Session payload missing entity_number",
        elapsed_ms: elapsedMs,
        module_number: MODULE_NUMBER,
        entity_number,
        employee_number,
      })
    }

    try {
      const { statusCode, fnErr, data } = await invokeValidateLambda({
        entity_number,
        module_number: MODULE_NUMBER,
      })

      if (statusCode !== 200 || fnErr) {
        const msg = pickMsg(
          (data as any)?.message,
          fnErr ? `Lambda error: ${fnErr}` : "",
          "Lambda invoke failed"
        )

        return jsonResp({
          is_valid: false,
          exists: true,
          message: msg,
          elapsed_ms: elapsedMs,
          module_number: MODULE_NUMBER,
          entity_number,
          employee_number,
        })
      }

      const isValid = typeof (data as any)?.is_valid === "boolean" ? (data as any).is_valid : false
      const msg = pickMsg((data as any)?.message, isValid ? "OK" : "Validation failed")

      return jsonResp({
        is_valid: isValid,
        exists: true,
        message: msg,
        elapsed_ms: elapsedMs,
        module_number: MODULE_NUMBER,
        entity_number,
        employee_number,
      })
    } catch (e: any) {
      return jsonResp({
        is_valid: false,
        exists: true,
        message: pickMsg(e?.message, "Failed to validate module/entity"),
        elapsed_ms: elapsedMs,
        module_number: MODULE_NUMBER,
        entity_number,
        employee_number,
      })
    }
  } catch {
    return jsonResp({
      is_valid: false,
      exists: true,
      message: "Invalid or expired session",
      elapsed_ms: Date.now() - startedAt,
      module_number: MODULE_NUMBER,
    })
  }
}
