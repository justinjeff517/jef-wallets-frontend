import { NextRequest, NextResponse } from "next/server"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { randomUUID } from "crypto"
import { applyRateLimit } from "@/lib/rateLimiter"

export const runtime = "nodejs"

const AWS_REGION = (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-southeast-1").trim()
const LAMBDA_ARN =
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-wallets-ledgers-sqs-create-one"

function asStr(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

function asNum(v: unknown) {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const s = v.trim()
    if (!s) return null
    const n = Number(s)
    return Number.isFinite(n) ? n : null
  }
  return null
}

const client = new LambdaClient({ region: AWS_REGION })

export async function POST(req: NextRequest) {
  const { allowed, retryAfter } = await applyRateLimit(req)

  if (!allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      }
    )
  }

  try {
    let body: any = null
    try {
      body = await req.json()
    } catch {
      body = null
    }

    const account_number_in = asStr(body?.account_number)
    const sender_account_number_in = asStr(body?.sender_account_number)

    const account_number = sender_account_number_in || account_number_in
    if (!account_number) {
      return NextResponse.json({ ok: false, message: "Missing account_number" }, { status: 400 })
    }

    const sender_account_number = account_number
    const sender_account_name = asStr(body?.sender_account_name)
    const receiver_account_number = asStr(body?.receiver_account_number)
    const receiver_account_name = asStr(body?.receiver_account_name)
    const type = asStr(body?.type) as "credit" | "debit"
    const description = asStr(body?.description)
    const amount = asNum(body?.amount)
    const created_by = asStr(body?.created_by)
    const ledger_id = asStr(body?.ledger_id) || randomUUID()

    if (!sender_account_name) {
      return NextResponse.json({ ok: false, message: "Missing sender_account_name" }, { status: 400 })
    }
    if (!receiver_account_number) {
      return NextResponse.json({ ok: false, message: "Missing receiver_account_number" }, { status: 400 })
    }
    if (!receiver_account_name) {
      return NextResponse.json({ ok: false, message: "Missing receiver_account_name" }, { status: 400 })
    }
    if (type !== "credit" && type !== "debit") {
      return NextResponse.json({ ok: false, message: "Invalid type (must be credit|debit)" }, { status: 400 })
    }
    if (!description) {
      return NextResponse.json({ ok: false, message: "Missing description" }, { status: 400 })
    }
    if (amount === null) {
      return NextResponse.json({ ok: false, message: "Missing/invalid amount" }, { status: 400 })
    }
    if (!created_by) {
      return NextResponse.json({ ok: false, message: "Missing created_by" }, { status: 400 })
    }

    const payload = {
      account_number,
      sender_account_number,
      sender_account_name,
      receiver_account_number,
      receiver_account_name,
      type,
      description,
      amount,
      created_by,
      ledger_id,
    }

    const cmd = new InvokeCommand({
      FunctionName: LAMBDA_ARN,
      InvocationType: "RequestResponse",
      Payload: new TextEncoder().encode(JSON.stringify(payload)),
    })

    const resp = await client.send(cmd)

    const statusCode = resp.StatusCode ?? 0
    const functionError = resp.FunctionError ?? null

    const raw = resp.Payload ? new TextDecoder().decode(resp.Payload) : ""
    let lambdaBody: any = raw
    try {
      lambdaBody = raw ? JSON.parse(raw) : {}
    } catch {}

    const httpStatus = functionError ? 502 : statusCode >= 200 && statusCode < 300 ? 200 : 502

    return NextResponse.json(
      {
        ok: httpStatus === 200,
        lambda: {
          StatusCode: statusCode,
          FunctionError: functionError,
        },
        response: lambdaBody,
      },
      { status: httpStatus }
    )
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "Server error" }, { status: 500 })
  }
}
