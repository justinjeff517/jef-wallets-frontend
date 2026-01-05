import { RateLimiterMemory } from "rate-limiter-flexible";
import type { NextRequest } from "next/server";

const limiter = new RateLimiterMemory({
  points: 2,    // 5 requests
  duration: 1,   // per 1 second
});

export async function applyRateLimit(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    // @ts-ignore - not always defined depending on runtime
    req.ip ||
    "anonymous";

  try {
    const res = await limiter.consume(ip);
    return {
      allowed: true,
      remaining: res.remainingPoints,
      retryAfter: 0,
    };
  } catch (rej: any) {
    const retryAfter = Math.ceil(rej.msBeforeNext / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    };
  }
}
