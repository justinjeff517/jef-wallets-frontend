import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rateLimiter";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { allowed, retryAfter } = await applyRateLimit(req);

  if (!allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  // Your actual handler logic here
  return NextResponse.json({ message: "OK" });
}
