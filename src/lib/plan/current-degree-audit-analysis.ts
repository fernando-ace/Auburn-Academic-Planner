import { parseCourseCodes } from "../courses/course-code-parser.ts";
import {
  countExternalCreditRecords,
  extractExternalCreditRecords,
  type ExternalCreditCounts,
  type ExternalCreditRecord,
} from "./degreeworks-external-credit.ts";
import type { DegreeWorksParserConfidence } from "./degreeworks-analysis.ts";
import type { DegreeWorksDocumentType } from "./degreeworks-document-type.ts";

export type CurrentDegreeAuditBlockStatus =
  | "complete"
  | "incomplete"
  | "nearly_complete"
  | "unknown";

export type CurrentDegreeAuditCourseStatus =
  | "completed"
  | "preregistered"
  | "in_progress"
  | "transfer_or_ap"
  | "non_degree_applicable"
  | "still_needed"
  | "unknown";

export type CurrentDegreeAuditCourseStatusRecord = {
  code: string;
  title?: string;
  status: CurrentDegreeAuditCourseStatus;
  termLabel?: string;
  grade?: string | null;
  credits?: number | null;
  rawEvidence?: string;
  confidence: "high" | "medium" | "low";
};

export type CurrentDegreeAuditRequirementBlock = {
  name: string;
  status: CurrentDegreeAuditBlockStatus;
  creditsRequired?: number | null;
  creditsApplied?: number | null;
  creditsNeeded?: number | null;
  stillNeededText: string[];
  notes: string[];
};

export type CurrentDegreeAuditAnalysis = {
  documentType: "worksheet_audit";
  studentProgram?: string;
  major?: string;
  catalogYear?: string;
  auditDate?: string | null;
  creditsRequired?: number | null;
  creditsApplied?: number | null;
  creditsNeeded?: number | null;
  degreeStatus?: "complete" | "incomplete" | "unknown";
  requirementBlocks: CurrentDegreeAuditRequirementBlock[];
  courseStatusRecords: CurrentDegreeAuditCourseStatusRecord[];
  externalCreditRecords: ExternalCreditRecord[];
  externalCreditCounts: ExternalCreditCounts;
  completedCourseCodes: string[];
  preregisteredCourseCodes: string[];
  inProgressCourseCodes: string[];
  transferOrApCourseCodes: string[];
  nonDegreeApplicableCourseCodes: string[];
  stillNeededCourseCodes: string[];
  currentApplicableCourseCodes: string[];
  parserWarnings: string[];
  confidence: DegreeWorksParserConfidence;
};

const courseCodePattern = /\b([A-Z]{2,4})\s*(\d{4})\b/g;
const termPattern = /\b(?:Spring|Summer|Fall|Winter)\s+20\d{2}\b/i;
const completedGradePattern = /^(?:A|B|C|D|S|P|CR)$/i;
const transferGradePattern = /^(?:TR|TA|TP|T|AP)$/i;

export function analyzeCurrentDegreeAuditText(
  text: string,
): CurrentDegreeAuditAnalysis {
  const normalizedText = normalizeWhitespace(text);
  const parserWarnings: string[] = [];
  const auditDate = extractLabelText(normalizedText, "Audit date");
  const creditsRequired = extractNumericLabel(normalizedText, "Credits required");
  const creditsApplied = extractNumericLabel(normalizedText, "Credits applied");
  const creditsNeeded =
    extractNumericLabel(normalizedText, "Credits needed") ??
    extractCreditsNeededFromUnmetConditions(normalizedText);
  const degreeStatus = detectDegreeStatus(normalizedText);
  const studentProgram = extractLabelText(normalizedText, "Program");
  const major = extractLabelText(normalizedText, "Major");
  const catalogYear = extractLabelText(normalizedText, "Catalog year");
  const stillNeededText = extractStillNeededTexts(normalizedText);
  const stillNeededCourseCodes = dedupe(
    stillNeededText.flatMap((item) => extractCourseCodesFromText(item)),
  );
  const preregisteredText = extractSection(normalizedText, "Preregistered", [
    "Fall Through",
    "Disclaimer",
    "Blocks included in this block",
  ]);
  const fallThroughText = extractSection(normalizedText, "Fall Through", [
    "Preregistered",
    "Disclaimer",
    "Blocks included in this block",
  ]);
  const satisfiedByTexts = extractSatisfiedByTexts(normalizedText);
  const externalCreditRecords = extractExternalCreditRecords(normalizedText);
  const externalCreditCounts = countExternalCreditRecords(externalCreditRecords);
  const inProgressText = extractSection(normalizedText, "In-progress", [
    "Preregistered",
    "Fall Through",
    "Disclaimer",
  ]);

  const recordsByCode = new Map<string, CurrentDegreeAuditCourseStatusRecord>();

  addRecords(recordsByCode, buildCompletedRows(normalizedText));
  addRecords(
    recordsByCode,
    buildSectionRecords({
      text: preregisteredText,
      status: "preregistered",
      confidence: "high",
    }),
  );
  addRecords(
    recordsByCode,
    buildSectionRecords({
      text: inProgressText,
      status: "in_progress",
      confidence: "medium",
    }),
  );
  addRecords(
    recordsByCode,
    buildExternalCreditCourseRecords(externalCreditRecords),
  );
  addRecords(
    recordsByCode,
    buildSectionRecords({
      text: fallThroughText,
      status: "non_degree_applicable",
      confidence: "medium",
    }),
  );
  addRecords(
    recordsByCode,
    stillNeededText.flatMap((evidence) =>
      buildSectionRecords({
        text: evidence,
        status: "still_needed",
        confidence: "high",
      }),
    ),
  );

  const parsedCourseCodes = dedupe([
    ...parseCourseCodes(normalizedText),
    ...extractCourseCodesFromText(normalizedText),
  ]).filter((code) => !isExternalSourceCourseCode(code, satisfiedByTexts));
  for (const code of parsedCourseCodes) {
    if (!recordsByCode.has(code)) {
      recordsByCode.set(code, {
        code,
        status: "unknown",
        rawEvidence: getEvidenceWindow(normalizedText, code),
        confidence: "low",
      });
    }
  }

  const requirementBlocks = extractRequirementBlocks(
    normalizedText,
    stillNeededText,
  );
  const courseStatusRecords = Array.from(recordsByCode.values()).sort((left, right) =>
    left.code.localeCompare(right.code),
  );

  if (normalizedText.length < 500 || courseStatusRecords.length < 5) {
    parserWarnings.push(
      "The extracted worksheet text was short or had very few course records, so current-progress parsing may be incomplete.",
    );
  }

  if (courseStatusRecords.some((record) => record.status === "unknown")) {
    parserWarnings.push(
      "Some courses did not have enough nearby worksheet evidence for a confident status and are marked unknown.",
    );
  }

  if (stillNeededText.length === 0) {
    parserWarnings.push(
      "No Still needed lines were detected; confirm the uploaded PDF is the Degree Works Worksheet audit.",
    );
  }

  return {
    documentType: "worksheet_audit",
    ...(studentProgram ? { studentProgram } : {}),
    ...(major ? { major } : {}),
    ...(catalogYear ? { catalogYear } : {}),
    auditDate: auditDate ?? null,
    creditsRequired: creditsRequired ?? null,
    creditsApplied: creditsApplied ?? null,
    creditsNeeded: creditsNeeded ?? null,
    degreeStatus,
    requirementBlocks,
    courseStatusRecords,
    externalCreditRecords,
    externalCreditCounts,
    completedCourseCodes: recordsWithStatus(courseStatusRecords, "completed"),
    preregisteredCourseCodes: recordsWithStatus(courseStatusRecords, "preregistered"),
    inProgressCourseCodes: recordsWithStatus(courseStatusRecords, "in_progress"),
    transferOrApCourseCodes: recordsWithStatus(courseStatusRecords, "transfer_or_ap"),
    nonDegreeApplicableCourseCodes: recordsWithStatus(
      courseStatusRecords,
      "non_degree_applicable",
    ),
    stillNeededCourseCodes,
    currentApplicableCourseCodes: currentApplicableCourseCodes(courseStatusRecords),
    parserWarnings,
    confidence: getConfidence({ parserWarnings, courseStatusRecords, normalizedText }),
  };
}

export function emptyCurrentDegreeAuditAnalysis(
  documentType: DegreeWorksDocumentType,
): Omit<CurrentDegreeAuditAnalysis, "documentType"> & {
  documentType: DegreeWorksDocumentType;
} {
  return {
    documentType,
    auditDate: null,
    creditsRequired: null,
    creditsApplied: null,
    creditsNeeded: null,
    degreeStatus: "unknown",
    requirementBlocks: [],
    courseStatusRecords: [],
    externalCreditRecords: [],
    externalCreditCounts: { advanced_placement: 0, transfer: 0, other: 0 },
    completedCourseCodes: [],
    preregisteredCourseCodes: [],
    inProgressCourseCodes: [],
    transferOrApCourseCodes: [],
    nonDegreeApplicableCourseCodes: [],
    stillNeededCourseCodes: [],
    currentApplicableCourseCodes: [],
    parserWarnings: [
      "The uploaded PDF was not confidently detected as a Degree Works Worksheet audit.",
    ],
    confidence: "low",
  };
}

function buildExternalCreditCourseRecords(
  records: ExternalCreditRecord[],
): CurrentDegreeAuditCourseStatusRecord[] {
  return records
    .filter(
      (record): record is ExternalCreditRecord & { satisfiesCourseCode: string } =>
        Boolean(record.satisfiesCourseCode),
    )
    .map((record) => ({
      code: record.satisfiesCourseCode,
      title: record.satisfiesCourseTitle,
      status: "transfer_or_ap",
      rawEvidence: record.rawEvidence,
      confidence: record.confidence,
    }));
}

function buildCompletedRows(text: string): CurrentDegreeAuditCourseStatusRecord[] {
  const records: CurrentDegreeAuditCourseStatusRecord[] = [];
  const matches = Array.from(text.matchAll(courseCodePattern));

  for (const [index, match] of matches.entries()) {
    const code = `${match[1]} ${match[2]}`;
    if (/^AP\s+\d{4}$/i.test(code)) {
      continue;
    }

    const courseIndex = match.index ?? 0;
    const nextCourseIndex = matches[index + 1]?.index;
    const evidence = normalizeWhitespace(
      text.slice(
        Math.max(0, courseIndex - 80),
        Math.min(text.length, nextCourseIndex ?? courseIndex + 220),
      ),
    );
    const grade = extractGrade(evidence);

    if (!grade) {
      continue;
    }

    const transferEvidence =
      transferGradePattern.test(grade) ||
      /\b(?:Transfer|Advanced Placement|AP|AICE|IB)\b/i.test(evidence);
    const completedEvidence = completedGradePattern.test(grade);

    if (!transferEvidence && !completedEvidence) {
      continue;
    }

    records.push({
      code,
      status: transferEvidence ? "transfer_or_ap" : "completed",
      title: extractCourseTitle(evidence, code),
      termLabel: evidence.match(termPattern)?.[0],
      grade,
      credits: extractNearbyCredits(evidence),
      rawEvidence: evidence,
      confidence: "medium",
    });
  }

  return records;
}

function buildSectionRecords({
  text,
  status,
  confidence,
}: {
  text: string;
  status: CurrentDegreeAuditCourseStatus;
  confidence: "high" | "medium" | "low";
}) {
  if (!text) {
    return [];
  }

  return extractCourseCodesFromText(text).map((code) => ({
    code,
    status,
    title: extractCourseTitle(getEvidenceWindow(text, code), code),
    termLabel: getEvidenceWindow(text, code).match(termPattern)?.[0],
    grade: extractGrade(getEvidenceWindow(text, code)),
    credits: extractNearbyCredits(getEvidenceWindow(text, code)),
    rawEvidence: getEvidenceWindow(text, code),
    confidence,
  }));
}

function addRecords(
  recordsByCode: Map<string, CurrentDegreeAuditCourseStatusRecord>,
  records: CurrentDegreeAuditCourseStatusRecord[],
) {
  for (const record of records) {
    const existing = recordsByCode.get(record.code);

    if (!existing || statusPriority(record.status) > statusPriority(existing.status)) {
      recordsByCode.set(record.code, record);
    }
  }
}

function statusPriority(status: CurrentDegreeAuditCourseStatus) {
  switch (status) {
    case "preregistered":
      return 90;
    case "in_progress":
      return 85;
    case "non_degree_applicable":
      return 80;
    case "completed":
      return 70;
    case "transfer_or_ap":
      return 65;
    case "still_needed":
      return 40;
    case "unknown":
      return 0;
  }
}

function extractRequirementBlocks(
  text: string,
  globalStillNeededText: string[],
): CurrentDegreeAuditRequirementBlock[] {
  const blocks: CurrentDegreeAuditRequirementBlock[] = [];
  const blockPattern =
    /\b(Complete|Incomplete)\s+((?:(?!\bComplete\b|\bIncomplete\b|\bPreregistered\b|\bFall\s+Through\b|\bDisclaimer\b).){8,260})/gi;

  for (const match of text.matchAll(blockPattern)) {
    const statusText = match[1].toLowerCase();
    const evidence = normalizeWhitespace(match[2]);
    const name = cleanBlockName(evidence);

    if (!name || blocks.some((block) => block.name === name)) {
      continue;
    }

    const stillNeededText = extractStillNeededTexts(evidence);
    const creditsNeeded =
      extractCreditsNeededFromUnmetConditions(evidence) ??
      extractCreditsFromStillNeeded(stillNeededText);

    blocks.push({
      name,
      status:
        statusText === "complete"
          ? "complete"
          : creditsNeeded !== null && creditsNeeded <= 3
            ? "nearly_complete"
            : "incomplete",
      creditsRequired: extractNumericLabel(evidence, "Credits required"),
      creditsApplied: extractNumericLabel(evidence, "Credits applied"),
      creditsNeeded,
      stillNeededText,
      notes: buildBlockNotes(evidence, stillNeededText),
    });
  }

  if (blocks.length === 0 && globalStillNeededText.length > 0) {
    blocks.push({
      name: "Worksheet unmet requirements",
      status: "incomplete",
      creditsNeeded: extractCreditsFromStillNeeded(globalStillNeededText),
      stillNeededText: globalStillNeededText,
      notes: ["Requirement block labels could not be parsed confidently."],
    });
  }

  return blocks.slice(0, 20);
}

function buildBlockNotes(evidence: string, stillNeededText: string[]) {
  return [
    /advisor|approval|approved/i.test(evidence)
      ? "Advisor approval language was detected in this block."
      : null,
    stillNeededText.length > 0
      ? "Degree Works lists one or more Still needed items for this block."
      : null,
  ].filter((note): note is string => Boolean(note));
}

function cleanBlockName(evidence: string) {
  const beforeStillNeeded = evidence.split(/\bStill\s+needed\s*:/i)[0];
  return beforeStillNeeded
    .replace(/\bSee\b/gi, "")
    .replace(/\bBelow\b/gi, "")
    .replace(/\bSatisfied by\b[\s\S]*$/i, "")
    .trim()
    .slice(0, 90);
}

function extractStillNeededTexts(text: string) {
  const matches = Array.from(
    text.matchAll(
      /\bStill\s+needed\s*:\s*([\s\S]*?)(?=\bStill\s+needed\s*:|\bSatisfied\s+by\b|\bComplete\b|\bIncomplete\b|\bPreregistered\b|\bFall\s+Through\b|\bDisclaimer\b|$)/gi,
    ),
  );

  return matches
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)
    .slice(0, 30);
}

function extractSatisfiedByTexts(text: string) {
  return Array.from(
    text.matchAll(
      /\bSatisfied\s+by\s*:?\s*([\s\S]*?)(?=\bStill\s+needed\s*:|\bSatisfied\s+by\b|\bComplete\b|\bIncomplete\b|\bPreregistered\b|\bFall\s+Through\b|\bDisclaimer\b|$)/gi,
    ),
  )
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)
    .slice(0, 30);
}

function extractSection(text: string, startLabel: string, endLabels: string[]) {
  const start = text.search(new RegExp(`\\b${escapeRegExp(startLabel)}\\b`, "i"));
  if (start === -1) {
    return "";
  }

  const afterStart = text.slice(start);
  const endPattern = new RegExp(
    endLabels.map((label) => `\\b${escapeRegExp(label)}\\b`).join("|"),
    "i",
  );
  const endMatch = endPattern.exec(afterStart.slice(startLabel.length));
  const endIndex = endMatch
    ? startLabel.length + (endMatch.index ?? 0)
    : afterStart.length;

  return normalizeWhitespace(afterStart.slice(0, endIndex));
}

function extractNumericLabel(text: string, label: string) {
  const match = new RegExp(
    `\\b${escapeRegExp(label)}\\b\\s*:?\\s*(\\d+(?:\\.\\d+)?)`,
    "i",
  ).exec(text);

  return match ? Number(match[1]) : null;
}

function extractLabelText(text: string, label: string) {
  const match = new RegExp(
    `\\b${escapeRegExp(label)}\\b\\s*:?\\s*([A-Za-z0-9][A-Za-z0-9 &/.-]{1,80})`,
    "i",
  ).exec(text);

  return match?.[1]?.trim();
}

function extractCreditsNeededFromUnmetConditions(text: string) {
  const match = /\bUnmet\s+conditions\b[\s\S]{0,80}?(\d+(?:\.\d+)?)\s+Credits?\s+needed\b/i.exec(
    text,
  );

  return match ? Number(match[1]) : null;
}

function extractCreditsFromStillNeeded(stillNeededText: string[]) {
  const total = stillNeededText.reduce((sum, item) => {
    const match = /(\d+(?:\.\d+)?)\s+Credits?/i.exec(item);
    return sum + (match ? Number(match[1]) : 0);
  }, 0);

  return total > 0 ? total : null;
}

function detectDegreeStatus(text: string): "complete" | "incomplete" | "unknown" {
  if (/\bINCOMPLETE\b/i.test(text)) {
    return "incomplete";
  }

  if (/\bCOMPLETE\b/i.test(text) && !/\bStill\s+needed\b/i.test(text)) {
    return "complete";
  }

  return "unknown";
}

function extractGrade(evidence: string) {
  const match = /\bGrade\s*[:=-]?\s*([A-Z]{1,2})\b/i.exec(evidence);
  if (match) {
    return match[1].toUpperCase();
  }

  const tokens = evidence.split(/\s+/);
  return tokens.find((token) =>
    /^(?:A|B|C|D|S|P|CR|TR|TA|TP|AP)$/i.test(token),
  )?.toUpperCase();
}

function extractNearbyCredits(evidence: string) {
  const match =
    /\bCredits?\s*[:=-]?\s*(\d+(?:\.\d+)?)\b/i.exec(evidence) ??
    /\b(\d+(?:\.\d+)?)\s+Credits?\b/i.exec(evidence);

  return match ? Number(match[1]) : null;
}

function extractCourseTitle(evidence: string, code: string) {
  const codeIndex = evidence.toUpperCase().indexOf(code.toUpperCase());
  if (codeIndex === -1) {
    return undefined;
  }

  const afterCode = evidence.slice(codeIndex + code.length);
  const title = afterCode
    .replace(/\b(?:Grade|Credits?|Term)\b[\s\S]*$/i, "")
    .replace(/\b(?:A|B|C|D|S|P|CR|TR|TA|TP|AP)\b[\s\S]*$/i, "")
    .trim();

  return title.length >= 3 ? title.slice(0, 80) : undefined;
}

function getEvidenceWindow(text: string, code: string) {
  const compactCodePattern = new RegExp(
    `\\b${escapeRegExp(code).replace("\\ ", "\\s*")}\\b`,
    "i",
  );
  const match = compactCodePattern.exec(text);
  const index = match?.index ?? 0;

  return normalizeWhitespace(
    text.slice(Math.max(0, index - 180), Math.min(text.length, index + 240)),
  );
}

function recordsWithStatus(
  records: CurrentDegreeAuditCourseStatusRecord[],
  status: CurrentDegreeAuditCourseStatus,
) {
  return records.filter((record) => record.status === status).map((record) => record.code);
}

function currentApplicableCourseCodes(records: CurrentDegreeAuditCourseStatusRecord[]) {
  return records
    .filter((record) =>
      ["completed", "transfer_or_ap", "in_progress", "preregistered"].includes(
        record.status,
      ),
    )
    .map((record) => record.code);
}

function extractCourseCodesFromText(text: string) {
  return dedupe(
    Array.from(text.matchAll(courseCodePattern)).map(
      (match) => `${match[1]} ${match[2]}`,
    ),
  );
}

function isExternalSourceCourseCode(code: string, satisfiedByTexts: string[]) {
  const compactCode = code.replace(/\s+/g, "").toUpperCase();

  if (!/^AP\d{4}$/.test(compactCode)) {
    return false;
  }

  return satisfiedByTexts.some((text) =>
    text.replace(/\s+/g, "").toUpperCase().includes(compactCode),
  );
}

function getConfidence({
  parserWarnings,
  courseStatusRecords,
  normalizedText,
}: {
  parserWarnings: string[];
  courseStatusRecords: CurrentDegreeAuditCourseStatusRecord[];
  normalizedText: string;
}): DegreeWorksParserConfidence {
  if (normalizedText.length < 500 || courseStatusRecords.length < 5) {
    return "low";
  }

  const unknownCount = courseStatusRecords.filter(
    (record) => record.status === "unknown",
  ).length;

  if (unknownCount / courseStatusRecords.length >= 0.5) {
    return "low";
  }

  return parserWarnings.length > 0 ? "medium" : "high";
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupe(items: string[]) {
  return Array.from(new Set(items));
}
