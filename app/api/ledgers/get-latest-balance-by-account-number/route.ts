import { NextRequest, NextResponse } from "next/server"
import { applyRateLimit } from "@/lib/rateLimiter"
import { getEntityNumberFromCookie } from "@/lib/constant"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"

export const runtime = "nodejs"

const AWS_REGION = (process.env.AWS_REGION ||
  process.env.AWS_DEFAULT_REGION ||
  "ap-southeast-1").trim()

const LAMBDA_ARN =
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-wallets-ledgers-get-latest-balance-by-account-number"

const client = new LambdaClient({ region: AWS_REGION })

const safeJsonParse = (s: string) => {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

const decodePayload = (p?: Uint8Array) => {
  if (!p || p.length === 0) return ""
  return new TextDecoder("utf-8").decode(p)
}

export async function GET(req: NextRequest) {
  const { allowed, retryAfter } = await applyRateLimit(req)

  if (!allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
  }

  try {
    // account_number = entity_number (from cookie)
    const account_number = (await getEntityNumberFromCookie()).trim()

    if (!account_number) {
      return NextResponse.json(
        {
          exists: false,
          message: "Unauthorized: missing session entity_number",
          reference_date_name: "",
          latest_balance: 0,
        },
        { status: 401 }
      )
    }

    const cmd = new InvokeCommand({
      FunctionName: LAMBDA_ARN,
      InvocationType: "RequestResponse",
      Payload: new TextEncoder().encode(JSON.stringify({ account_number })),
    })

    const resp = await client.send(cmd)

    const raw = decodePayload(resp.Payload)
    const parsed = raw ? safeJsonParse(raw) : null

    let out: any = parsed ?? { _raw: raw }
    if (out && typeof out === "object" && typeof out.body === "string") {
      const inner = safeJsonParse(out.body)
      if (inner) out = inner
    }

    return NextResponse.json(out, { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      {
        exists: false,
        message: "Internal server error",
        reference_date_name: "",
        latest_balance: 0,
        error: e?.message || String(e),
      },
      { status: 500 }
    )
  }
}
