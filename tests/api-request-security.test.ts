import assert from "node:assert/strict";
import test from "node:test";

import {
  isDeclaredBodyTooLarge,
  privateJsonResponse,
  readLimitedJsonBody,
  validateApiRequest,
} from "../src/lib/api/request-security.ts";

test("API request validation rejects cross-site browser requests", () => {
  const request = jsonRequest({ Origin: "https://malicious.example" });

  assert.deepEqual(validateApiRequest(request, "json"), {
    ok: false,
    status: 403,
    error: "Cross-site requests are not allowed.",
  });
});

test("API request validation rejects cross-site fetch metadata", () => {
  const request = jsonRequest({ "Sec-Fetch-Site": "cross-site" });

  assert.equal(validateApiRequest(request, "json").ok, false);
});

test("API request validation enforces the expected media type", () => {
  const request = new Request("https://planner.example/api/chat", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "{}",
  });

  assert.deepEqual(validateApiRequest(request, "json"), {
    ok: false,
    status: 415,
    error: "Request content type must be application/json.",
  });
});

test("API request validation accepts same-origin JSON requests", () => {
  const request = jsonRequest({ Origin: "https://planner.example" });

  assert.deepEqual(validateApiRequest(request, "json"), { ok: true });
});

test("API request validation honors the public host behind a trusted proxy", () => {
  const request = new Request("http://localhost:3100/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: "127.0.0.1:3100",
      Origin: "http://127.0.0.1:3100",
    },
    body: "{}",
  });

  assert.deepEqual(validateApiRequest(request, "json"), { ok: true });
});

test("limited JSON parsing rejects declared and streamed oversized bodies", async () => {
  const declared = new Request("https://planner.example/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": "101",
    },
    body: "{}",
  });
  assert.deepEqual(await readLimitedJsonBody(declared, 100), {
    ok: false,
    tooLarge: true,
  });

  const streamed = jsonRequest({}, JSON.stringify({ value: "x".repeat(100) }));
  assert.deepEqual(await readLimitedJsonBody(streamed, 20), {
    ok: false,
    tooLarge: true,
  });
});

test("limited JSON parsing returns parsed values and controlled malformed errors", async () => {
  const valid = await readLimitedJsonBody(jsonRequest({}, '{"ok":true}'), 100);
  assert.deepEqual(valid, { ok: true, value: { ok: true } });

  const malformed = await readLimitedJsonBody(jsonRequest({}, "{"), 100);
  assert.deepEqual(malformed, { ok: false, tooLarge: false });
});

test("private JSON responses disable browser and intermediary storage", async () => {
  const response = privateJsonResponse({ ok: true });

  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.deepEqual(await response.json(), { ok: true });
});

test("declared multipart request sizes are rejected before body parsing", () => {
  const request = new Request("https://planner.example/api/upload", {
    method: "POST",
    headers: { "Content-Length": "500" },
  });

  assert.equal(isDeclaredBodyTooLarge(request, 499), true);
  assert.equal(isDeclaredBodyTooLarge(request, 500), false);
});

function jsonRequest(headers: Record<string, string>, body = "{}") {
  return new Request("https://planner.example/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}
