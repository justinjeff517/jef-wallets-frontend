/* lib/session.ts */
import "server-only"
import { cookies } from "next/headers"
import { EncryptJWT, jwtDecrypt, base64url } from "jose"
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm"

const SESSION_COOKIE_NAME = "jef_jwe_session" as const
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const SESSION_SECRET_ENV = "JEF_JWE_SESSION_SECRET_ENV" as const

const COOKIE_DOMAIN = (process.env.COOKIE_DOMAIN || "").trim()
const IS_DEV = process.env.NODE_ENV !== "production"

function asStr(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

const AWS_REGION = asStr(process.env.AWS_REGION) || asStr(process.env.AWS_DEFAULT_REGION) || "ap-southeast-1"
const ssm = new SSMClient({ region: AWS_REGION })

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

  // best-effort length for error
  let len = -1
  try {
    len = base64url.decode(s).length
  } catch {}

  throw new Error(`Invalid key length: expected 32 bytes, got ${len >= 0 ? len : "unknown"}`)
}

async function getSecretKey(): Promise<Uint8Array> {
  if (_keyPromise) return _keyPromise

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
  } catch (e) {
    _keyPromise = null
    throw e
  }
}

export type SessionPayload = {
  entity_number: string
  employee_number: string
}

async function encrypt(payload: Record<string, any>) {
  const key = await getSecretKey()

  return await new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + SESSION_TTL_MS) / 1000))
    .encrypt(key)
}

export async function decrypt(token?: string): Promise<SessionPayload | null> {
  const t = asStr(token)
  if (!t) return null

  try {
    const key = await getSecretKey()
    const { payload } = await jwtDecrypt(t, key, { clockTolerance: 10 })

    const entity_number = payload.entity_number ? String(payload.entity_number).trim() : ""
    const employee_number = payload.employee_number ? String(payload.employee_number).trim() : ""

    if (!entity_number || !employee_number) return null
    return { entity_number, employee_number }
  } catch (e: any) {
    // IMPORTANT: don't leak token or secret; this is enough to diagnose
    console.error("session.decrypt failed:", {
      name: e?.name || "",
      message: e?.message || "",
      code: e?.code || "",
    })
    return null
  }
}


export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  const token = await encrypt({
    entity_number: payload.entity_number,
    employee_number: payload.employee_number,
  })

  const cookieStore = await cookies()
  const domainOpt = !IS_DEV && COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: !IS_DEV,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    ...domainOpt,
  })
}

export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = asStr(cookieStore.get(SESSION_COOKIE_NAME)?.value)
  return await decrypt(token)
}

export async function deleteSession() {
  const cookieStore = await cookies()
  const domainOpt = !IS_DEV && COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: !IS_DEV,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
    ...domainOpt,
  })
}
