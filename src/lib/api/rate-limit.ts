import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitOptions = {
  namespace: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitAllowed = {
  ok: true;
};

type RateLimitBlocked = {
  ok: false;
  status: 429 | 503;
  error: string;
};

export type RateLimitResult = RateLimitAllowed | RateLimitBlocked;

const inMemoryBuckets = new Map<string, { count: number; resetAt: number }>();
const upstashLimiters = new Map<string, Ratelimit>();

export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const key = `${options.namespace}:${clientIpFromRequest(request)}`;

  if (process.env.NODE_ENV !== "production") {
    return checkInMemoryRateLimit(key, options);
  }

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (url && token) {
    const limiter = getUpstashLimiter(options);
    const result = await limiter.limit(key);

    if (!result.success) {
      return {
        ok: false,
        status: 429,
        error: "Too many requests. Try again in a few minutes.",
      };
    }

    return { ok: true };
  }

  return checkInMemoryRateLimit(key, options);
}

export function resetInMemoryRateLimits() {
  inMemoryBuckets.clear();
}

function checkInMemoryRateLimit(
  key: string,
  { limit, windowSeconds }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const bucket = inMemoryBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    inMemoryBuckets.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      status: 429,
      error: "Too many requests. Try again in a few minutes.",
    };
  }

  bucket.count += 1;
  return { ok: true };
}

function getUpstashLimiter({ namespace, limit, windowSeconds }: RateLimitOptions) {
  const cacheKey = `${namespace}:${limit}:${windowSeconds}`;
  const cached = upstashLimiters.get(cacheKey);

  if (cached) {
    return cached;
  }

  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: false,
    prefix: `auburn-academic-planner:${namespace}`,
  });

  upstashLimiters.set(cacheKey, limiter);
  return limiter;
}

function clientIpFromRequest(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "local"
  );
}
