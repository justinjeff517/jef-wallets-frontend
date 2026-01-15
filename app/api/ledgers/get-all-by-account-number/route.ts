import { NextRequest, NextResponse } from "next/server"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { applyRateLimit } from "@/lib/rateLimiter"
import { getEntityNumberFromCookie } from "@/lib/constant"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const AWS_REGION =
  (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-southeast-1").trim()

const LAMBDA_ARN =
  (
    process.env.LAMBDA_ARN ||
    "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-wallets-ledgers-get-all-by-account-number"
  ).trim()

const client = new LambdaClient({ region: AWS_REGION })

type LedgerItem = {
  account_number: string
  sender_account_number: string
  sender_account_name: string
  receiver_account_number: string
  receiver_account_name: string
  ledger_id: string
  date: string
  date_name: string
  created: string
  created_name: string
  created_by: string
  type: "credit" | "debit" | string
  description: string
  balance_before: number
  amount: number
  balance_after: number
  elapsed_time: string
}

type ApiResponse = {
  exists: boolean
  message: string
  ledgers: LedgerItem[]
}

function decodePayload(payload: any) {
  if (!payload) return { text: "", body: null }
  const text = Buffer.from(payload).toString("utf-8").trim()
  if (!text) return { text: "", body: null }
  try {
    return { text, body: JSON.parse(text) }
  } catch {
    return { text, body: text }
  }
}

function asBool(v: any) {
  if (typeof v === "boolean") return v
  if (typeof v === "string") return v.trim().toLowerCase() === "true"
  return false
}

function asNum(v: any) {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function asStr(v: any) {
  return typeof v === "string" ? v.trim() : ""
}

function normalizeResponse(raw: any): ApiResponse {
  const src = raw && typeof raw === "object" ? raw : {}
  const exists = asBool(src.exists)
  const message = asStr(src.message)
  const ledgersIn = Array.isArray(src.ledgers) ? src.ledgers : []

  const ledgers: LedgerItem[] = ledgersIn.map((x: any) => ({
    account_number: asStr(x?.account_number),
    sender_account_number: asStr(x?.sender_account_number),
    sender_account_name: asStr(x?.sender_account_name),
    receiver_account_number: asStr(x?.receiver_account_number),
    receiver_account_name: asStr(x?.receiver_account_name),
    ledger_id: asStr(x?.ledger_id),
    date: asStr(x?.date),
    date_name: asStr(x?.date_name),
    created: asStr(x?.created),
    created_name: asStr(x?.created_name),
    created_by: asStr(x?.created_by),
    type: asStr(x?.type) as any,
    description: asStr(x?.description),
    balance_before: asNum(x?.balance_before),
    amount: asNum(x?.amount),
    balance_after: asNum(x?.balance_after),
    elapsed_time: asStr(x?.elapsed_time),
  }))

  return { exists, message, ledgers }
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
    const entity_number = (await getEntityNumberFromCookie()).trim()

    if (!entity_number) {
      const out: ApiResponse = { exists: false, message: "Unauthorized", ledgers: [] }
      return NextResponse.json(out, { status: 401 })
    }

    const payload = { account_number: entity_number }

    const cmd = new InvokeCommand({
      FunctionName: LAMBDA_ARN,
      InvocationType: "RequestResponse",
      Payload: Buffer.from(JSON.stringify(payload), "utf-8"),
    })

    const resp = await client.send(cmd)

    const status_code = resp?.StatusCode ?? 0
    const function_error = resp?.FunctionError ?? null

    const { text, body } = decodePayload(resp?.Payload)

    if (function_error) {
      const out: ApiResponse = { exists: false, message: "Lambda error", ledgers: [] }
      return NextResponse.json(
        { ...out, status_code, function_error, raw: text, response: body },
        { status: 502 }
      )
    }

    const normalized = normalizeResponse(body)

    return NextResponse.json(normalized, { status: 200 })
  } catch (e: any) {
    const out: ApiResponse = { exists: false, message: e?.message || "Server error", ledgers: [] }
    return NextResponse.json(out, { status: 500 })
  }
}
