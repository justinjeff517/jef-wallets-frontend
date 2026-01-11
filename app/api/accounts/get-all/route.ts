// app/api/wallets/accounts/get-all/route.ts
import { NextRequest, NextResponse } from "next/server"
import { applyRateLimit } from "@/lib/rateLimiter"

export const runtime = "nodejs"

const AWS_REGION = process.env.AWS_REGION?.trim() || "ap-southeast-1"
const LAMBDA_ARN =
  process.env.LAMBDA_ACCOUNTS_GET_ALL_ARN?.trim() ||
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-wallets-accounts-get-all"

export async function GET(req: NextRequest) {
  const { allowed, retryAfter } = await applyRateLimit(req)

  if (!allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    )
  }

  try {
    const { LambdaClient, InvokeCommand } = await import("@aws-sdk/client-lambda")

    const client = new LambdaClient({ region: AWS_REGION })

    const cmd = new InvokeCommand({
      FunctionName: LAMBDA_ARN,
      InvocationType: "RequestResponse",
      Payload: new TextEncoder().encode(JSON.stringify({})),
    })

    const resp = await client.send(cmd)

    const statusCode = resp?.StatusCode ?? 0
    const fnErr = resp?.FunctionError
    const requestId = resp?.$metadata?.requestId

    const bytes = resp?.Payload ? new Uint8Array(resp.Payload as any) : new Uint8Array()
    const text = bytes.length ? new TextDecoder().decode(bytes) : ""

    let data: any = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { raw: text }
    }

    // Lambda proxy response: { statusCode, body: "..." }
    if (data && typeof data === "object" && typeof data.statusCode === "number" && "body" in data) {
      const bodyText = typeof data.body === "string" ? data.body : JSON.stringify(data.body ?? "")
      let out: any = bodyText
      try {
        out = JSON.parse(bodyText)
      } catch {}

      return NextResponse.json(out, {
        status: data.statusCode,
        headers: {
          "x-lambda-status": String(statusCode),
          "x-lambda-request-id": requestId || "",
          ...(fnErr ? { "x-lambda-function-error": String(fnErr) } : {}),
        },
      })
    }

    // Non-proxy response
    const httpStatus = fnErr ? 502 : 200

    return NextResponse.json(
      {
        ok: !fnErr,
        lambda: { statusCode, functionError: fnErr || null, requestId: requestId || null },
        data,
      },
      {
        status: httpStatus,
        headers: {
          "x-lambda-status": String(statusCode),
          "x-lambda-request-id": requestId || "",
          ...(fnErr ? { "x-lambda-function-error": String(fnErr) } : {}),
        },
      }
    )
  } catch (e: any) {
    const msg = e?.message || String(e)
    return NextResponse.json({ ok: false, message: msg }, { status: 500 })
  }
}
