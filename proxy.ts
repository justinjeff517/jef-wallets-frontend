import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { jwtDecrypt, base64url } from "jose"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"

const SESSION_COOKIE_NAME = "jef_jwe_session" as const
const SESSION_SECRET_ENV = "JEF_JWE_SESSION_SECRET_ENV" as const

const AWS_REGION = process.env.AWS_REGION || "ap-southeast-1"
const LAMBDA_ARN =
  process.env.LAMBDA_ARN ||
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-iam-validate-entity-number-and-module-number"

const MODULE_NUMBER = (process.env.MODULE_NUMBER || "").trim()

const IS_DEV = process.env.NODE_ENV === "development"

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
  const body = (obj as any).body
  if (body == null) return obj
  if (typeof body === "object") return body
  if (typeof body === "string") {
    const parsed = safeJsonParse(body)
    return parsed && typeof parsed === "object" ? parsed : { _raw_body: body }
  }
  return { _raw_body: String(body) }
}

const LOGIN_URL = asStr(process.env.LOGIN_URL || "https://login.jefoffice.com/")

const ACCESS_DENIED_PATH = "/shared/access-denied"

let cachedKey: Uint8Array | null = null

const ALLOWED_PATHS = new Set([
  "/api/login",
  "/api/shared/session/validate",
  "/api/shared/session/delete-one",
  "/api/entities/get-entity-by-entity-number",
  ACCESS_DENIED_PATH,
])

const lam = new LambdaClient({ region: AWS_REGION })

function getSecretKey(): Uint8Array {
  if (cachedKey) return cachedKey
  const secret = asStr(process.env[SESSION_SECRET_ENV])
  if (!secret) throw new Error(`Missing env ${SESSION_SECRET_ENV}`)
  cachedKey = base64url.decode(secret)
  return cachedKey
}

function getToken(req: NextRequest): string {
  return (
    asStr(req.cookies.get(SESSION_COOKIE_NAME)?.value) ||
    asStr(req.cookies.get(`__Secure-${SESSION_COOKIE_NAME}`)?.value) ||
    asStr(req.cookies.get(`__Host-${SESSION_COOKIE_NAME}`)?.value)
  )
}

async function readSessionPayload(
  token: string
): Promise<{ entity_number: string; employee_number: string } | null> {
  try {
    const key = getSecretKey()
    const { payload } = await jwtDecrypt(token, key, { clockTolerance: 10 })
    const raw: any = payload || {}
    const entity_number = asStr(raw.entity_number)
    const employee_number = asStr(raw.employee_number)
    if (!entity_number || !employee_number) return null
    return { entity_number, employee_number }
  } catch {
    return null
  }
}

function isAlwaysAllowed(pathname: string) {
  return (
    ALLOWED_PATHS.has(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt)$/.test(pathname)
  )
}

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL(LOGIN_URL)
  const returnTo = req.nextUrl.href

  if (req.nextUrl.origin === loginUrl.origin) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin))
  }

  loginUrl.searchParams.set("return_to", returnTo)
  return NextResponse.redirect(loginUrl)
}

function redirectToAccessDenied(req: NextRequest) {
  const url = new URL(ACCESS_DENIED_PATH, req.nextUrl.origin)
  url.searchParams.set("return_to", req.nextUrl.href)
  return NextResponse.redirect(url)
}

async function invokeValidate(entity_number: string) {
  const payload = {
    module_number: MODULE_NUMBER,
    entity_number: String(entity_number),
  }

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

function isLambdaOk(body: any): boolean {
  const b = safeObj(body) as any
  const v = b.is_valid
  if (typeof v === "boolean") return v
  if (typeof v === "string") return v.trim().toLowerCase() === "true"
  return false
}

export default async function proxy(req: NextRequest) {
  if (IS_DEV) return NextResponse.next()

  const path = req.nextUrl.pathname

  if (isAlwaysAllowed(path)) return NextResponse.next()

  const token = getToken(req)
  if (!token) {
    if (path.startsWith("/api/")) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    return redirectToLogin(req)
  }

  const session = await readSessionPayload(token)
  if (!session?.entity_number) {
    if (path.startsWith("/api/")) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    return redirectToLogin(req)
  }

  if (!MODULE_NUMBER) {
    if (path.startsWith("/api/")) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    return redirectToLogin(req)
  }

  try {
    const inv = await invokeValidate(session.entity_number)

    const lambdaSaysNo = !inv.function_error && !isLambdaOk(inv.response)
    if (lambdaSaysNo) {
      if (path.startsWith("/api/")) {
        return NextResponse.json(
          { message: "Access denied" },
          {
            status: 403,
            headers: {
              "x-lambda-status": String(inv.status_code ?? ""),
            },
          }
        )
      }
      return redirectToAccessDenied(req)
    }

    const ok = !inv.function_error && isLambdaOk(inv.response)
    if (!ok) {
      if (path.startsWith("/api/")) {
        return NextResponse.json(
          { message: "Unauthorized" },
          {
            status: 401,
            headers: {
              "x-lambda-status": String(inv.status_code ?? ""),
              ...(inv.function_error ? { "x-lambda-function-error": String(inv.function_error) } : {}),
            },
          }
        )
      }
      return redirectToLogin(req)
    }

    return NextResponse.next()
  } catch {
    if (path.startsWith("/api/")) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    return redirectToLogin(req)
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
