import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtDecrypt, base64url } from "jose"

export const runtime = "nodejs"

const SESSION_COOKIE_NAME = "jef_jwe_session" as const
const SESSION_SECRET_ENV = "JEF_JWE_SESSION_SECRET_ENV" as const

function asStr(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

function toStr(v: unknown): string | undefined {
  if (typeof v === "string") {
    const s = v.trim()
    return s ? s : undefined
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v)
  return undefined
}

function getSecretKey(): Uint8Array {
  const secret = asStr(process.env[SESSION_SECRET_ENV])
  if (!secret) throw new Error(`Missing env ${SESSION_SECRET_ENV}`)

  const key = base64url.decode(secret)
  if (key.length !== 32) throw new Error(`Invalid key length: expected 32 bytes, got ${key.length}`)
  return key
}

export async function GET() {
  const expectedModule = asStr(process.env.MODULE_NUMBER)
  if (!expectedModule) {
    return NextResponse.json({ is_valid: false, message: "Missing env MODULE_NUMBER" })
  }

  const cookieStore = await cookies()
  const token = asStr(cookieStore.get(SESSION_COOKIE_NAME)?.value)

  if (!token) {
    return NextResponse.json({ is_valid: false, message: "No session cookie" })
  }

  try {
    const key = getSecretKey()
    const { payload } = await jwtDecrypt(token, key, { clockTolerance: 10 })

    const cookieModule = toStr((payload as any).module_number)
    if (!cookieModule) {
      return NextResponse.json({ is_valid: false, message: "Session missing module_number" })
    }

    if (cookieModule !== expectedModule) {
      return NextResponse.json({ is_valid: false, message: "Module not allowed" })
    }

    return NextResponse.json({ is_valid: true, message: "OK" })
  } catch {
    return NextResponse.json({ is_valid: false, message: "Invalid or expired session" })
  }
}
