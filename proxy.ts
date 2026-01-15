/* proxy.ts */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { decrypt } from "@/lib/session"

const COOKIE_NAME_BASE = "jef_jwe_session" as const
const COOKIE_NAME_SECURE = `__Secure-${COOKIE_NAME_BASE}` as const
const COOKIE_NAME_HOST = `__Host-${COOKIE_NAME_BASE}` as const

const LOGIN_URL = (process.env.LOGIN_URL || "https://login.jefoffice.com/").trim()
const ACCESS_DENIED_PATH = "/shared/access-denied"

const AWS_REGION = (process.env.AWS_REGION || "ap-southeast-1").trim()
const LAMBDA_ARN =
  (process.env.LAMBDA_ARN ||
    "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-iam-validate-entity-number-and-module-number").trim()

const MODULE_NUMBER = (process.env.MODULE_NUMBER || "").trim()

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

function getToken(req: NextRequest): string {
  return (
    asStr(req.cookies.get(COOKIE_NAME_BASE)?.value) ||
    asStr(req.cookies.get(COOKIE_NAME_SECURE)?.value) ||
    asStr(req.cookies.get(COOKIE_NAME_HOST)?.value) ||
    ""
  )
}

const lam = new LambdaClient({ region: AWS_REGION })

async function invokeValidate(entity_number: string, module_number: string) {
  const payload = {
    entity_number: String(entity_number),
    module_number: String(module_number),
  }

  const cmd = new InvokeCommand({
    FunctionName: LAMBDA_ARN,
    InvocationType: "RequestResponse",
    Payload: new TextEncoder().encode(JSON.stringify(payload)),
  })

  const r = await lam.send(cmd)

  const rawStr = r.Payload ? new TextDecoder().decode(r.Payload) : ""
  const parsedTop = safeJsonParse(rawStr)
  const body = readBody(parsedTop ?? rawStr)

  const b = safeObj(body)
  const is_allowed = b.is_allowed === true || b.is_valid === true

  return {
    is_allowed,
    status_code: r.StatusCode ?? 200,
    function_error: r.FunctionError ?? null,
    executed_version: r.ExecutedVersion ?? null,
    response: b,
  }
}

function redirectToLogin(request: NextRequest) {
  const return_to = request.nextUrl.href
  const login = new URL(LOGIN_URL)
  login.searchParams.set("return_to", return_to)
  return NextResponse.redirect(login)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // avoid redirect loops
  if (pathname.startsWith(ACCESS_DENIED_PATH)) {
    return NextResponse.next()
  }

  const token = getToken(request)

  // no cookie -> redirect to login
  if (!token) {
    return redirectToLogin(request)
  }

  // cookie exists -> decrypt payload -> get entity_number
  let entity_number = ""
  try {
    const payload: any = await decrypt(token)
    entity_number = asStr(payload?.entity_number)
  } catch {
    entity_number = ""
  }

  // invalid session -> redirect to login
  if (!entity_number) {
    return redirectToLogin(request)
  }

  // missing module env -> deny
  if (!MODULE_NUMBER) {
    return NextResponse.redirect(new URL(ACCESS_DENIED_PATH, request.url))
  }

  // validate via lambda
  try {
    const v = await invokeValidate(entity_number, MODULE_NUMBER)

    if (v.function_error) {
      return NextResponse.redirect(new URL(ACCESS_DENIED_PATH, request.url))
    }

    if (v.is_allowed) {
      return NextResponse.next()
    }

    return NextResponse.redirect(new URL(ACCESS_DENIED_PATH, request.url))
  } catch {
    return NextResponse.redirect(new URL(ACCESS_DENIED_PATH, request.url))
  }
}

export const config = {
  matcher: [
    "/about/:path*",
    "/dashboard/:path*",
    "/((?!api|_next/static|_next/image|.*\\.png$).*)",
  ],
}
