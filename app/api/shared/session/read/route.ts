import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtDecrypt, base64url } from "jose"

export const runtime = "nodejs"

const SESSION_COOKIE_NAME = "jef_jwe_session" as const
const SESSION_SECRET_ENV = "JEF_JWE_SESSION_SECRET_ENV" as const

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

function toStr(v: unknown): string | undefined {
  if (typeof v === "string") {
    const s = v.trim()
    return s ? s : undefined
  }
  return undefined
}

export async function GET() {
  const cookieStore = await cookies()
  const token = asStr(cookieStore.get(SESSION_COOKIE_NAME)?.value)

  if (!token) {
    return NextResponse.json({ exists: false, message: "No session cookie", session: null })
  }

  try {
    const key = getSecretKey()
    const { payload } = await jwtDecrypt(token, key, { clockTolerance: 10 })

    return NextResponse.json({
      exists: true,
      message: "OK",
      session: {
        entity_number: toStr((payload as any).entity_number),
        employee_number: toStr((payload as any).employee_number),
      },
    })
  } catch {
    return NextResponse.json({ exists: false, message: "Invalid or expired session", session: null })
  }
}
