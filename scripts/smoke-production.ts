import { randomUUID } from "node:crypto";
import { inflateSync } from "node:zlib";

import { load } from "cheerio";

import { RELEASE_HEALTH_TOKEN_MIN_LENGTH } from "../src/lib/api/release-health-auth.ts";
import { GEMINI_CHAT_CONSENT_VERSION } from "../src/lib/chat-privacy.ts";
import {
  getDefaultGeneratedPathStartTerm,
  nextGeneratedPathTerm,
  parseGeneratedPathTerm,
} from "../src/lib/plan/generated-path-terms.ts";
import { SUPPORTED_NODE_MAJOR } from "../src/lib/runtime-support.ts";
import {
  makeProductionSmokeWorksheetPdf,
  PRODUCTION_SMOKE_EXPECTED_COURSE_CODES,
} from "./lib/production-smoke-fixture.ts";

const configuredUrl = process.env.DEPLOYED_APP_URL?.trim();
const configuredCommit = process.env.EXPECTED_COMMIT_SHA?.trim();
const releaseHealthToken = process.env.RELEASE_HEALTH_TOKEN?.trim();

if (!configuredUrl) {
  throw new Error(
    "Set DEPLOYED_APP_URL to the production origin before running this smoke test.",
  );
}

if (!configuredCommit || !/^[0-9a-f]{40}$/i.test(configuredCommit)) {
  throw new Error(
    "Set EXPECTED_COMMIT_SHA to the full 40-character Git commit being released.",
  );
}

if (
  !releaseHealthToken ||
  releaseHealthToken.length < RELEASE_HEALTH_TOKEN_MIN_LENGTH
) {
  throw new Error(
    `Set RELEASE_HEALTH_TOKEN to the ${RELEASE_HEALTH_TOKEN_MIN_LENGTH}+-character production release-probe secret.`,
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
if (
  baseUrl.username ||
  baseUrl.password ||
  baseUrl.pathname !== "/" ||
  baseUrl.search ||
  baseUrl.hash
) {
  throw new Error(
    "DEPLOYED_APP_URL must be a credential-free origin without a path, query, or fragment.",
  );
}

const productionOrigin = baseUrl.origin;
const expectedCommit = configuredCommit.toLowerCase();
const smokeStartTerm = getDefaultGeneratedPathStartTerm(new Date(), true);
const expectedSmokeCourseCodes = PRODUCTION_SMOKE_EXPECTED_COURSE_CODES;
const expectedManualCourseCodes = ["COMP 1210", "MATH 1610"];
const DIAGNOSTIC_VALUE_LIMIT = 240;
const DIAGNOSTIC_PAYLOAD_LIMIT = 2_048;
const MAX_PAGE_BODY_BYTES = 2 * 1_024 * 1_024;
const MAX_METADATA_BODY_BYTES = 256 * 1_024;
const MAX_HEALTH_BODY_BYTES = 128 * 1_024;
const MAX_API_BODY_BYTES = 2 * 1_024 * 1_024;
const MAX_PNG_BODY_BYTES = 5 * 1_024 * 1_024;

await checkRootRedirect();
await checkPage("Planning Hub", "/plan-check", "Planning Hub");
await checkPage("Chat", "/chat", "Source-Grounded Chat");
await checkPublicMetadata();
await checkHealth();
await checkCurrentProgressPdfFlow();
await checkPlanningApi();
await checkChatValidation();
await checkGroundedChat();

console.info(`Production smoke passed for ${productionOrigin}.`);

async function checkRootRedirect() {
  const response = await fetchWithTimeout(new URL("/", productionOrigin), {
    redirect: "manual",
  });
  const location = response.headers.get("location");

  assert(response.status === 308, `Root returned HTTP ${response.status}, not 308.`);
  assert(
    Boolean(location) &&
      new URL(location as string, productionOrigin).href ===
        new URL("/plan-check", productionOrigin).href,
    "Root did not redirect permanently to Planning Hub.",
  );
  console.info("PASS permanent Planning Hub redirect");
}

async function checkPage(label: string, pathname: string, expectedTitle: string) {
  const response = await fetchWithTimeout(new URL(pathname, productionOrigin));
  const html = await readBoundedText(
    response,
    `${label} HTML`,
    MAX_PAGE_BODY_BYTES,
  );
  const page = load(html);
  const expectedUrl = new URL(pathname, productionOrigin).href;

  assert(response.ok, `${label} returned HTTP ${response.status}.`);
  assert(
    page("title").text() === `${expectedTitle} | Auburn Academic Planner`,
    `${label} did not render its route-specific title.`,
  );
  assert(
    page('link[rel="canonical"]').attr("href") === expectedUrl,
    `${label} canonical URL does not match ${expectedUrl}.`,
  );
  assert(
    page('meta[property="og:url"]').attr("content") === expectedUrl,
    `${label} Open Graph URL does not match ${expectedUrl}.`,
  );
  assert(
    page('meta[property="og:image"]').attr("content") ===
      `${productionOrigin}/opengraph-image`,
    `${label} social image does not use the production origin.`,
  );
  assertSecurityHeaders(response, label);
  console.info(`PASS ${label}`);
}

async function checkPublicMetadata() {
  const robotsResponse = await fetchWithTimeout(
    new URL("/robots.txt", productionOrigin),
  );
  const robots = await readBoundedText(
    robotsResponse,
    "robots.txt",
    MAX_METADATA_BODY_BYTES,
  );
  assert(robotsResponse.ok, `robots.txt returned HTTP ${robotsResponse.status}.`);
  assert(robots.includes("Disallow: /api/"), "robots.txt does not exclude API routes.");
  assert(
    robots.includes(`Sitemap: ${productionOrigin}/sitemap.xml`),
    "robots.txt sitemap does not use the production origin.",
  );

  const sitemapResponse = await fetchWithTimeout(
    new URL("/sitemap.xml", productionOrigin),
  );
  const sitemap = await readBoundedText(
    sitemapResponse,
    "sitemap.xml",
    MAX_METADATA_BODY_BYTES,
  );
  assert(sitemapResponse.ok, `sitemap.xml returned HTTP ${sitemapResponse.status}.`);
  for (const pathname of ["/plan-check", "/feedback"]) {
    assert(
      sitemap.includes(`<loc>${productionOrigin}${pathname}</loc>`),
      `sitemap.xml is missing ${productionOrigin}${pathname}.`,
    );
  }

  const manifestResponse = await fetchWithTimeout(
    new URL("/manifest.webmanifest", productionOrigin),
  );
  const manifest = await readJson(
    manifestResponse,
    "Web manifest",
    MAX_METADATA_BODY_BYTES,
  );
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  assert(
    manifestResponse.ok && manifest.start_url === "/plan-check",
    `Web manifest is invalid (HTTP ${manifestResponse.status}).`,
  );
  for (const expectedIcon of [
    { src: "/icon-192", sizes: "192x192" },
    { src: "/icon", sizes: "512x512" },
  ]) {
    assert(
      icons.some(
        (icon) =>
          isRecord(icon) &&
          icon.src === expectedIcon.src &&
          icon.sizes === expectedIcon.sizes,
      ),
      `Web manifest is missing ${expectedIcon.sizes} icon ${expectedIcon.src}.`,
    );
  }

  await Promise.all([
    checkPngAsset("social image", "/opengraph-image", 1200, 630),
    checkPngAsset("Apple icon", "/apple-icon", 180, 180),
    checkPngAsset("192px icon", "/icon-192", 192, 192),
    checkPngAsset("512px icon", "/icon", 512, 512),
  ]);
  console.info("PASS canonical metadata and install assets");
}

async function checkPngAsset(
  label: string,
  pathname: string,
  expectedWidth: number,
  expectedHeight: number,
) {
  const response = await fetchWithTimeout(new URL(pathname, productionOrigin));
  const bytes = await readBoundedBytes(
    response,
    label,
    MAX_PNG_BODY_BYTES,
  );
  assert(response.ok, `${label} returned HTTP ${response.status}.`);
  assert(
    response.headers.get("content-type")?.startsWith("image/png") === true,
    `${label} did not return a PNG content type.`,
  );
  assertValidPng(bytes, expectedWidth, expectedHeight, label);
}

async function checkHealth() {
  const response = await fetchWithTimeout(
    new URL(
      `/api/health?check=deep&nonce=${encodeURIComponent(randomUUID())}`,
      productionOrigin,
    ),
    {
      headers: {
        Authorization: `Bearer ${releaseHealthToken}`,
      },
    },
  );
  const payload = await readJson(
    response,
    "Deep health",
    MAX_HEALTH_BODY_BYTES,
  );
  const requestProtection = isRecord(payload.services)
    ? payload.services.requestProtection
    : null;
  const runtime = isRecord(payload.services) ? payload.services.runtime : null;

  assert(
    response.status !== 401,
    "Deep health rejected RELEASE_HEALTH_TOKEN; verify the Production secret and release-runner value match.",
  );
  assert(
    payload.commit === expectedCommit,
    `Deployment commit mismatch: expected ${expectedCommit}; deep health returned a missing or unexpected commit.`,
  );
  assert(
    isRecord(runtime) &&
      runtime.nodeMajor === SUPPORTED_NODE_MAJOR &&
      runtime.support === "supported",
    `Deployment runtime must use supported Node ${SUPPORTED_NODE_MAJOR}.x.`,
  );
  assert(
    response.status === 200 &&
      payload.check === "deep_readiness" &&
      payload.status === "ready" &&
      isRecord(requestProtection) &&
      requestProtection.connectivity === "ready",
    `Health gate is not ready (HTTP ${response.status}); verify Production configuration and distributed request-protection connectivity.`,
  );
  assertNoStore(response, "Deep health");
  console.info("PASS deep deployment health");
}

async function checkCurrentProgressPdfFlow() {
  const formData = new FormData();
  formData.set(
    "file",
    new Blob([makeProductionSmokeWorksheetPdf()], { type: "application/pdf" }),
    "synthetic-current-progress-smoke.pdf",
  );
  formData.set(
    "generatedPathPreferences",
    JSON.stringify({
      startTerm: smokeStartTerm,
      maxCreditsPerTerm: 9,
      includeSummer: true,
      maxSummerCredits: 6,
    }),
  );

  const uploadResponse = await fetchWithTimeout(
    new URL(
      "/api/plan/analyze-degreeworks-current/upload",
      productionOrigin,
    ),
    {
      method: "POST",
      headers: {
        Origin: productionOrigin,
        "Sec-Fetch-Site": "same-origin",
      },
      body: formData,
    },
    30_000,
  );
  const uploadPayload = await readJson(
    uploadResponse,
    "Current Progress PDF API",
    MAX_API_BODY_BYTES,
  );
  const generatedPath = uploadPayload.generatedPlannedPath;
  const currentProgress = uploadPayload.currentProgressAnalysis;

  assert(
    uploadResponse.status === 200 &&
      uploadPayload.documentType === "worksheet_audit" &&
      hasExpectedCurrentProgress(currentProgress) &&
      hasExpectedGeneratedPath(generatedPath) &&
      hasAdvisorSummary(uploadPayload.advisorMeetingSummary),
    `Current Progress PDF smoke failed (HTTP ${uploadResponse.status}): ${summarizePayload(uploadPayload)}`,
  );
  assertNoStore(uploadResponse, "Current Progress PDF API");

  const regenerateResponse = await fetchWithTimeout(
    new URL("/api/plan/generate-path", productionOrigin),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: productionOrigin,
        "Sec-Fetch-Site": "same-origin",
      },
      body: JSON.stringify({
        currentProgressAnalysis: currentProgress,
        preferences: {
          startTerm: smokeStartTerm,
          maxCreditsPerTerm: 9,
          includeSummer: true,
          maxSummerCredits: 6,
        },
      }),
    },
  );
  const regeneratePayload = await readJson(
    regenerateResponse,
    "Generated-path API",
    MAX_API_BODY_BYTES,
  );

  assert(
    regenerateResponse.status === 200 &&
      hasExpectedGeneratedPath(regeneratePayload.generatedPlannedPath) &&
      hasAdvisorSummary(regeneratePayload.advisorMeetingSummary),
    `Generated-path regeneration failed (HTTP ${regenerateResponse.status}): ${summarizePayload(regeneratePayload)}`,
  );
  assertNoStore(regenerateResponse, "Generated-path API");
  console.info("PASS flagship Current Progress PDF and path regeneration");
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
  const payload = await readJson(response, "Planning API", MAX_API_BODY_BYTES);

  assert(
    response.status === 200 &&
      payload.documentType === "planned_path" &&
      payload.parsedCourseCount === expectedManualCourseCodes.length &&
      hasExactCourseCodes(payload.parsedCourseCodes, expectedManualCourseCodes) &&
      hasExpectedManualSemester(payload.semesterPlanAnalysis),
    `Planning API failed (HTTP ${response.status}): ${summarizePayload(payload)}`,
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
  const payload = await readJson(response, "Chat validation API", MAX_API_BODY_BYTES);

  assert(
    response.status === 400 && typeof payload.error === "string",
    `Chat validation path failed (HTTP ${response.status}): ${summarizePayload(payload)}`,
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
  const payload = await readJson(response, "Grounded Chat API", MAX_API_BODY_BYTES);
  const answer = typeof payload.answer === "string" ? payload.answer : "";
  const advisorNote =
    typeof payload.advisorVerificationNote === "string"
      ? payload.advisorVerificationNote
      : "";
  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  const normalizedAnswer = answer.toLowerCase();

  assert(
    response.status === 200,
    `Grounded Chat failed (HTTP ${response.status}): ${summarizePayload(payload)}`,
  );
  assert(
    /\bau[\W_]*access\b/i.test(answer) &&
      /\bdegree[\W_]*works\b/i.test(answer) &&
      /\bacademic[\W_]*portals\b/i.test(answer),
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
      (source) => isTrustedAuburnDegreeWorksSource(source),
    ),
    "Grounded Chat did not display a credential-free HTTPS DegreeWorks source on auburn.edu.",
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

function hasExpectedCurrentProgress(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.stillNeededCourseCodes)) {
    return false;
  }

  return hasExactCourseCodes(
    value.stillNeededCourseCodes,
    expectedSmokeCourseCodes,
  );
}

function hasExpectedGeneratedPath(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  const preferences = value.preferences;
  const creditTotals = value.creditTotals;
  const terms = value.terms;
  const placedItems = value.placedItems;
  if (
    !Array.isArray(terms) ||
    terms.length === 0 ||
    !Array.isArray(placedItems) ||
    !placedItems.every(isRenderableGeneratedPathItem) ||
    !terms.every(isRenderableGeneratedPathTerm)
  ) {
    return false;
  }

  const termItems = terms.flatMap((term) =>
    isRecord(term) && Array.isArray(term.items) ? term.items : [],
  );

  return (
    value.targetPath === "degreeworks_native" &&
    isRecord(preferences) &&
    preferences.startTerm === smokeStartTerm &&
    preferences.maxCreditsPerTerm === 9 &&
    preferences.includeSummer === true &&
    preferences.maxSummerCredits === 6 &&
    typeof preferences.maxTerms === "number" &&
    terms.length <= preferences.maxTerms &&
    hasContiguousGeneratedPathTerms(terms) &&
    isRecord(creditTotals) &&
    hasCoherentGeneratedPathCredits(terms, creditTotals) &&
    hasExactCourseCodes(
      courseCodesFromGeneratedItems(placedItems),
      expectedSmokeCourseCodes,
    ) &&
    hasExactCourseCodes(
      courseCodesFromGeneratedItems(termItems),
      expectedSmokeCourseCodes,
    ) &&
    isFiniteNumber(creditTotals.lockedCurrentCredits) &&
    isFiniteNumber(creditTotals.draftCredits) &&
    isFiniteNumber(creditTotals.totalDisplayedCredits) &&
    Array.isArray(value.advisorReviewItems) &&
    Array.isArray(value.unplacedItems) &&
    isRecord(value.orderingSource) &&
    isRecord(value.feasibility) &&
    (value.confidence === "high" ||
      value.confidence === "medium" ||
      value.confidence === "low") &&
    Array.isArray(value.notes) &&
    value.notes.every((note) => typeof note === "string")
  );
}

function hasExpectedManualSemester(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.terms) || value.terms.length !== 1) {
    return false;
  }

  const [term] = value.terms;
  return (
    isRecord(term) &&
    term.label === "Fall 2030" &&
    term.index === 0 &&
    term.plannedCredits === 6 &&
    hasExactCourseCodes(term.courseCodes, expectedManualCourseCodes) &&
    Array.isArray(value.unassignedCourseCodes) &&
    value.unassignedCourseCodes.length === 0 &&
    Array.isArray(value.warnings)
  );
}

function isRenderableGeneratedPathTerm(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    isFiniteNumber(value.index) &&
    isFiniteNumber(value.plannedCredits) &&
    isFiniteNumber(value.lockedCredits) &&
    isFiniteNumber(value.draftCredits) &&
    Array.isArray(value.items) &&
    value.items.every(isRenderableGeneratedPathItem) &&
    Array.isArray(value.warnings) &&
    value.warnings.every((warning) => typeof warning === "string")
  );
}

function hasContiguousGeneratedPathTerms(terms: unknown[]) {
  let expected = parseGeneratedPathTerm(smokeStartTerm, true);
  for (let index = 0; index < terms.length; index += 1) {
    const term = terms[index];
    if (
      !isRecord(term) ||
      term.index !== index ||
      term.label !== `${expected.term} ${expected.year}`
    ) {
      return false;
    }
    expected = nextGeneratedPathTerm({ includeSummer: true, ...expected });
  }
  return true;
}

function hasCoherentGeneratedPathCredits(
  terms: unknown[],
  creditTotals: Record<string, unknown>,
) {
  let lockedCurrentCredits = 0;
  let draftCredits = 0;

  for (const term of terms) {
    if (!isRecord(term) || !Array.isArray(term.items)) {
      return false;
    }
    const lockedCredits = term.items.reduce(
      (total, item) =>
        total +
        (isRecord(item) && item.locked === true && isFiniteNumber(item.credits)
          ? item.credits
          : 0),
      0,
    );
    const termDraftCredits = term.items.reduce(
      (total, item) =>
        total +
        (isRecord(item) && item.locked !== true && isFiniteNumber(item.credits)
          ? item.credits
          : 0),
      0,
    );
    const plannedCredits = lockedCredits + termDraftCredits;
    const termCap =
      typeof term.label === "string" && term.label.startsWith("Summer ")
        ? 6
        : 9;
    if (
      term.lockedCredits !== lockedCredits ||
      term.draftCredits !== termDraftCredits ||
      term.plannedCredits !== plannedCredits ||
      plannedCredits > termCap
    ) {
      return false;
    }
    lockedCurrentCredits += lockedCredits;
    draftCredits += termDraftCredits;
  }

  return (
    creditTotals.lockedCurrentCredits === lockedCurrentCredits &&
    creditTotals.draftCredits === draftCredits &&
    creditTotals.totalDisplayedCredits ===
      lockedCurrentCredits + draftCredits
  );
}

function isRenderableGeneratedPathItem(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    ["course", "option", "milestone", "placeholder", "registered", "current"].includes(
      String(value.kind),
    ) &&
    isFiniteNumber(value.credits) &&
    typeof value.reason === "string" &&
    Array.isArray(value.courseCodes) &&
    value.courseCodes.every((courseCode) => typeof courseCode === "string")
  );
}

function courseCodesFromGeneratedItems(items: unknown[]) {
  return items.flatMap((item) =>
    isRecord(item) && Array.isArray(item.courseCodes)
      ? item.courseCodes.filter(
          (courseCode): courseCode is string => typeof courseCode === "string",
        )
      : [],
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasExactCourseCodes(value: unknown, expected: readonly string[]) {
  if (!Array.isArray(value) || value.length !== expected.length) {
    return false;
  }

  const courseCodes = value.filter(
    (courseCode): courseCode is string => typeof courseCode === "string",
  );
  return (
    courseCodes.length === expected.length &&
    expected.every((courseCode) => courseCodes.includes(courseCode))
  );
}

function isTrustedAuburnDegreeWorksSource(value: unknown) {
  if (
    !isRecord(value) ||
    value.title !== "DegreeWorks" ||
    typeof value.url !== "string"
  ) {
    return false;
  }

  try {
    const sourceUrl = new URL(value.url);
    const hostname = sourceUrl.hostname.toLowerCase();
    return (
      sourceUrl.protocol === "https:" &&
      !sourceUrl.username &&
      !sourceUrl.password &&
      !sourceUrl.port &&
      (hostname === "auburn.edu" || hostname.endsWith(".auburn.edu"))
    );
  } catch {
    return false;
  }
}

function hasAdvisorSummary(value: unknown) {
  return (
    typeof value === "string" &&
    /advisor/i.test(value) &&
    /generated draft path/i.test(value)
  );
}

function summarizePayload(payload: Record<string, unknown>) {
  const summary: Record<string, unknown> = {};
  for (const key of [
    "check",
    "status",
    "commit",
    "documentType",
    "confidence",
    "error",
  ]) {
    const value = boundedDiagnosticScalar(payload[key]);
    if (value !== undefined) {
      summary[key] = value;
    }
  }

  if (isRecord(payload.services)) {
    const requestProtection = payload.services.requestProtection;
    const runtime = payload.services.runtime;
    summary.services = {
      chatConfiguration: boundedDiagnosticScalar(
        payload.services.chatConfiguration,
      ),
      releaseProbe: boundedDiagnosticScalar(payload.services.releaseProbe),
      requestProtection: isRecord(requestProtection)
        ? {
            configuration: boundedDiagnosticScalar(
              requestProtection.configuration,
            ),
            connectivity: boundedDiagnosticScalar(
              requestProtection.connectivity,
            ),
          }
        : undefined,
      runtime: isRecord(runtime)
        ? {
            nodeMajor: boundedDiagnosticScalar(runtime.nodeMajor),
            support: boundedDiagnosticScalar(runtime.support),
          }
        : undefined,
    };
  }

  const serialized = JSON.stringify(summary);
  return serialized.length <= DIAGNOSTIC_PAYLOAD_LIMIT
    ? serialized
    : `${serialized.slice(0, DIAGNOSTIC_PAYLOAD_LIMIT - 3)}...`;
}

function boundedDiagnosticScalar(value: unknown) {
  if (typeof value === "string") {
    return value.slice(0, DIAGNOSTIC_VALUE_LIMIT);
  }
  if (
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    value === null
  ) {
    return value;
  }
  return undefined;
}

function assertValidPng(
  bytes: Uint8Array,
  expectedWidth: number,
  expectedHeight: number,
  label: string,
) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  assert(bytes.length >= 57, `${label} is too small to be a valid PNG.`);
  assert(
    signature.every((value, index) => bytes[index] === value),
    `${label} has an invalid PNG signature.`,
  );

  let offset = signature.length;
  let sawHeader = false;
  let sawImageData = false;
  let sawEnd = false;
  let bitDepth = 0;
  let colorType = -1;
  let interlaceMethod = -1;
  const imageDataChunks: Uint8Array[] = [];
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const typeStart = offset + 4;
    const dataStart = typeStart + 4;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    assert(chunkEnd <= bytes.length, `${label} contains a truncated PNG chunk.`);

    const type = String.fromCharCode(...bytes.subarray(typeStart, dataStart));
    const expectedCrc = readUint32(bytes, dataEnd);
    const actualCrc = crc32(bytes.subarray(typeStart, dataEnd));
    assert(actualCrc === expectedCrc, `${label} contains a corrupt ${type} chunk.`);

    if (type === "IHDR") {
      assert(!sawHeader && offset === 8 && length === 13, `${label} has an invalid IHDR chunk.`);
      sawHeader = true;
      assert(
        readUint32(bytes, dataStart) === expectedWidth &&
          readUint32(bytes, dataStart + 4) === expectedHeight,
        `${label} dimensions do not match ${expectedWidth}x${expectedHeight}.`,
      );
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
      assert(
        bytes[dataStart + 10] === 0 && bytes[dataStart + 11] === 0,
        `${label} uses unsupported PNG compression or filtering.`,
      );
      interlaceMethod = bytes[dataStart + 12];
      assert(
        interlaceMethod === 0,
        `${label} uses unsupported interlaced PNG data.`,
      );
    } else if (type === "IDAT") {
      sawImageData ||= length > 0;
      imageDataChunks.push(bytes.slice(dataStart, dataEnd));
    } else if (type === "IEND") {
      assert(length === 0, `${label} has an invalid IEND chunk.`);
      sawEnd = true;
      assert(chunkEnd === bytes.length, `${label} has data after its IEND chunk.`);
      break;
    }

    offset = chunkEnd;
  }

  assert(sawHeader, `${label} is missing its PNG header.`);
  assert(sawImageData, `${label} is missing PNG image data.`);
  assert(sawEnd, `${label} is missing its PNG end marker.`);
  assertDecodablePngImageData({
    bitDepth,
    colorType,
    expectedHeight,
    expectedWidth,
    imageDataChunks,
    label,
  });
}

function assertDecodablePngImageData({
  bitDepth,
  colorType,
  expectedHeight,
  expectedWidth,
  imageDataChunks,
  label,
}: {
  bitDepth: number;
  colorType: number;
  expectedHeight: number;
  expectedWidth: number;
  imageDataChunks: Uint8Array[];
  label: string;
}) {
  assert(
    bitDepth === 8 && colorType === 6,
    `${label} must use the release encoder's non-interlaced 8-bit RGBA PNG format.`,
  );
  const channelsByColorType: Record<number, number> = {
    0: 1,
    2: 3,
    3: 1,
    4: 2,
    6: 4,
  };
  const allowedBitDepths: Record<number, number[]> = {
    0: [1, 2, 4, 8, 16],
    2: [8, 16],
    3: [1, 2, 4, 8],
    4: [8, 16],
    6: [8, 16],
  };
  const channels = channelsByColorType[colorType];
  assert(
    Boolean(channels) && allowedBitDepths[colorType]?.includes(bitDepth),
    `${label} uses an invalid PNG color type or bit depth.`,
  );

  const rowBytes = Math.ceil((expectedWidth * channels * bitDepth) / 8);
  const expectedInflatedLength = (rowBytes + 1) * expectedHeight;
  let inflated: Uint8Array;
  try {
    inflated = inflateSync(Buffer.concat(imageDataChunks), {
      maxOutputLength: expectedInflatedLength,
    });
  } catch {
    throw new Error(`${label} PNG image data could not be decoded.`);
  }
  assert(
    inflated.length === expectedInflatedLength,
    `${label} PNG image data has an invalid decoded length.`,
  );
  for (let row = 0; row < expectedHeight; row += 1) {
    assert(
      inflated[row * (rowBytes + 1)] <= 4,
      `${label} PNG image data contains an invalid row filter.`,
    );
  }
}

function readUint32(bytes: Uint8Array, offset: number) {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset + offset,
    4,
  ).getUint32(0);
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function fetchWithTimeout(
  input: URL,
  init?: RequestInit,
  timeoutMs = 15_000,
) {
  return fetch(input, {
    ...init,
    redirect: init?.redirect ?? "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function readJson(
  response: Response,
  label: string,
  maxBytes: number,
) {
  const text = await readBoundedText(response, label, maxBytes);
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value)
      ? value
      : { error: "Response was not a JSON object." };
  } catch {
    return { error: "Response was not JSON." };
  }
}

async function readBoundedText(
  response: Response,
  label: string,
  maxBytes: number,
) {
  return new TextDecoder().decode(
    await readBoundedBytes(response, label, maxBytes),
  );
}

async function readBoundedBytes(
  response: Response,
  label: string,
  maxBytes: number,
) {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    assert(
      /^\d+$/.test(declaredLength),
      `${label} returned an invalid Content-Length header.`,
    );
    const declaredBytes = Number(declaredLength);
    assert(
      Number.isSafeInteger(declaredBytes) && declaredBytes <= maxBytes,
      `${label} exceeded the ${maxBytes}-byte response limit.`,
    );
  }

  if (!response.body) {
    return new Uint8Array();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error(`${label} exceeded the ${maxBytes}-byte response limit.`);
      }
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
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
