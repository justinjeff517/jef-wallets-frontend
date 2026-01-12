import { NextRequest, NextResponse } from "next/server"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { applyRateLimit } from "@/lib/rateLimiter"
import { getEntityNumberFromCookie } from "@/lib/constant"

export const runtime = "nodejs"

const AWS_REGION = (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-southeast-1").trim()
const LAMBDA_ARN =
  process.env.LAMBDA_ARN ||
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-wallets-accounts-get-by-account-number"

const lambda = new LambdaClient({ region: AWS_REGION })

function decodePayload(bytes?: Uint8Array) {
  if (!bytes || bytes.length === 0) return ""
  return new TextDecoder("utf-8").decode(bytes)
}

function safeJsonParse(text: string) {
  const t = (text || "").trim()
  if (!t) return {}
  try {
    return JSON.parse(t)
  } catch {
    return { raw: t }
  }
}

function normalize(out: any) {
  const fallback = {
    exists: false,
    message: "Account not found.",
    account: { account_number: "", account_name: "" },
  }

  const o = out && typeof out === "object" ? out : {}

  // handle API Gateway style: { statusCode, body: "..." }
  const body = o && typeof o.body === "object" ? o.body : o
  const b = body && typeof body === "object" ? body : {}

  const exists = typeof b.exists === "boolean" ? b.exists : false
  const message = typeof b.message === "string" ? b.message : exists ? "Account found." : fallback.message

  const acc = b.account && typeof b.account === "object" ? b.account : {}
  const account_number = typeof acc.account_number === "string" ? acc.account_number.trim() : ""
  const account_name = typeof acc.account_name === "string" ? acc.account_name.trim() : ""

  return {
    exists,
    message,
    account: {
      account_number,
      account_name,
    },
  }
}

export async function GET(req: NextRequest) {
  const { allowed, retryAfter } = await applyRateLimit(req)
  if (!allowed) {
    return NextResponse.json(
      { exists: false, message: "Too many requests. Please slow down.", account: { account_number: "", account_name: "" } },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
  }

  const entity_number = (await getEntityNumberFromCookie()).trim()
  if (!entity_number) {
    return NextResponse.json(
      { exists: false, message: "Unauthorized. Missing session entity_number.", account: { account_number: "", account_name: "" } },
      { status: 401 }
    )
  }

  try {
    const resp = await lambda.send(
      new InvokeCommand({
        FunctionName: LAMBDA_ARN,
        InvocationType: "RequestResponse",
        Payload: new TextEncoder().encode(JSON.stringify({ account_number: entity_number })),
      })
    )

    const text = decodePayload(resp.Payload)
    let out: any = safeJsonParse(text)

    if (out && typeof out === "object" && "body" in out && typeof out.body === "string") {
      out.body = safeJsonParse(out.body)
    }

    if (resp.FunctionError) {
      return NextResponse.json(
        normalize({
          exists: false,
          message: "Lambda returned an error.",
          account: { account_number: "", account_name: "" },
        }),
        { status: 502 }
      )
    }

    return NextResponse.json(normalize(out), { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      { exists: false, message: e?.message || "Invoke failed.", account: { account_number: "", account_name: "" } },
      { status: 500 }
    )
  }
}
