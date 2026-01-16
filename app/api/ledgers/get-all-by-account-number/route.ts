import { NextRequest, NextResponse } from "next/server"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { applyRateLimit } from "@/lib/rateLimiter"
import { getEntityNumberFromCookie } from "@/lib/constant"

export const runtime = "nodejs"

const AWS_REGION = (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-southeast-1").trim()

const LAMBDA_ARN =
  process.env.LAMBDA_ARN ||
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-wallets-ledgers-get-all-by-account-number"

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

function decodeApiGwBody(outer: any) {
  if (!outer || typeof outer !== "object") return { inner: null as any, innerRaw: "" }

  const isB64 = !!outer.isBase64Encoded
  const body = outer.body

  if (typeof body !== "string") {
    return { inner: body ?? null, innerRaw: body ? JSON.stringify(body) : "" }
  }

  const bodyText = isB64 ? Buffer.from(body, "base64").toString("utf-8") : body
  const inner = bodyText ? safeJsonParse(bodyText) : null
  return { inner, innerRaw: bodyText }
}

export async function GET(req: NextRequest) {
  const { allowed, retryAfter } = await applyRateLimit(req)
  if (!allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
  }

  const entity_number = await getEntityNumberFromCookie()
  const account_number = asStr(entity_number)

  if (!account_number) {
    return NextResponse.json({ message: "Missing entity_number in session." }, { status: 401 })
  }

  try {
    const cmd = new InvokeCommand({
      FunctionName: LAMBDA_ARN,
      InvocationType: "RequestResponse",
      Payload: new TextEncoder().encode(JSON.stringify({ account_number })),
    })

    const resp = await client.send(cmd)

    const functionError = asStr(resp.FunctionError)
    const raw = decodePayload(resp.Payload)
    const outer = raw ? safeJsonParse(raw) : null

    if (!outer) {
      return NextResponse.json(
        { message: "Unexpected lambda response (not JSON).", function_error: functionError || null, raw },
        { status: 502, headers: { "cache-control": "no-store" } }
      )
    }

    if (functionError) {
      return NextResponse.json(
        { message: "Lambda error.", function_error: functionError, response: outer, raw },
        { status: 502, headers: { "cache-control": "no-store" } }
      )
    }

    const looksLikeProxy = typeof outer?.statusCode === "number" || ("body" in outer && outer.body !== undefined)

    if (!looksLikeProxy) {
      return NextResponse.json(outer, { status: 200, headers: { "cache-control": "no-store" } })
    }

    const lambdaStatus = Number(outer.statusCode) || 200
    const { inner, innerRaw } = decodeApiGwBody(outer)

    if (inner === null) {
      return NextResponse.json(
        { message: "Unexpected lambda body format.", statusCode: lambdaStatus, body: innerRaw || outer.body || null },
        { status: 502, headers: { "cache-control": "no-store" } }
      )
    }

    return NextResponse.json(inner, { status: lambdaStatus, headers: { "cache-control": "no-store" } })
  } catch (e: any) {
    return NextResponse.json(
      { message: "Failed to invoke lambda.", error: asStr(e?.message) || String(e) },
      { status: 500, headers: { "cache-control": "no-store" } }
    )
  }
}
