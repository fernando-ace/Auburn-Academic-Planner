import type {
  CurrentDegreeAuditAnalysis,
  CurrentDegreeAuditCourseStatusRecord,
  CurrentDegreeAuditRequirementBlock,
} from "./current-degree-audit-analysis.ts";
import { redactDegreeWorksEvidence } from "./degreeworks-evidence-redaction.ts";
import type { ExternalCreditRecord } from "./degreeworks-external-credit.ts";
import type { DegreeWorksDetectedProgram } from "./degreeworks-program.ts";
import type { DegreeWorksStillNeededItem } from "./degreeworks-still-needed.ts";

export const INVALID_CURRENT_PROGRESS_ANALYSIS_MESSAGE =
  "Current Progress analysis is invalid. Run Current Progress again before continuing.";

export type CurrentProgressAnalysisInputResult =
  | { status: "absent" }
  | { status: "invalid"; error: string }
  | { status: "valid"; value: CurrentDegreeAuditAnalysis };

const confidenceValues = ["high", "medium", "low"] as const;
const blockStatusValues = [
  "complete",
  "incomplete",
  "nearly_complete",
  "unknown",
] as const;
const courseStatusValues = [
  "completed",
  "preregistered",
  "in_progress",
  "transfer_or_ap",
  "non_degree_applicable",
  "still_needed",
  "unknown",
] as const;
const requirementTypeValues = [
  "specific_course",
  "course_options",
  "credit_hours_from_list",
  "block_reference",
  "graduation_milestone",
  "advisor_review",
] as const;
const externalSourceTypeValues = [
  "advanced_placement",
  "transfer",
  "other",
] as const;

const unknownProgram: DegreeWorksDetectedProgram = {
  degree: null,
  program: null,
  major: null,
  catalogYear: null,
  displayName: "Unknown program",
  programKey: "unknown",
  confidence: "low",
  source: "unknown",
};

export function parseCurrentProgressAnalysisInput(
  value: unknown,
): CurrentProgressAnalysisInputResult {
  if (typeof value === "string") {
    if (value.trim().length === 0) {
      return { status: "absent" };
    }

    try {
      return parseCurrentProgressAnalysisInput(JSON.parse(value));
    } catch {
      return invalidInput();
    }
  }

  if (value === null || value === undefined) {
    return { status: "absent" };
  }

  if (!isRecord(value) || value.documentType !== "worksheet_audit") {
    return invalidInput();
  }

  const detectedProgram = parseDetectedProgram(value.detectedProgram);
  const requirementBlocks = parseOptionalArray(
    value.requirementBlocks,
    parseRequirementBlock,
  );
  const stillNeededItems = parseArray(value.stillNeededItems, parseStillNeededItem);
  const courseStatusRecords = parseOptionalArray(
    value.courseStatusRecords,
    parseCourseStatusRecord,
  );
  const externalCreditRecords = parseOptionalArray(
    value.externalCreditRecords,
    parseExternalCreditRecord,
  );
  const externalCreditCounts = parseExternalCreditCounts(value.externalCreditCounts);
  const completedCourseCodes = parseStringArray(value.completedCourseCodes);
  const preregisteredCourseCodes = parseStringArray(value.preregisteredCourseCodes);
  const inProgressCourseCodes = parseOptionalStringArray(value.inProgressCourseCodes);
  const transferOrApCourseCodes = parseOptionalStringArray(
    value.transferOrApCourseCodes,
  );
  const nonDegreeApplicableCourseCodes = parseOptionalStringArray(
    value.nonDegreeApplicableCourseCodes,
  );
  const stillNeededCourseCodes = parseOptionalStringArray(
    value.stillNeededCourseCodes,
  );
  const currentApplicableCourseCodes = parseOptionalStringArray(
    value.currentApplicableCourseCodes,
  );
  const parserWarnings = parseOptionalStringArray(value.parserWarnings);

  if (
    detectedProgram === null ||
    requirementBlocks === null ||
    stillNeededItems === null ||
    courseStatusRecords === null ||
    externalCreditRecords === null ||
    externalCreditCounts === null ||
    completedCourseCodes === null ||
    preregisteredCourseCodes === null ||
    inProgressCourseCodes === null ||
    transferOrApCourseCodes === null ||
    nonDegreeApplicableCourseCodes === null ||
    stillNeededCourseCodes === null ||
    currentApplicableCourseCodes === null ||
    parserWarnings === null ||
    !isEnumValue(value.confidence, confidenceValues) ||
    !isOptionalString(value.studentProgram) ||
    !isOptionalString(value.major) ||
    !isOptionalString(value.catalogYear) ||
    !isOptionalNullableString(value.auditDate) ||
    !isOptionalNullableNumber(value.creditsRequired) ||
    !isOptionalNullableNumber(value.creditsApplied) ||
    !isOptionalNullableNumber(value.creditsNeeded) ||
    !isOptionalEnumValue(value.degreeStatus, ["complete", "incomplete", "unknown"])
  ) {
    return invalidInput();
  }

  return {
    status: "valid",
    value: {
      documentType: "worksheet_audit",
      detectedProgram,
      ...(typeof value.studentProgram === "string"
        ? { studentProgram: value.studentProgram }
        : {}),
      ...(typeof value.major === "string" ? { major: value.major } : {}),
      ...(typeof value.catalogYear === "string"
        ? { catalogYear: value.catalogYear }
        : {}),
      auditDate: nullableString(value.auditDate),
      creditsRequired: nullableNumber(value.creditsRequired),
      creditsApplied: nullableNumber(value.creditsApplied),
      creditsNeeded: nullableNumber(value.creditsNeeded),
      degreeStatus: isEnumValue(value.degreeStatus, [
        "complete",
        "incomplete",
        "unknown",
      ])
        ? value.degreeStatus
        : "unknown",
      requirementBlocks,
      stillNeededItems,
      courseStatusRecords,
      externalCreditRecords,
      externalCreditCounts,
      completedCourseCodes,
      preregisteredCourseCodes,
      inProgressCourseCodes,
      transferOrApCourseCodes,
      nonDegreeApplicableCourseCodes,
      stillNeededCourseCodes,
      currentApplicableCourseCodes,
      parserWarnings,
      confidence: value.confidence,
    },
  };
}

function parseDetectedProgram(value: unknown): DegreeWorksDetectedProgram | null {
  if (value === undefined) {
    return { ...unknownProgram };
  }

  if (
    !isRecord(value) ||
    !isNullableString(value.degree) ||
    !isNullableString(value.program) ||
    !isNullableString(value.major) ||
    !isNullableString(value.catalogYear) ||
    typeof value.displayName !== "string" ||
    !isEnumValue(value.programKey, ["detected", "unknown"]) ||
    !isEnumValue(value.confidence, confidenceValues) ||
    !isEnumValue(value.source, [
      "worksheet_label",
      "keyword_match",
      "target_override",
      "unknown",
    ])
  ) {
    return null;
  }

  return {
    degree: value.degree,
    program: value.program,
    major: value.major,
    catalogYear: value.catalogYear,
    displayName: value.displayName,
    programKey: value.programKey,
    confidence: value.confidence,
    source: value.source,
  };
}

function parseRequirementBlock(
  value: unknown,
): CurrentDegreeAuditRequirementBlock | null {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    !isEnumValue(value.status, blockStatusValues) ||
    !isOptionalNullableNumber(value.creditsRequired) ||
    !isOptionalNullableNumber(value.creditsApplied) ||
    !isOptionalNullableNumber(value.creditsNeeded)
  ) {
    return null;
  }

  const stillNeededText = parseStringArray(value.stillNeededText);
  const notes = parseStringArray(value.notes);
  if (stillNeededText === null || notes === null) {
    return null;
  }

  return {
    name: value.name,
    status: value.status,
    creditsRequired: nullableNumber(value.creditsRequired),
    creditsApplied: nullableNumber(value.creditsApplied),
    creditsNeeded: nullableNumber(value.creditsNeeded),
    stillNeededText: stillNeededText.map(redactDegreeWorksEvidence),
    notes,
  };
}

function parseStillNeededItem(value: unknown): DegreeWorksStillNeededItem | null {
  if (
    !isRecord(value) ||
    typeof value.blockName !== "string" ||
    typeof value.requirementLabel !== "string" ||
    typeof value.neededText !== "string" ||
    !isEnumValue(value.requirementType, requirementTypeValues) ||
    !isOptionalNullableNumber(value.creditAmount) ||
    !isOptionalEnumValue(value.confidence, confidenceValues)
  ) {
    return null;
  }

  const courseOptions = parseStringArray(value.courseOptions);
  if (courseOptions === null) {
    return null;
  }

  return {
    blockName: value.blockName,
    requirementLabel: value.requirementLabel,
    neededText: redactDegreeWorksEvidence(value.neededText),
    courseOptions,
    creditAmount: nullableNumber(value.creditAmount),
    requirementType: value.requirementType,
    confidence: isEnumValue(value.confidence, confidenceValues)
      ? value.confidence
      : "low",
  };
}

function parseCourseStatusRecord(
  value: unknown,
): CurrentDegreeAuditCourseStatusRecord | null {
  if (
    !isRecord(value) ||
    typeof value.code !== "string" ||
    !isEnumValue(value.status, courseStatusValues) ||
    !isEnumValue(value.confidence, confidenceValues) ||
    !isOptionalString(value.title) ||
    !isOptionalString(value.termLabel) ||
    !isOptionalNullableString(value.grade) ||
    !isOptionalNullableNumber(value.credits) ||
    !isOptionalString(value.rawEvidence)
  ) {
    return null;
  }

  return {
    code: value.code,
    ...(typeof value.title === "string" ? { title: value.title } : {}),
    status: value.status,
    ...(typeof value.termLabel === "string"
      ? { termLabel: value.termLabel }
      : {}),
    ...(value.grade !== undefined ? { grade: value.grade } : {}),
    ...(value.credits !== undefined ? { credits: value.credits } : {}),
    ...(typeof value.rawEvidence === "string"
      ? { rawEvidence: redactDegreeWorksEvidence(value.rawEvidence) }
      : {}),
    confidence: value.confidence,
  };
}

function parseExternalCreditRecord(value: unknown): ExternalCreditRecord | null {
  if (
    !isRecord(value) ||
    typeof value.sourceCode !== "string" ||
    typeof value.displayName !== "string" ||
    !isEnumValue(value.sourceType, externalSourceTypeValues) ||
    !isOptionalString(value.institution) ||
    !isOptionalString(value.satisfiesCourseCode) ||
    !isOptionalString(value.satisfiesCourseTitle) ||
    typeof value.rawEvidence !== "string" ||
    !isEnumValue(value.confidence, confidenceValues)
  ) {
    return null;
  }

  return {
    sourceCode: value.sourceCode,
    displayName: value.displayName,
    sourceType: value.sourceType,
    ...(typeof value.institution === "string"
      ? { institution: value.institution }
      : {}),
    ...(typeof value.satisfiesCourseCode === "string"
      ? { satisfiesCourseCode: value.satisfiesCourseCode }
      : {}),
    ...(typeof value.satisfiesCourseTitle === "string"
      ? { satisfiesCourseTitle: value.satisfiesCourseTitle }
      : {}),
    rawEvidence: redactDegreeWorksEvidence(value.rawEvidence),
    confidence: value.confidence,
  };
}

function parseExternalCreditCounts(
  value: unknown,
): CurrentDegreeAuditAnalysis["externalCreditCounts"] | null {
  if (value === undefined) {
    return { advanced_placement: 0, transfer: 0, other: 0 };
  }

  if (
    !isRecord(value) ||
    !isNonNegativeNumber(value.advanced_placement) ||
    !isNonNegativeNumber(value.transfer) ||
    !isNonNegativeNumber(value.other)
  ) {
    return null;
  }

  return {
    advanced_placement: value.advanced_placement,
    transfer: value.transfer,
    other: value.other,
  };
}

function parseArray<T>(
  value: unknown,
  parseItem: (item: unknown) => T | null,
): T[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed: T[] = [];
  for (const item of value) {
    const result = parseItem(item);
    if (result === null) {
      return null;
    }
    parsed.push(result);
  }

  return parsed;
}

function parseOptionalArray<T>(
  value: unknown,
  parseItem: (item: unknown) => T | null,
) {
  return value === undefined ? [] : parseArray(value, parseItem);
}

function parseStringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? [...value]
    : null;
}

function parseOptionalStringArray(value: unknown) {
  return value === undefined ? [] : parseStringArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isEnumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && allowed.includes(value);
}

function isOptionalEnumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
) {
  return value === undefined || isEnumValue(value, allowed);
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isOptionalNullableString(value: unknown) {
  return value === undefined || isNullableString(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isOptionalNullableNumber(value: unknown) {
  return value === undefined || value === null || isNonNegativeNumber(value);
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function nullableNumber(value: unknown) {
  return isNonNegativeNumber(value) ? value : null;
}

function invalidInput(): CurrentProgressAnalysisInputResult {
  return {
    status: "invalid",
    error: INVALID_CURRENT_PROGRESS_ANALYSIS_MESSAGE,
  };
}
