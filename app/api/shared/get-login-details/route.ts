// app/api/shared/session/profile/route.ts
import { NextRequest, NextResponse } from "next/server"
import { applyRateLimit } from "@/lib/rateLimiter"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { getEntityNumberFromCookie, getEmployeeNumberFromCookie } from "@/lib/constant"

export const runtime = "nodejs"

const AWS_REGION = (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-southeast-1").trim()

const LAMBDA_ARN_ENTITY =
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-entities-get-entity-by-entity-number"

const LAMBDA_ARN_USER =
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-iam-get-user-by-employee-number"

const lambda = new LambdaClient({ region: AWS_REGION })

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

function decodeLambdaPayload(payloadBytes: Uint8Array | undefined) {
  const text = payloadBytes ? Buffer.from(payloadBytes).toString("utf-8") : ""
  const parsed = safeJsonParse(text)
  return parsed ?? { _non_json_payload: text }
}

function unwrapCommon(body: any) {
  if (!body || typeof body !== "object") return body

  if ("body" in body) {
    const inner = (body as any).body
    if (typeof inner === "string") {
      const parsed = safeJsonParse(inner)
      return parsed ?? { _non_json_body: inner, _raw: body }
    }
    if (inner && typeof inner === "object") return inner
  }

  if ((body as any).response && typeof (body as any).response === "object") {
    return (body as any).response
  }

  return body
}

async function invokeLambda(functionArn: string, payload: any) {
  const resp = await lambda.send(
    new InvokeCommand({
      FunctionName: functionArn,
      InvocationType: "RequestResponse",
      Payload: Buffer.from(JSON.stringify(payload), "utf-8"),
    })
  )

  const raw = decodeLambdaPayload(resp.Payload as any)
  const unwrapped = unwrapCommon(raw)

  return {
    status_code: resp.StatusCode ?? null,
    function_error: (resp as any).FunctionError ?? null,
    raw_response: raw,
    unwrapped_response: unwrapped,
  }
}

export async function GET(req: NextRequest) {
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

  const entity_number = await getEntityNumberFromCookie()
  const employee_number = await getEmployeeNumberFromCookie()

  if (!entity_number || !employee_number) {
    return NextResponse.json(
      { entity_name: "", entity_address: "", username: "" },
      { status: 401 }
    )
  }

  const [ent, usr] = await Promise.all([
    invokeLambda(LAMBDA_ARN_ENTITY, { entity_number }),
    invokeLambda(LAMBDA_ARN_USER, { employee_number }),
  ])

  const entBody = ent.unwrapped_response || {}
  const entityObj =
    (entBody &&
    typeof entBody === "object" &&
    (entBody as any).entity &&
    typeof (entBody as any).entity === "object"
      ? (entBody as any).entity
      : entBody) || {}

  const entity_name = asStr((entityObj as any).business_name) || asStr((entityObj as any).name) || ""
  const entity_address = asStr((entityObj as any).location) || asStr((entityObj as any).address) || ""

  const usrBody = usr.unwrapped_response || {}
  const username = asStr((usrBody as any).user) || asStr((usrBody as any).username) || ""

  return NextResponse.json(
    {
      entity_name,
      entity_address,
      username,
    },
    { status: 200 }
  )
}
