// app/api/transactions/get-all/route.ts
import { NextRequest, NextResponse } from "next/server"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { applyRateLimit } from "@/lib/rateLimiter"
import { getEntityNumberFromCookie } from "@/lib/constant"

export const runtime = "nodejs"

const AWS_REGION = (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-southeast-1").trim()

const LAMBDA_ARN =
  (process.env.LAMBDA_ARN ||
    "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-wallets-transactions-get-all-by-account-number").trim()

const client = new LambdaClient({ region: AWS_REGION })

function asStr(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function decodePayload(payload?: Uint8Array) {
  if (!payload) return ""
  return new TextDecoder("utf-8").decode(payload)
}

function unwrapApiGatewayLike(x: any) {
  if (!x || typeof x !== "object") return x
  if (typeof x.body === "string") {
    const inner = safeJsonParse(x.body)
    return inner ?? x
  }
  return x
}

export async function GET(req: NextRequest) {
  const { allowed, retryAfter } = await applyRateLimit(req)
  if (!allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
  }

  const account_number = asStr(await getEntityNumberFromCookie())
  if (!account_number) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 })
  }

  const payload = { account_number }

  try {
    const cmd = new InvokeCommand({
      FunctionName: LAMBDA_ARN,
      InvocationType: "RequestResponse",
      Payload: new TextEncoder().encode(JSON.stringify(payload)),
    })

    const resp = await client.send(cmd)

    const raw = decodePayload(resp.Payload)
    const outer = safeJsonParse(raw)
    const parsed = unwrapApiGatewayLike(outer ?? raw)

    if (resp.FunctionError) {
      return NextResponse.json(
        {
          message: "Lambda error.",
          function_error: resp.FunctionError,
          raw: outer ?? raw,
        },
        { status: 502 }
      )
    }

    return NextResponse.json(parsed ?? { message: "OK", raw: outer ?? raw })
  } catch (e: any) {
    return NextResponse.json(
      { message: "Invoke failed.", error: asStr(e?.message) || "Unknown error" },
      { status: 500 }
    )
  }
}
