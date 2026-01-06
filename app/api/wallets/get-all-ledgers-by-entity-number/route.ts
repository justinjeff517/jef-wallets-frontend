import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rateLimiter";
import { getEntityNumberFromCookie } from "@/lib/constant";

export const runtime = "nodejs";

const LAMBDA_ARN =
  process.env.WALLETS_GET_ALL_LEDGERS_LAMBDA_ARN ||
  "arn:aws:lambda:ap-southeast-1:246715082475:function:jef-wallets-get-all-ledgers-by-entity-number";

const AWS_REGION = process.env.AWS_REGION || "ap-southeast-1";

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

async function invokeLambda(entity_number: string) {
  const { LambdaClient, InvokeCommand } = await import("@aws-sdk/client-lambda");
  const client = new LambdaClient({ region: AWS_REGION });

  const payload = JSON.stringify({ entity_number });

  const resp = await client.send(
    new InvokeCommand({
      FunctionName: LAMBDA_ARN,
      InvocationType: "RequestResponse",
      Payload: new TextEncoder().encode(payload),
    })
  );

  const invokeStatus = resp.StatusCode ?? null;
  const functionError = resp.FunctionError ?? null;

  const raw = resp.Payload
    ? new TextDecoder("utf-8", { fatal: false }).decode(resp.Payload)
    : "";

  const outer = raw ? safeJsonParse(raw) : null;

  // API Gateway style: { statusCode, body, ... }
  if (outer && typeof outer === "object" && "body" in outer) {
    const bodyVal = (outer as any).body;
    const bodyStr = typeof bodyVal === "string" ? bodyVal : JSON.stringify(bodyVal ?? "");
    const parsedBody = bodyStr ? safeJsonParse(bodyStr) : null;

    return {
      invoke_status_code: invokeStatus,
      function_error: functionError,
      lambda_response: outer,
      data: parsedBody ?? bodyVal ?? bodyStr,
    };
  }

  // Direct JSON response
  return {
    invoke_status_code: invokeStatus,
    function_error: functionError,
    data: outer ?? raw,
  };
}

export async function GET(req: NextRequest) {
  const { allowed, retryAfter } = await applyRateLimit(req);

  if (!allowed) {
    return NextResponse.json(
      { exists: false, message: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const entity_number = (await getEntityNumberFromCookie()).trim();
  if (!entity_number) {
    return NextResponse.json(
      { exists: false, message: "Unauthorized: missing session entity_number." },
      { status: 401 }
    );
  }

  try {
    const out = await invokeLambda(entity_number);

    if (out.function_error) {
      const msg =
        typeof out.data === "object" && out.data && "message" in (out.data as any)
          ? String((out.data as any).message)
          : "Lambda error.";
      return NextResponse.json({ exists: false, message: msg }, { status: 502 });
    }

    const lr = out.lambda_response as any;
    const appStatus =
      lr && typeof lr === "object" && typeof lr.statusCode === "number" ? lr.statusCode : 200;

    return NextResponse.json(
      out.data ?? { exists: false, message: "Empty response.", ledgers: [] },
      { status: appStatus }
    );
  } catch (e: any) {
    return NextResponse.json(
      { exists: false, message: String(e?.message || "Server error.") },
      { status: 500 }
    );
  }
}
