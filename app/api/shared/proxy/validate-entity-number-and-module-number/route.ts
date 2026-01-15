//H:\github10\jef-portal-frontend\app\api\shared\proxy\validate-entity-number-and-module-number\route.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { applyRateLimit } from "@/lib/rateLimiter"

export const runtime = "nodejs"

const AWS_REGION = (process.env.AWS_REGION || "ap-southeast-1").trim()
const LAMBDA_ARN =
  (process.env.LAMBDA_ARN ||
    "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-iam-validate-entity-number-and-module-number").trim()

const lam = new LambdaClient({ region: AWS_REGION })

function asStr(v: unknown) {
  return typeof v === "string" ? v.trim() : ""
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function bytesToText(b?: Uint8Array | null) {
  if (!b) return ""
  return new TextDecoder().decode(b).trim()
}

function unwrapLambdaBody(obj: any) {
  if (obj && typeof obj === "object" && "body" in obj) {
    const body = (obj as any).body
    if (typeof body === "string") {
      const parsed = safeJsonParse(body)
      return parsed ?? { _raw: body }
    }
    if (body && typeof body === "object") return body
  }
  return obj
}

export async function GET(req: NextRequest) {
  // rate limit first
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

  const url = new URL(req.url)

  const module_number = asStr(url.searchParams.get("module_number"))
  const entity_number = asStr(url.searchParams.get("entity_number"))

  if (!module_number || !entity_number) {
    return NextResponse.json(
      { ok: false, message: "Missing required query params: module_number, entity_number" },
      { status: 400 }
    )
  }

  const payload = { module_number, entity_number }

  try {
    const res = await lam.send(
      new InvokeCommand({
        FunctionName: LAMBDA_ARN,
        InvocationType: "RequestResponse",
        Payload: new TextEncoder().encode(JSON.stringify(payload)),
      })
    )

    const statusCode = Number(res.StatusCode ?? 0)
    const functionError = res.FunctionError ? String(res.FunctionError) : null

    const rawText = bytesToText(res.Payload as Uint8Array | undefined)
    const parsedTop = rawText ? safeJsonParse(rawText) : {}
    const parsed = unwrapLambdaBody(parsedTop ?? { _raw: rawText })

    return NextResponse.json(
      {
        ok: !functionError && statusCode >= 200 && statusCode < 300,
        status_code: statusCode,
        function_error: functionError,
        data: parsed ?? {},
      },
      { status: 200 }
    )
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        message: "Invoke failed",
        error: e?.name ? `${e.name}: ${e.message || ""}`.trim() : String(e),
      },
      { status: 500 }
    )
  }
}
