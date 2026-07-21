import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  checkRateLimit,
  getRateLimitConfigurationStatus,
  resetInMemoryRateLimits,
  UPSTASH_RATE_LIMIT_TIMEOUT_MS,
} from "../src/lib/api/rate-limit.ts";

const originalFetch = globalThis.fetch;
const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  UPSTASH_REDIS_REST_KV_REST_API_TOKEN:
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
  UPSTASH_REDIS_REST_KV_REST_API_URL:
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetInMemoryRateLimits();
  restoreEnv("NODE_ENV", originalEnv.NODE_ENV);
  restoreEnv(
    "UPSTASH_REDIS_REST_KV_REST_API_TOKEN",
    originalEnv.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
  );
  restoreEnv(
    "UPSTASH_REDIS_REST_KV_REST_API_URL",
    originalEnv.UPSTASH_REDIS_REST_KV_REST_API_URL,
  );
  restoreEnv("UPSTASH_REDIS_REST_TOKEN", originalEnv.UPSTASH_REDIS_REST_TOKEN);
  restoreEnv("UPSTASH_REDIS_REST_URL", originalEnv.UPSTASH_REDIS_REST_URL);
});

test("an Upstash timeout uses the bounded local fallback", async () => {
  setEnv("NODE_ENV", "production");
  setEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
  setEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
  resetInMemoryRateLimits();

  globalThis.fetch = (() =>
    new Promise<Response>(() => undefined)) as typeof fetch;

  const request = new Request("https://auburn.example/api/protected", {
    headers: { "x-forwarded-for": "203.0.113.19" },
  });
  const options = {
    namespace: "production-timeout-fallback",
    limit: 1,
    windowSeconds: 60,
  };
  const startedAt = Date.now();
  const results = await Promise.all([
    checkRateLimit(request, options),
    checkRateLimit(request, options),
  ]);

  assert.ok(UPSTASH_RATE_LIMIT_TIMEOUT_MS < 5_000);
  assert.ok(Date.now() - startedAt < 3_500);
  assert.equal(results.filter((result) => result.ok).length, 1);
  const blocked = results.find((result) => !result.ok);
  assert.ok(blocked && !blocked.ok);
  if (blocked && !blocked.ok) {
    assert.equal(blocked.status, 429);
  }
});

test("production requests use in-memory rate limiting when Upstash is not configured", async () => {
  setEnv("NODE_ENV", "production");
  clearUpstashEnv();
  resetInMemoryRateLimits();

  const request = new Request("https://auburn.example/api/protected", {
    headers: { "x-forwarded-for": "203.0.113.17" },
  });
  const options = {
    namespace: "production-fallback",
    limit: 1,
    windowSeconds: 60,
  };

  const firstResult = await checkRateLimit(request, options);
  const secondResult = await checkRateLimit(request, options);

  assert.deepEqual(firstResult, { ok: true });
  assert.equal(secondResult.ok, false);
  if (!secondResult.ok) {
    assert.equal(secondResult.status, 429);
    assert.equal(secondResult.error, "Too many requests. Try again in a few minutes.");
  }
});

test("Vercel Marketplace REST credentials activate Upstash rate limiting", async () => {
  setEnv("NODE_ENV", "production");
  clearUpstashEnv();
  setEnv(
    "UPSTASH_REDIS_REST_KV_REST_API_URL",
    "https://marketplace-redis.example",
  );
  setEnv("UPSTASH_REDIS_REST_KV_REST_API_TOKEN", "marketplace-token");
  resetInMemoryRateLimits();

  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    throw new Error("Simulated unavailable Upstash endpoint.");
  }) as typeof fetch;

  assert.deepEqual(getRateLimitConfigurationStatus(), {
    mode: "distributed",
    fullyConfigured: true,
  });

  const result = await checkRateLimit(
    new Request("https://auburn.example/api/protected", {
      headers: { "x-forwarded-for": "203.0.113.20" },
    }),
    {
      namespace: "marketplace-credentials",
      limit: 2,
      windowSeconds: 60,
    },
  );

  assert.deepEqual(result, { ok: true });
  assert.ok(fetchCalls > 0);
});

test("Upstash credentials are never mixed across environment variable families", async () => {
  setEnv("NODE_ENV", "production");
  globalThis.fetch = (() => {
    throw new Error("Partial credential pairs must not contact Upstash.");
  }) as typeof fetch;

  const splitConfigurations = [
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_KV_REST_API_TOKEN"],
    ["UPSTASH_REDIS_REST_KV_REST_API_URL", "UPSTASH_REDIS_REST_TOKEN"],
  ] as const;

  for (const [urlVariable, tokenVariable] of splitConfigurations) {
    clearUpstashEnv();
    setEnv(urlVariable, "https://split-redis.example");
    setEnv(tokenVariable, "split-token");
    resetInMemoryRateLimits();

    assert.deepEqual(getRateLimitConfigurationStatus(), {
      mode: "local_fallback",
      fullyConfigured: false,
    });

    const result = await checkRateLimit(
      new Request("https://auburn.example/api/protected", {
        headers: { "x-forwarded-for": "203.0.113.21" },
      }),
      {
        namespace: `split-credentials-${urlVariable}`,
        limit: 1,
        windowSeconds: 60,
      },
    );
    assert.deepEqual(result, { ok: true });
  }
});

test("partial canonical credentials do not silently fall through to Marketplace", async () => {
  setEnv("NODE_ENV", "production");
  clearUpstashEnv();
  setEnv("UPSTASH_REDIS_REST_URL", "https://partial-canonical.example");
  setEnv(
    "UPSTASH_REDIS_REST_KV_REST_API_URL",
    "https://marketplace-redis.example",
  );
  setEnv("UPSTASH_REDIS_REST_KV_REST_API_TOKEN", "marketplace-token");
  resetInMemoryRateLimits();

  globalThis.fetch = (() => {
    throw new Error("A partial preferred pair must fail configuration closed.");
  }) as typeof fetch;

  assert.deepEqual(getRateLimitConfigurationStatus(), {
    mode: "local_fallback",
    fullyConfigured: false,
  });

  const result = await checkRateLimit(
    new Request("https://auburn.example/api/protected", {
      headers: { "x-forwarded-for": "203.0.113.22" },
    }),
    {
      namespace: "partial-canonical-credentials",
      limit: 1,
      windowSeconds: 60,
    },
  );
  assert.deepEqual(result, { ok: true });
});

function clearUpstashEnv() {
  delete process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

function setEnv(name: string, value: string) {
  process.env[name] = value;
}
