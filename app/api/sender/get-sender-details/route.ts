import { NextRequest, NextResponse } from "next/server"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { applyRateLimit } from "@/lib/rateLimiter"
import { getEntityNumberFromCookie, getEmployeeNumberFromCookie } from "@/lib/constant"

export const runtime = "nodejs"

const AWS_REGION = (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-southeast-1").trim()

const LAMBDA_ACCOUNTS_ARN =
  process.env.LAMBDA_ACCOUNTS_ARN ||
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-wallets-accounts-get-by-account-number"

const LAMBDA_USERS_ARN =
  process.env.LAMBDA_USERS_ARN ||
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-iam-get-user-by-employee-number"

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

function unwrapBody(out: any) {
  const o = out && typeof out === "object" ? out : {}
  const body = o && typeof o.body === "string" ? safeJsonParse(o.body) : o.body
  return body && typeof body === "object" ? body : o
}

function pickAccount(out: any) {
  const b = unwrapBody(out)
  const acc = b?.account && typeof b.account === "object" ? b.account : {}
  const account_number = typeof acc.account_number === "string" ? acc.account_number.trim() : ""
  const account_name = typeof acc.account_name === "string" ? acc.account_name.trim() : ""
  return { account_number, account_name }
}

function pickUser(out: any, fallbackEmployeeNumber: string) {
  const b = unwrapBody(out)

  // supports: { user: { employee_number, employee_name } } OR { user: "employee_name" }
  const u = b?.user
  const employee_number =
    (typeof u === "object" && u && typeof u.employee_number === "string" && u.employee_number.trim()) ||
    fallbackEmployeeNumber

  const employee_name =
    (typeof u === "object" && u && typeof u.employee_name === "string" && u.employee_name.trim()) ||
    (typeof u === "string" ? u.trim() : "")

  return { employee_number, employee_name }
}

async function invokeLambda(functionArn: string, payload: any) {
  const resp = await lambda.send(
    new InvokeCommand({
      FunctionName: functionArn,
      InvocationType: "RequestResponse",
      Payload: new TextEncoder().encode(JSON.stringify(payload)),
    })
  )

  const text = decodePayload(resp.Payload)
  const out = safeJsonParse(text)

  if (resp.FunctionError) {
    return { __error: true, raw: text, out }
  }

  return { __error: false, raw: text, out }
}

export async function GET(req: NextRequest) {
  const { allowed, retryAfter } = await applyRateLimit(req)
  if (!allowed) {
    return NextResponse.json(
      { account_name: "", account_number: "", employee_name: "", employee_number: "" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
  }

  const account_number = (await getEntityNumberFromCookie()).trim()
  const employee_number = (await getEmployeeNumberFromCookie()).trim()

  if (!account_number || !employee_number) {
    return NextResponse.json(
      { account_name: "", account_number: "", employee_name: "", employee_number: "" },
      { status: 401 }
    )
  }

  try {
    const [accResp, userResp] = await Promise.all([
      invokeLambda(LAMBDA_ACCOUNTS_ARN, { account_number }),
      invokeLambda(LAMBDA_USERS_ARN, { employee_number }),
    ])

    if (accResp.__error || userResp.__error) {
      return NextResponse.json(
        { account_name: "", account_number: "", employee_name: "", employee_number: "" },
        { status: 502 }
      )
    }

    const acc = pickAccount(accResp.out)
    const usr = pickUser(userResp.out, employee_number)

    return NextResponse.json(
      {
        account_name: acc.account_name,
        account_number: acc.account_number || account_number,
        employee_name: usr.employee_name,
        employee_number: usr.employee_number || employee_number,
      },
      { status: 200 }
    )
  } catch (e: any) {
    return NextResponse.json(
      { account_name: "", account_number: "", employee_name: "", employee_number: "" },
      { status: 500 }
    )
  }
}
