import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../src/app/api/chat/route.ts";
import { resetInMemoryRateLimits } from "../src/lib/api/rate-limit.ts";
import {
  GEMINI_CHAT_CONSENT_VERSION,
  MAX_GEMINI_CHAT_REQUEST_BYTES,
  MAX_GEMINI_CHAT_USER_MESSAGE_CHARACTERS,
} from "../src/lib/chat-privacy.ts";

test("Chat API preserves the controlled empty-message error", async () => {
  resetInMemoryRateLimits();

  const response = await POST(jsonRequest({ messages: [] }));
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    result.error,
    "Request body must include at least one valid chat message.",
  );
});

test("Chat API rejects messages without current Gemini consent", async () => {
  resetInMemoryRateLimits();

  const response = await POST(
    jsonRequest({
      messages: [{ role: "user", content: "What is Degree Works?" }],
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 403);
  assert.match(result.error, /Explicit consent to Google Gemini processing/);
});

test("Chat API rejects a stale Gemini consent version", async () => {
  resetInMemoryRateLimits();

  const response = await POST(
    jsonRequest({
      geminiConsent: true,
      geminiConsentVersion: "older-version",
      messages: [{ role: "user", content: "What is Degree Works?" }],
    }),
  );

  assert.equal(response.status, 403);
});

test("Chat API rejects an oversized user message before model execution", async () => {
  resetInMemoryRateLimits();

  const response = await POST(
    jsonRequest({
      geminiConsent: true,
      geminiConsentVersion: GEMINI_CHAT_CONSENT_VERSION,
      messages: [
        {
          role: "user",
          content: "x".repeat(MAX_GEMINI_CHAT_USER_MESSAGE_CHARACTERS + 1),
        },
      ],
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 413);
  assert.match(result.error, /user Chat message exceeds/);
});

test("Chat API rejects an oversized request body before parsing", async () => {
  resetInMemoryRateLimits();

  const response = await POST(
    jsonRequest({
      geminiConsent: true,
      geminiConsentVersion: GEMINI_CHAT_CONSENT_VERSION,
      messages: [
        {
          role: "user",
          content: "x".repeat(MAX_GEMINI_CHAT_REQUEST_BYTES),
        },
      ],
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 413);
  assert.match(result.error, /Chat request is too large/);
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "198.51.100.42",
    },
    body: JSON.stringify(body),
  });
}
