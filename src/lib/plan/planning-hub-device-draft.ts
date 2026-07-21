import { parseCourseCodes } from "../courses/course-code-parser.ts";
import { extractDegreeWorksSemesters } from "./degreeworks-semesters.ts";
import type { GeneratedPathPreferences } from "./generated-planned-path.ts";
import { normalizeGeneratedPathStartTerm } from "./generated-path-terms.ts";

export const PLANNING_HUB_DRAFT_STORAGE_KEY =
  "auburn-academic-planner:planning-hub-device-draft:v1";
export const PLANNING_HUB_DRAFT_VERSION = 1 as const;
export const PLANNING_HUB_DRAFT_TTL_DAYS = 30;

const draftSchema = "auburn-planning-hub-device-draft" as const;
const draftTtlMs = PLANNING_HUB_DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000;
const maximumFutureClockSkewMs = 5 * 60 * 1000;
const termLabelPattern = /^(Fall|Spring|Summer) 20\d{2}$/;
const exactCourseCodePattern = /^[A-Z]{2,5} [0-9][0-9A-Z]{3}$/;
const maxTerms = 12;
const maxCourseCodesPerTerm = 24;
const maxUnassignedCourseCodes = 48;

export type PlanningHubDraftStep = "current_progress" | "planned_path";
export type PlanningHubDraftInputMode = "pdf" | "manual";

export type PlanningHubDraftTruncation = {
  omittedTermCount: number;
  omittedCourseCodeCount: number;
};

export type PlanningHubDeviceDraft = {
  schema: typeof draftSchema;
  version: typeof PLANNING_HUB_DRAFT_VERSION;
  savedAt: string;
  expiresAt: string;
  resumeAt: PlanningHubDraftStep;
  plannedPathInputMode: PlanningHubDraftInputMode;
  generatedPathPreferences: Required<
    Pick<
      GeneratedPathPreferences,
      | "startTerm"
      | "maxCreditsPerTerm"
      | "includeSummer"
      | "maxSummerCredits"
    >
  >;
  manualPlan?: {
    terms: Array<{
      label: string;
      plannedCredits: number;
      courseCodes: string[];
    }>;
    unassignedCourseCodes: string[];
  };
  truncation?: PlanningHubDraftTruncation;
};

export type PlanningHubDraftReadResult =
  | { status: "empty" | "expired" | "invalid" }
  | { status: "valid"; draft: PlanningHubDeviceDraft };

export function createPlanningHubDeviceDraft({
  activeStep,
  generatedPathPreferences,
  manualPlannedCoursesText,
  now = new Date(),
  plannedPathInputMode,
}: {
  activeStep: "current_progress" | "planned_path" | "advisor_summary";
  generatedPathPreferences: GeneratedPathPreferences;
  manualPlannedCoursesText: string;
  now?: Date;
  plannedPathInputMode: PlanningHubDraftInputMode;
}): PlanningHubDeviceDraft {
  const minimizedManualPlan =
    plannedPathInputMode === "manual"
      ? minimizeManualPlan(manualPlannedCoursesText)
      : { manualPlan: undefined, truncation: undefined };

  return {
    schema: draftSchema,
    version: PLANNING_HUB_DRAFT_VERSION,
    savedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + draftTtlMs).toISOString(),
    resumeAt: activeStep === "planned_path" ? "planned_path" : "current_progress",
    plannedPathInputMode,
    generatedPathPreferences: normalizePreferences(generatedPathPreferences),
    ...(minimizedManualPlan.manualPlan
      ? { manualPlan: minimizedManualPlan.manualPlan }
      : {}),
    ...(minimizedManualPlan.truncation
      ? { truncation: minimizedManualPlan.truncation }
      : {}),
  };
}

export function readPlanningHubDeviceDraft(
  serialized: string | null,
  now = new Date(),
): PlanningHubDraftReadResult {
  if (!serialized) {
    return { status: "empty" };
  }

  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return { status: "invalid" };
  }

  const draft = parseDraft(value);
  if (!draft) {
    return { status: "invalid" };
  }

  const nowTimestamp = now.getTime();
  const savedAtTimestamp = Date.parse(draft.savedAt);
  const expiresAtTimestamp = Date.parse(draft.expiresAt);
  if (savedAtTimestamp > nowTimestamp + maximumFutureClockSkewMs) {
    return { status: "invalid" };
  }

  if (
    expiresAtTimestamp <= nowTimestamp ||
    nowTimestamp - savedAtTimestamp >= draftTtlMs
  ) {
    return { status: "expired" };
  }

  return { status: "valid", draft };
}

export function formatPlanningHubManualDraft(
  manualPlan?: PlanningHubDeviceDraft["manualPlan"],
) {
  if (!manualPlan) {
    return "";
  }

  const totalPlannedCredits = manualPlan.terms.reduce(
    (sum, term) => sum + term.plannedCredits,
    0,
  );
  const lines: string[] = [];

  if (manualPlan.terms.length > 0) {
    lines.push(`Total Planned Credits: ${formatNumber(totalPlannedCredits)}`);
  }

  for (const term of manualPlan.terms) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(
      `${term.label} Credits: ${formatNumber(term.plannedCredits)}`,
      term.courseCodes.join(", "),
    );
  }

  if (manualPlan.unassignedCourseCodes.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(
      "Courses without a saved term:",
      manualPlan.unassignedCourseCodes.join(", "),
    );
  }

  return lines.join("\n");
}

export function countPlanningHubDraftCourseCodes(
  draft: PlanningHubDeviceDraft,
) {
  if (!draft.manualPlan) {
    return 0;
  }

  return (
    draft.manualPlan.terms.reduce(
      (sum, term) => sum + term.courseCodes.length,
      0,
    ) + draft.manualPlan.unassignedCourseCodes.length
  );
}

export function formatPlanningHubDraftTruncation(
  truncation?: PlanningHubDraftTruncation,
) {
  if (!truncation) {
    return null;
  }

  const parts = [
    truncation.omittedTermCount > 0
      ? `${truncation.omittedTermCount} term${truncation.omittedTermCount === 1 ? "" : "s"}`
      : null,
    truncation.omittedCourseCodeCount > 0
      ? `${truncation.omittedCourseCodeCount} recognized course code${truncation.omittedCourseCodeCount === 1 ? "" : "s"}`
      : null,
  ].filter((part): part is string => Boolean(part));
  const omittedItemCount =
    truncation.omittedTermCount + truncation.omittedCourseCodeCount;

  return `${parts.join(" and ")} ${omittedItemCount === 1 ? "was" : "were"} not saved`;
}

function minimizeManualPlan(text: string) {
  const semesterPlan = extractDegreeWorksSemesters(text);
  let omittedCourseCodeCount = semesterPlan.terms
    .slice(maxTerms)
    .reduce(
      (sum, term) => sum + normalizeCourseCodes(term.courseCodes).length,
      0,
    );
  const terms = semesterPlan.terms.slice(0, maxTerms).flatMap((term) => {
    const label = normalizeTermLabel(term.label);
    const plannedCredits = normalizeCreditValue(term.plannedCredits);
    if (!label || plannedCredits === null) {
      return [];
    }

    const normalizedCourseCodes = normalizeCourseCodes(term.courseCodes);
    omittedCourseCodeCount += Math.max(
      0,
      normalizedCourseCodes.length - maxCourseCodesPerTerm,
    );

    return [{
      label,
      plannedCredits,
      courseCodes: normalizedCourseCodes.slice(0, maxCourseCodesPerTerm),
    }];
  });
  const normalizedUnassignedCourseCodes = normalizeCourseCodes(
    semesterPlan.unassignedCourseCodes,
  );
  omittedCourseCodeCount += Math.max(
    0,
    normalizedUnassignedCourseCodes.length - maxUnassignedCourseCodes,
  );
  const unassignedCourseCodes = normalizedUnassignedCourseCodes.slice(
    0,
    maxUnassignedCourseCodes,
  );
  const omittedTermCount = Math.max(0, semesterPlan.terms.length - maxTerms);
  const truncation =
    omittedTermCount > 0 || omittedCourseCodeCount > 0
      ? { omittedTermCount, omittedCourseCodeCount }
      : undefined;

  if (
    terms.every((term) => term.courseCodes.length === 0) &&
    unassignedCourseCodes.length === 0
  ) {
    return { manualPlan: undefined, truncation };
  }

  return {
    manualPlan: { terms, unassignedCourseCodes },
    truncation,
  };
}

function parseDraft(value: unknown): PlanningHubDeviceDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.schema !== draftSchema ||
    value.version !== PLANNING_HUB_DRAFT_VERSION ||
    (value.resumeAt !== "current_progress" && value.resumeAt !== "planned_path") ||
    (value.plannedPathInputMode !== "pdf" &&
      value.plannedPathInputMode !== "manual")
  ) {
    return null;
  }

  const savedAt = parseDate(value.savedAt);
  const expiresAt = parseDate(value.expiresAt);
  if (
    savedAt === null ||
    expiresAt === null ||
    expiresAt <= savedAt ||
    expiresAt - savedAt > draftTtlMs
  ) {
    return null;
  }

  const generatedPathPreferences = parsePreferences(
    value.generatedPathPreferences,
  );
  if (!generatedPathPreferences) {
    return null;
  }

  const manualPlan =
    value.manualPlan === undefined ? undefined : parseManualPlan(value.manualPlan);
  if (value.manualPlan !== undefined && !manualPlan) {
    return null;
  }
  const truncation =
    value.truncation === undefined
      ? undefined
      : parseDraftTruncation(value.truncation);
  if (value.truncation !== undefined && !truncation) {
    return null;
  }

  return {
    schema: draftSchema,
    version: PLANNING_HUB_DRAFT_VERSION,
    savedAt: new Date(savedAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    resumeAt: value.resumeAt,
    plannedPathInputMode: value.plannedPathInputMode,
    generatedPathPreferences,
    ...(manualPlan ? { manualPlan } : {}),
    ...(truncation ? { truncation } : {}),
  };
}

function parseDraftTruncation(value: unknown): PlanningHubDraftTruncation | null {
  if (!isRecord(value)) {
    return null;
  }

  const omittedTermCount = value.omittedTermCount;
  const omittedCourseCodeCount = value.omittedCourseCodeCount;
  if (
    typeof omittedTermCount !== "number" ||
    !Number.isInteger(omittedTermCount) ||
    omittedTermCount < 0 ||
    typeof omittedCourseCodeCount !== "number" ||
    !Number.isInteger(omittedCourseCodeCount) ||
    omittedCourseCodeCount < 0 ||
    omittedTermCount + omittedCourseCodeCount === 0
  ) {
    return null;
  }

  return { omittedTermCount, omittedCourseCodeCount };
}

function parseManualPlan(
  value: unknown,
): PlanningHubDeviceDraft["manualPlan"] | null {
  if (!isRecord(value) || !Array.isArray(value.terms)) {
    return null;
  }
  if (
    value.terms.length > maxTerms ||
    !Array.isArray(value.unassignedCourseCodes) ||
    value.unassignedCourseCodes.length > maxUnassignedCourseCodes
  ) {
    return null;
  }

  const terms: NonNullable<PlanningHubDeviceDraft["manualPlan"]>["terms"] = [];
  for (const candidate of value.terms) {
    if (!isRecord(candidate) || !Array.isArray(candidate.courseCodes)) {
      return null;
    }
    if (candidate.courseCodes.length > maxCourseCodesPerTerm) {
      return null;
    }

    const label = normalizeTermLabel(candidate.label);
    const plannedCredits = normalizeCreditValue(candidate.plannedCredits);
    const courseCodes = parseStoredCourseCodes(candidate.courseCodes);
    if (!label || plannedCredits === null || !courseCodes) {
      return null;
    }
    terms.push({ label, plannedCredits, courseCodes });
  }

  const unassignedCourseCodes = parseStoredCourseCodes(
    value.unassignedCourseCodes,
  );
  if (!unassignedCourseCodes) {
    return null;
  }

  return { terms, unassignedCourseCodes };
}

function parseStoredCourseCodes(value: unknown[]) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    if (typeof candidate !== "string") {
      return null;
    }

    const normalized = candidate.trim().toUpperCase().replace(/\s+/g, " ");
    if (
      !exactCourseCodePattern.test(normalized) ||
      parseCourseCodes(normalized)[0] !== normalized
    ) {
      return null;
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

function normalizeCourseCodes(courseCodes: string[]) {
  return parseStoredCourseCodes(courseCodes) ?? [];
}

function normalizePreferences(
  preferences: GeneratedPathPreferences,
): PlanningHubDeviceDraft["generatedPathPreferences"] {
  const includeSummer = Boolean(preferences.includeSummer);
  return {
    startTerm: normalizeGeneratedPathStartTerm(
      normalizeTermLabel(preferences.startTerm) ?? "Fall 2026",
      includeSummer,
    ),
    maxCreditsPerTerm: clampInteger(preferences.maxCreditsPerTerm, 3, 21, 15),
    includeSummer,
    maxSummerCredits: clampInteger(preferences.maxSummerCredits, 1, 12, 6),
  };
}

function parsePreferences(
  value: unknown,
): PlanningHubDeviceDraft["generatedPathPreferences"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const startTerm = normalizeTermLabel(value.startTerm);
  if (
    !startTerm ||
    typeof value.maxCreditsPerTerm !== "number" ||
    !Number.isInteger(value.maxCreditsPerTerm) ||
    value.maxCreditsPerTerm < 3 ||
    value.maxCreditsPerTerm > 21 ||
    typeof value.includeSummer !== "boolean" ||
    typeof value.maxSummerCredits !== "number" ||
    !Number.isInteger(value.maxSummerCredits) ||
    value.maxSummerCredits < 1 ||
    value.maxSummerCredits > 12
  ) {
    return null;
  }

  return {
    startTerm: normalizeGeneratedPathStartTerm(startTerm, value.includeSummer),
    maxCreditsPerTerm: value.maxCreditsPerTerm,
    includeSummer: value.includeSummer,
    maxSummerCredits: value.maxSummerCredits,
  };
}

function normalizeTermLabel(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^(Fall|Spring|Summer)\s+(20\d{2})$/i.exec(value.trim());
  if (!match) {
    return null;
  }

  const term = `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()}`;
  const label = `${term} ${match[2]}`;
  return termLabelPattern.test(label) ? label : null;
}

function normalizeCreditValue(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 30
  ) {
    return null;
  }

  return Number(value.toFixed(1));
}

function clampInteger(
  value: number | undefined,
  minimum: number,
  maximum: number,
  fallback: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function parseDate(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
