import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { GET } from "../src/app/api/health/route.ts";
import { UPSTASH_HEALTH_CHECK_TIMEOUT_MS } from "../src/lib/api/rate-limit.ts";
import { RELEASE_HEALTH_TOKEN_MIN_LENGTH } from "../src/lib/api/release-health-auth.ts";
import { SUPPORTED_NODE_MAJOR } from "../src/lib/runtime-support.ts";

const originalFetch = globalThis.fetch;
const originalNodeVersion = process.versions.node;
const originalEnv = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_FILE_SEARCH_STORE_NAME: process.env.GEMINI_FILE_SEARCH_STORE_NAME,
  RELEASE_HEALTH_TOKEN: process.env.RELEASE_HEALTH_TOKEN,
  UPSTASH_REDIS_REST_KV_REST_API_TOKEN:
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
  UPSTASH_REDIS_REST_KV_REST_API_URL:
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
};
const releaseHealthToken = "release-health-token-for-test-only";

afterEach(() => {
  globalThis.fetch = originalFetch;
  setNodeVersion(originalNodeVersion);
  for (const [name, value] of Object.entries(originalEnv)) {
    restoreEnv(name, value);
  }
});

test("shallow health clearly reports missing configuration without a live check", async () => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_FILE_SEARCH_STORE_NAME;
  delete process.env.RELEASE_HEALTH_TOKEN;
  clearUpstashEnv();

  const response = await GET(healthRequest());
  const result = await response.json();

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
  assert.equal(result.check, "shallow_configuration");
  assert.equal(result.status, "degraded");
  assert.equal(result.services, undefined);
  assert.equal(result.commit, undefined);
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
  assert.equal(result.services, undefined);
  assert.equal(result.commit, undefined);
});

test("deep health reports ready only after a live Upstash ping", async () => {
  configureRequiredServices();
  process.env.VERCEL_GIT_COMMIT_SHA =
    "0123456789abcdef0123456789abcdef01234567";
  globalThis.fetch = (async () =>
    new Response(JSON.stringify([{ result: "UE9ORw==" }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  const response = await GET(
    healthRequest("?check=deep", releaseHealthToken),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.check, "deep_readiness");
  assert.equal(result.status, "ready");
  assert.equal(
    result.commit,
    "0123456789abcdef0123456789abcdef01234567",
  );
  assert.deepEqual(result.services, {
    planning: "ready",
    chatConfiguration: "configured",
    runtime: {
      nodeMajor: SUPPORTED_NODE_MAJOR,
      support: "supported",
    },
    releaseProbe: "configured",
    requestProtection: {
      configuration: "configured",
      connectivity: "ready",
    },
  });
});

test("deep health accepts Vercel Marketplace Upstash credentials", async () => {
  configureRequiredServices();
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN = "marketplace-token";
  process.env.UPSTASH_REDIS_REST_KV_REST_API_URL =
    "https://marketplace-redis.example";
  process.env.VERCEL_GIT_COMMIT_SHA =
    "0123456789abcdef0123456789abcdef01234567";
  let requestedUrl = "";
  globalThis.fetch = (async (input) => {
    requestedUrl = input instanceof Request ? input.url : String(input);
    return new Response(JSON.stringify([{ result: "UE9ORw==" }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const response = await GET(
    healthRequest("?check=deep", releaseHealthToken),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.status, "ready");
  assert.deepEqual(result.services.requestProtection, {
    configuration: "configured",
    connectivity: "ready",
  });
  assert.match(requestedUrl, /^https:\/\/marketplace-redis\.example\//);
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
  const response = await GET(
    healthRequest("?check=deep", releaseHealthToken),
  );
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

test("deep health rejects unauthorized probes without contacting Upstash", async () => {
  configureRequiredServices();
  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("unauthorized deep health must not contact Upstash");
  }) as typeof fetch;

  for (const token of [undefined, "wrong-release-health-token-value-000"] as const) {
    const response = await GET(healthRequest("?check=deep", token));
    const result = await response.json();

    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
    assert.equal(response.headers.get("www-authenticate"), "Bearer");
    assert.equal(result.status, "unauthorized");
  }
  assert.equal(fetchCalled, false);
});

test("shallow health degrades coherently on an unsupported runtime", async () => {
  configureRequiredServices();
  setNodeVersion("24.0.0");

  const response = await GET(healthRequest());
  const result = await response.json();

  assert.equal(response.status, 503);
  assert.equal(result.status, "degraded");
  assert.equal(result.services, undefined);
});

function healthRequest(search = "", token?: string) {
  return new Request(`https://planner.example/api/health${search}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

function configureRequiredServices() {
  assert.ok(releaseHealthToken.length >= RELEASE_HEALTH_TOKEN_MIN_LENGTH);
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_FILE_SEARCH_STORE_NAME = "test-store";
  process.env.RELEASE_HEALTH_TOKEN = releaseHealthToken;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
}

function clearUpstashEnv() {
  delete process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
}

function setNodeVersion(version: string) {
  Object.defineProperty(process.versions, "node", {
    configurable: true,
    enumerable: true,
    value: version,
  });
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
