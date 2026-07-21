import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { GET } from "../src/app/api/health/route.ts";
import { UPSTASH_HEALTH_CHECK_TIMEOUT_MS } from "../src/lib/api/rate-limit.ts";

const originalFetch = globalThis.fetch;
const originalEnv = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_FILE_SEARCH_STORE_NAME: process.env.GEMINI_FILE_SEARCH_STORE_NAME,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [name, value] of Object.entries(originalEnv)) {
    restoreEnv(name, value);
  }
});

test("shallow health clearly reports missing configuration without a live check", async () => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_FILE_SEARCH_STORE_NAME;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;

  const response = await GET(healthRequest());
  const result = await response.json();

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
  assert.equal(result.check, "shallow_configuration");
  assert.equal(result.status, "degraded");
  assert.deepEqual(result.services, {
    planning: "ready",
    chatConfiguration: "missing",
    requestProtection: {
      configuration: "missing",
      connectivity: "not_checked",
    },
  });
});

test("shallow health labels configured services without claiming live readiness", async () => {
  configureRequiredServices();
  globalThis.fetch = (() => {
    throw new Error("shallow health must not contact Upstash");
  }) as typeof fetch;

  const response = await GET(healthRequest());
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.check, "shallow_configuration");
  assert.equal(result.status, "configured");
  assert.deepEqual(result.services.requestProtection, {
    configuration: "configured",
    connectivity: "not_checked",
  });
});

test("deep health reports ready only after a live Upstash ping", async () => {
  configureRequiredServices();
  globalThis.fetch = (async () =>
    new Response(JSON.stringify([{ result: "UE9ORw==" }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  const response = await GET(healthRequest("?check=deep"));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.check, "deep_readiness");
  assert.equal(result.status, "ready");
  assert.deepEqual(result.services, {
    planning: "ready",
    chatConfiguration: "configured",
    requestProtection: {
      configuration: "configured",
      connectivity: "ready",
    },
  });
});

test("deep health fails closed within its bounded Upstash timeout", async () => {
  configureRequiredServices();
  globalThis.fetch = ((_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) {
        reject(new Error("expected a bounded Upstash request signal"));
        return;
      }
      const guardTimeout = setTimeout(
        () => reject(new Error("health-check timeout was not enforced")),
        5_000,
      );
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(guardTimeout);
          reject(signal.reason ?? new Error("request aborted"));
        },
        { once: true },
      );
    })) as typeof fetch;

  const startedAt = Date.now();
  const response = await GET(healthRequest("?check=deep"));
  const elapsedMs = Date.now() - startedAt;
  const result = await response.json();

  assert.ok(UPSTASH_HEALTH_CHECK_TIMEOUT_MS < 5_000);
  assert.ok(elapsedMs < 4_000);
  assert.equal(response.status, 503);
  assert.equal(result.status, "degraded");
  assert.deepEqual(result.services.requestProtection, {
    configuration: "configured",
    connectivity: "unavailable",
  });
});

function healthRequest(search = "") {
  return new Request(`https://planner.example/api/health${search}`);
}

function configureRequiredServices() {
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_FILE_SEARCH_STORE_NAME = "test-store";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
