import { GEMINI_CHAT_CONSENT_VERSION } from "../src/lib/chat-privacy.ts";

const configuredUrl = process.env.DEPLOYED_APP_URL?.trim();

if (!configuredUrl) {
  throw new Error(
    "Set DEPLOYED_APP_URL to the production origin before running this smoke test.",
  );
}

const baseUrl = new URL(configuredUrl);
if (
  baseUrl.protocol !== "https:" &&
  baseUrl.hostname !== "localhost" &&
  baseUrl.hostname !== "127.0.0.1"
) {
  throw new Error("DEPLOYED_APP_URL must use HTTPS outside localhost.");
}

const productionOrigin = baseUrl.origin;

await checkPage("Planning Hub", "/plan-check", "Planning Hub");
await checkPage("Chat", "/chat", "Source-Grounded Chat");
await checkHealth();
await checkPlanningApi();
await checkChatValidation();
await checkGroundedChat();

console.info(`Production smoke passed for ${productionOrigin}.`);

async function checkPage(label: string, pathname: string, expectedTitle: string) {
  const response = await fetchWithTimeout(new URL(pathname, productionOrigin));
  const html = await response.text();

  assert(response.ok, `${label} returned HTTP ${response.status}.`);
  assert(
    html.includes(`<title>${expectedTitle} | Auburn Academic Planner</title>`),
    `${label} did not render its route-specific title.`,
  );
  assertSecurityHeaders(response, label);
  console.info(`PASS ${label}`);
}

async function checkHealth() {
  const response = await fetchWithTimeout(
    new URL("/api/health?check=deep", productionOrigin),
  );
  const payload = await readJson(response);
  const requestProtection = isRecord(payload.services)
    ? payload.services.requestProtection
    : null;

  assert(
    response.status === 200 &&
      payload.check === "deep_readiness" &&
      payload.status === "ready" &&
      isRecord(requestProtection) &&
      requestProtection.connectivity === "ready",
    `Health gate is not ready (HTTP ${response.status}): ${JSON.stringify(payload)}`,
  );
  console.info("PASS deep deployment health");
}

async function checkPlanningApi() {
  const response = await fetchWithTimeout(
    new URL("/api/plan/analyze-degreeworks/manual", productionOrigin),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: productionOrigin,
        "Sec-Fetch-Site": "same-origin",
      },
      body: JSON.stringify({
        plannedCoursesText: "Fall 2030 Credits: 6\nCOMP 1210, MATH 1610",
      }),
    },
  );
  const payload = await readJson(response);

  assert(
    response.status === 200 && payload.documentType === "planned_path",
    `Planning API failed (HTTP ${response.status}): ${JSON.stringify(payload)}`,
  );
  assertNoStore(response, "Planning API");
  console.info("PASS deterministic planning API");
}

async function checkChatValidation() {
  const response = await fetchWithTimeout(new URL("/api/chat", productionOrigin), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: productionOrigin,
      "Sec-Fetch-Site": "same-origin",
    },
    body: JSON.stringify({ messages: [] }),
  });
  const payload = await readJson(response);

  assert(
    response.status === 400 && typeof payload.error === "string",
    `Chat validation path failed (HTTP ${response.status}): ${JSON.stringify(payload)}`,
  );
  assertNoStore(response, "Chat API");
  console.info("PASS Chat validation API");
}

async function checkGroundedChat() {
  const response = await fetchWithTimeout(
    new URL("/api/chat", productionOrigin),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: productionOrigin,
        "Sec-Fetch-Site": "same-origin",
      },
      body: JSON.stringify({
        geminiConsent: true,
        geminiConsentVersion: GEMINI_CHAT_CONSENT_VERSION,
        messages: [
          {
            role: "user",
            content:
              "Where does Auburn say a student should open DegreeWorks in AUAccess? Answer in one sentence.",
          },
        ],
      }),
    },
    125_000,
  );
  const payload = await readJson(response);
  const answer = typeof payload.answer === "string" ? payload.answer : "";
  const advisorNote =
    typeof payload.advisorVerificationNote === "string"
      ? payload.advisorVerificationNote
      : "";
  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  const normalizedAnswer = answer.toLowerCase();

  assert(
    response.status === 200,
    `Grounded Chat failed (HTTP ${response.status}): ${JSON.stringify(payload)}`,
  );
  assert(
    normalizedAnswer.includes("auaccess") &&
      normalizedAnswer.includes("degreeworks") &&
      normalizedAnswer.includes("academic portals"),
    "Grounded Chat did not return the expected Auburn DegreeWorks navigation guidance.",
  );
  assert(
    payload.confidence === "High" || payload.confidence === "Medium",
    "Grounded Chat did not return a supported confidence level.",
  );
  assert(
    advisorNote.toLowerCase().includes("advisor"),
    "Grounded Chat omitted its advisor-verification boundary.",
  );
  assert(
    sources.some(
      (source) => isRecord(source) && source.title === "DegreeWorks",
    ),
    "Grounded Chat did not display the expected DegreeWorks source.",
  );
  assert(
    !normalizedAnswer.includes("did not return auburn source material") &&
      !normalizedAnswer.includes("do not contain enough information"),
    "Grounded Chat fell back instead of answering from the Auburn source.",
  );
  assertNoStore(response, "Grounded Chat API");
  console.info("PASS source-grounded Chat canary");
}

function assertSecurityHeaders(response: Response, label: string) {
  const contentSecurityPolicy =
    response.headers.get("content-security-policy") ?? "";
  assert(
    contentSecurityPolicy.includes("frame-ancestors 'none'"),
    `${label} is missing the expected Content Security Policy.`,
  );
  assert(
    response.headers.get("x-content-type-options") === "nosniff",
    `${label} is missing X-Content-Type-Options.`,
  );
  assert(
    response.headers.get("x-frame-options") === "DENY",
    `${label} is missing frame protection.`,
  );
  assert(
    response.headers.get("cross-origin-opener-policy") === "same-origin",
    `${label} is missing Cross-Origin-Opener-Policy.`,
  );
  if (baseUrl.protocol === "https:") {
    assert(
      Boolean(response.headers.get("strict-transport-security")),
      `${label} is missing Strict-Transport-Security.`,
    );
  }
}

function assertNoStore(response: Response, label: string) {
  assert(
    response.headers.get("cache-control")?.includes("no-store") === true,
    `${label} response is not marked no-store.`,
  );
}

async function fetchWithTimeout(
  input: URL,
  init?: RequestInit,
  timeoutMs = 15_000,
) {
  return fetch(input, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function readJson(response: Response) {
  return response.json().catch(() => ({ error: "Response was not JSON." })) as Promise<
    Record<string, unknown>
  >;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export {};
