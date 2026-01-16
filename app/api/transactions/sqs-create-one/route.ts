// H:\github12\jef-wallets-frontend\app\api\transactions\sqs-create-one\route.ts
import { NextRequest, NextResponse } from "next/server"
import { applyRateLimit } from "@/lib/rateLimiter"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"

export const runtime = "nodejs"

const REGION = (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-southeast-1").trim()
const LAMBDA_ARN = (
  process.env.LAMBDA_ARN ||
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-wallets-transactions-sqs-create-one"
).trim()

const lambda = new LambdaClient({ region: REGION })

const asStr = (v: unknown) => (typeof v === "string" ? v.trim() : "")
const asNum = (v: unknown) => {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, "").trim())
    if (Number.isFinite(n)) return n
  }
  return NaN
}

export async function POST(req: NextRequest) {
  const { allowed, retryAfter } = await applyRateLimit(req)
  if (!allowed) {
    return NextResponse.json(
      { is_sent: false, message: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ is_sent: false, message: "Invalid JSON." }, { status: 400 })
  }

  const payload = {
    account_number: asStr(body?.account_number),
    sender_account_number: asStr(body?.sender_account_number),
    sender_account_name: asStr(body?.sender_account_name),
    receiver_account_number: asStr(body?.receiver_account_number),
    receiver_account_name: asStr(body?.receiver_account_name),
    description: asStr(body?.description),
    amount: asNum(body?.amount),
    transaction_id: asStr(body?.transaction_id),
    created_by: asStr(body?.created_by),
  }

  const required = [
    "account_number",
    "sender_account_number",
    "sender_account_name",
    "receiver_account_number",
    "receiver_account_name",
    "description",
    "transaction_id",
    "created_by",
  ] as const

  for (const k of required) {
    if (!payload[k]) {
      return NextResponse.json(
        { is_sent: false, message: `Missing: ${k}` },
        { status: 400 }
      )
    }
  }

  if (!Number.isFinite(payload.amount)) {
    return NextResponse.json(
      { is_sent: false, message: "Missing/invalid: amount" },
      { status: 400 }
    )
  }

  const event = {
    version: "2.0",
    routeKey: "POST /",
    rawPath: "/",
    headers: { "content-type": "application/json" },
    isBase64Encoded: false,
    body: JSON.stringify(payload),
  }

  try {
    const resp = await lambda.send(
      new InvokeCommand({
        FunctionName: LAMBDA_ARN,
        InvocationType: "RequestResponse",
        Payload: new TextEncoder().encode(JSON.stringify(event)),
      })
    )

    const raw = resp.Payload ? new TextDecoder().decode(resp.Payload) : ""
    let out: any = {}
    try {
      out = raw ? JSON.parse(raw) : {}
    } catch {
      out = { raw }
    }

    // if lambda returns API Gateway style: { statusCode, body }
    if (out && typeof out === "object" && "statusCode" in out) {
      const status = Number(out.statusCode || 200)
      let b: any = out.body
      if (typeof b === "string") {
        try { b = JSON.parse(b) } catch {}
      }
      return NextResponse.json(
        { is_sent: status >= 200 && status < 300, message: String(b?.message || "OK") },
        { status }
      )
    }

    // if lambda returns direct: { is_sent, message }
    if (out && typeof out === "object" && "is_sent" in out) {
      return NextResponse.json(
        { is_sent: Boolean(out.is_sent), message: String(out.message || "OK") },
        { status: Boolean(out.is_sent) ? 200 : 502 }
      )
    }

    return NextResponse.json(
      { is_sent: true, message: "OK" },
      { status: 200 }
    )
  } catch (e: any) {
    return NextResponse.json(
      { is_sent: false, message: e?.message ? String(e.message) : "Lambda invoke failed" },
      { status: 502 }
    )
  }
}
