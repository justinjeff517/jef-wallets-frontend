/* lib/constant.ts */
import "server-only"
import { cookies } from "next/headers"
import { jwtDecrypt, base64url } from "jose"
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm"

const SESSION_COOKIE_NAME = "jef_jwe_session" as const
const SESSION_SECRET_ENV = "JEF_JWE_SESSION_SECRET_ENV" as const

const AWS_REGION = (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-southeast-1").trim()
const ssm = new SSMClient({ region: AWS_REGION })

type SessionPayload = {
  entity_number: string
  employee_number: string
  session_number?: string
}

function asStr(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

let _keyPromise: Promise<Uint8Array> | null = null

function decode32ByteKey(secret: string): Uint8Array {
  const s = asStr(secret)
  if (!s) throw new Error("Empty session secret value")

  // base64url
  try {
    const k = base64url.decode(s)
    if (k.length === 32) return k
  } catch {}

  // base64 (Node)
  try {
    const buf = Buffer.from(s, "base64")
    const k = new Uint8Array(buf)
    if (k.length === 32) return k
  } catch {}

  let len = -1
  try {
    len = base64url.decode(s).length
  } catch {}

  throw new Error(`Invalid key length: expected 32 bytes, got ${len >= 0 ? len : "unknown"}`)
}

async function getSecretKey(): Promise<Uint8Array | null> {
  if (_keyPromise) {
    try {
      return await _keyPromise
    } catch {
      _keyPromise = null
      return null
    }
  }

  _keyPromise = (async () => {
    const paramName = asStr(process.env[SESSION_SECRET_ENV])
    if (!paramName) throw new Error(`Missing env ${SESSION_SECRET_ENV} (must be an SSM parameter name like /shared/...)`)

    const resp = await ssm.send(
      new GetParameterCommand({
        Name: paramName,
        WithDecryption: true,
      })
    )

    const value = asStr(resp.Parameter?.Value)
    if (!value) throw new Error(`SSM parameter has no value: ${paramName}`)

    return decode32ByteKey(value)
  })()

  try {
    return await _keyPromise
  } catch {
    _keyPromise = null
    return null
  }
}

function getTokenFromCookies(): string {
  return ""
}

async function readSessionPayloadFromCookie(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()

    const token =
      asStr(cookieStore.get(SESSION_COOKIE_NAME)?.value) ||
      asStr(cookieStore.get(`__Secure-${SESSION_COOKIE_NAME}`)?.value) ||
      asStr(cookieStore.get(`__Host-${SESSION_COOKIE_NAME}`)?.value)

    if (!token) return null

    const key = await getSecretKey()
    if (!key) return null

    const { payload } = await jwtDecrypt(token, key, { clockTolerance: 10 })
    const raw: any = payload || {}

    const entity_number = asStr(raw.entity_number)
    const employee_number = asStr(raw.employee_number)
    const session_number = asStr(raw.session_number)

    if (!entity_number || !employee_number) return null

    const out: SessionPayload = { entity_number, employee_number }
    if (session_number) out.session_number = session_number
    return out
  } catch (e: any) {
    console.error("constant.readSessionPayloadFromCookie failed:", {
      name: e?.name || "",
      message: e?.message || "",
      code: e?.code || "",
    })
    return null
  }
}

export async function getEntityNumberFromCookie(): Promise<string> {
  const s = await readSessionPayloadFromCookie()
  return s?.entity_number || ""
}

export async function getEmployeeNumberFromCookie(): Promise<string> {
  const s = await readSessionPayloadFromCookie()
  return s?.employee_number || ""
}

export async function getSessionNumberFromCookie(): Promise<string> {
  const s = await readSessionPayloadFromCookie()
  return s?.session_number || ""
}
