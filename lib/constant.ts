import "server-only"
import { cookies } from "next/headers"
import { jwtDecrypt, base64url } from "jose"

const SESSION_COOKIE_NAME = "jef_jwe_session" as const
const SESSION_SECRET_ENV = "JEF_JWE_SESSION_SECRET_ENV" as const

type SessionPayload = {
  entity_number: string
  employee_number: string
  session_number?: string
}

function asStr(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

function getSecretKey(): Uint8Array | null {
  const secret = asStr(process.env[SESSION_SECRET_ENV])
  if (!secret) return null

  try {
    const key = base64url.decode(secret)
    if (key.length !== 32) return null
    return key
  } catch {
    return null
  }
}

async function readSessionPayloadFromCookie(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = asStr(cookieStore.get(SESSION_COOKIE_NAME)?.value)
    if (!token) return null

    const key = getSecretKey()
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
  } catch {
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
