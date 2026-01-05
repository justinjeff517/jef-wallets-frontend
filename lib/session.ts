// lib/specific/session.ts
import "server-only"
import { cookies } from "next/headers"
import { EncryptJWT, jwtDecrypt, base64url } from "jose"

const SESSION_COOKIE_NAME = "jef_jwe_session" as const
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const SESSION_SECRET_ENV = "JEF_JWE_SESSION_SECRET_ENV" as const

const COOKIE_DOMAIN = (process.env.COOKIE_DOMAIN || "").trim()
const IS_DEV = process.env.NODE_ENV !== "production"

function asStr(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

function getSecretKey(): Uint8Array {
  const secret = asStr(process.env[SESSION_SECRET_ENV])
  if (!secret) throw new Error(`Missing env ${SESSION_SECRET_ENV}`)

  const key = base64url.decode(secret)
  if (key.length !== 32) throw new Error(`Invalid key length: expected 32 bytes, got ${key.length}`)
  return key
}

export type SessionPayload = {
  entity_number: string
  employee_number: string
}

async function encrypt(payload: Record<string, any>) {
  const key = getSecretKey()

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
    const key = getSecretKey()
    const { payload } = await jwtDecrypt(t, key, { clockTolerance: 10 })

    const entity_number = payload.entity_number ? String(payload.entity_number) : ""
    const employee_number = payload.employee_number ? String(payload.employee_number) : ""

    if (!entity_number || !employee_number) return null

    return { entity_number, employee_number }
  } catch {
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
