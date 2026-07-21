import { createHash } from "node:crypto";
import { isIP } from "node:net";

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

type UpstashRedisCredentials = {
  url: string;
  token: string;
};

export type RateLimitResult = RateLimitAllowed | RateLimitBlocked;

const inMemoryBuckets = new Map<string, { count: number; resetAt: number }>();
const upstashLimiters = new Map<string, Ratelimit>();
const warnedFallbackReasons = new Set<string>();
const MAX_IN_MEMORY_BUCKETS = 10_000;
export const UPSTASH_RATE_LIMIT_TIMEOUT_MS = 1_500;
export const UPSTASH_HEALTH_CHECK_TIMEOUT_MS = 2_000;

export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const key = `${options.namespace}:${clientIpFromRequest(request)}`;

  if (process.env.NODE_ENV !== "production") {
    return checkInMemoryRateLimit(key, options);
  }

  const upstashConfiguration = resolveUpstashRedisConfiguration();

  if (upstashConfiguration.credentials) {
    try {
      const limiter = getUpstashLimiter(
        options,
        upstashConfiguration.credentials,
      );
      const result = await limiter.limit(key);

      if (result.reason === "timeout") {
        warnOnce(
          "upstash-timeout",
          "Distributed rate limiting timed out; using the bounded local fallback.",
        );
        return checkInMemoryRateLimit(key, options);
      }

      if (!result.success) {
        return rateLimitExceeded();
      }

      return { ok: true };
    } catch {
      warnOnce(
        "upstash-unavailable",
        "Distributed rate limiting is unavailable; using the bounded local fallback.",
      );
      return checkInMemoryRateLimit(key, options);
    }
  }

  warnOnce(
    upstashConfiguration.hasAnyConfiguredValue
      ? "upstash-partial-config"
      : "upstash-not-configured",
    "Distributed rate limiting is not fully configured; using the bounded local fallback.",
  );
  return checkInMemoryRateLimit(key, options);
}

export function resetInMemoryRateLimits() {
  inMemoryBuckets.clear();
  upstashLimiters.clear();
  warnedFallbackReasons.clear();
}

export function getRateLimitConfigurationStatus() {
  const configured = Boolean(resolveUpstashRedisConfiguration().credentials);

  return {
    mode: configured ? "distributed" : "local_fallback",
    fullyConfigured: configured,
  } as const;
}

export async function checkRateLimitConnectivity() {
  const configuration = resolveUpstashRedisConfiguration();
  if (!configuration.credentials) {
    return "not_configured" as const;
  }

  try {
    const response = await createUpstashRedis(
      UPSTASH_HEALTH_CHECK_TIMEOUT_MS,
      configuration.credentials,
    ).ping();
    return response === "PONG" ? ("ready" as const) : ("unavailable" as const);
  } catch {
    return "unavailable" as const;
  }
}

function checkInMemoryRateLimit(
  key: string,
  { limit, windowSeconds }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const bucket = inMemoryBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    makeRoomForBucket(now, key);
    inMemoryBuckets.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return rateLimitExceeded();
  }

  bucket.count += 1;
  return { ok: true };
}

function getUpstashLimiter(
  { namespace, limit, windowSeconds }: RateLimitOptions,
  credentials: UpstashRedisCredentials,
) {
  const cacheKey = `${namespace}:${limit}:${windowSeconds}`;
  const cached = upstashLimiters.get(cacheKey);

  if (cached) {
    return cached;
  }

  const limiter = new Ratelimit({
    redis: createUpstashRedis(UPSTASH_RATE_LIMIT_TIMEOUT_MS, credentials),
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: false,
    prefix: `auburn-academic-planner:${namespace}`,
    timeout: UPSTASH_RATE_LIMIT_TIMEOUT_MS,
  });

  upstashLimiters.set(cacheKey, limiter);
  return limiter;
}

function createUpstashRedis(
  timeoutMs: number,
  credentials: UpstashRedisCredentials,
) {
  return new Redis({
    url: credentials.url,
    token: credentials.token,
    retry: false,
    signal: () => AbortSignal.timeout(timeoutMs),
  });
}

function resolveUpstashRedisConfiguration() {
  const canonical = {
    url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
    token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  };
  const marketplace = {
    url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL?.trim(),
    token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN?.trim(),
  };

  if (canonical.url || canonical.token) {
    return {
      credentials:
        canonical.url && canonical.token
          ? { url: canonical.url, token: canonical.token }
          : null,
      hasAnyConfiguredValue: true,
    };
  }

  if (marketplace.url || marketplace.token) {
    return {
      credentials:
        marketplace.url && marketplace.token
          ? { url: marketplace.url, token: marketplace.token }
          : null,
      hasAnyConfiguredValue: true,
    };
  }

  return {
    credentials: null,
    hasAnyConfiguredValue: false,
  };
}

function clientIpFromRequest(request: Request) {
  const candidates = [
    request.headers.get("x-real-ip"),
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-forwarded-for")?.split(",")[0],
  ];
  const clientIp = candidates
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(value && isIP(value)));

  if (!clientIp) {
    return "local";
  }

  return createHash("sha256").update(clientIp).digest("hex").slice(0, 24);
}

function makeRoomForBucket(now: number, nextKey: string) {
  if (inMemoryBuckets.has(nextKey) || inMemoryBuckets.size < MAX_IN_MEMORY_BUCKETS) {
    return;
  }

  for (const [key, bucket] of inMemoryBuckets) {
    if (bucket.resetAt <= now) {
      inMemoryBuckets.delete(key);
    }
  }

  while (inMemoryBuckets.size >= MAX_IN_MEMORY_BUCKETS) {
    const oldestKey = inMemoryBuckets.keys().next().value;
    if (typeof oldestKey !== "string") {
      break;
    }
    inMemoryBuckets.delete(oldestKey);
  }
}

function rateLimitExceeded(): RateLimitBlocked {
  return {
    ok: false,
    status: 429,
    error: "Too many requests. Try again in a few minutes.",
  };
}

function warnOnce(reason: string, message: string) {
  if (warnedFallbackReasons.has(reason)) {
    return;
  }

  warnedFallbackReasons.add(reason);
  console.warn(`[rate-limit] ${message}`);
}
