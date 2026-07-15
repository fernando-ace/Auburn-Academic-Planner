import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("Chat requires informed Gemini consent and provides revocation", async () => {
  const source = await readFile(
    path.join(projectRoot, "src", "components", "chat-workspace.tsx"),
    "utf8",
  );

  assert.match(source, /Before your first question/);
  assert.match(source, /up to five recent/);
  assert.match(source, /Google processes that content to generate the\s+answer/);
  assert.match(source, /Do not include names, student IDs/);
  assert.match(source, /I agree to send this Chat content to Google Gemini/);
  assert.match(source, /Nothing is sent to Gemini until you choose to enable Chat/);
  assert.match(source, /Reset chat and revoke consent/);
  assert.match(source, /geminiConsent: true/);
  assert.match(source, /geminiConsentVersion: GEMINI_CHAT_CONSENT_VERSION/);
  assert.match(source, /minimizeGeminiChatMessages\(nextMessages\)/);
  assert.match(source, /href="\/privacy"/);
});

test("Privacy distinguishes local PDF analysis from Gemini-backed Chat", async () => {
  const source = await readFile(
    path.join(projectRoot, "src", "app", "privacy", "page.tsx"),
    "utf8",
  );

  assert.match(source, /PDF analysis is deterministic/);
  assert.match(source, /does not send PDF contents to Gemini/);
  assert.match(source, /Chat is off until you explicitly consent/);
  assert.match(source, /up to five recent, non-error messages are sent to Google Gemini/);
  assert.match(source, /browser-supplied, untrusted continuity context/);
  assert.match(source, /does not authenticate it as prior model output/);
  assert.match(source, /Consent, reset, and data minimization/);
  assert.match(source, /Reset does not retract a request that was already sent/);
  assert.match(source, /API rejects Chat requests without the current consent acknowledgment/);
  assert.match(source, /Do not include names, student IDs/);
  assert.match(source, /saves nothing automatically/);
  assert.match(source, /explicitly choose Save on this device/);
  assert.match(source, /recognized manual course codes, term labels, and planned credit totals/);
  assert.match(source, /stores only the counts omitted so the warning remains visible/);
  assert.match(source, /in that browser for 30 days/);
  assert.match(source, /never saves PDFs, filenames, raw extracted audit evidence, analysis results, or Chat messages/);
  assert.match(source, /Restore and Delete controls stay visible/);
  assert.match(source, /Delete removes the saved plan from this device/);
});
