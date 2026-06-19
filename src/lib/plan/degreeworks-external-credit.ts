export type ExternalCreditSourceType =
  | "advanced_placement"
  | "transfer"
  | "other";

export type ExternalCreditConfidence = "high" | "medium" | "low";

export type ExternalCreditRecord = {
  sourceCode: string;
  displayName: string;
  sourceType: ExternalCreditSourceType;
  institution?: string;
  satisfiesCourseCode?: string;
  satisfiesCourseTitle?: string;
  rawEvidence: string;
  confidence: ExternalCreditConfidence;
};

export type ExternalCreditCounts = Record<ExternalCreditSourceType, number>;

const satisfiedByPattern =
  /\bSatisfied\s+by\s*:?\s*([\s\S]*?)(?=\bStill\s+needed\s*:|\bSatisfied\s+by\b|\bComplete\b|\bIncomplete\b|\bPreregistered\b|\bFall\s+Through\b|\bDisclaimer\b|$)/gi;
const auburnCourseCodePattern = /\b([A-Z]{2,4})\s+(\d{4})\b/g;
const compactExternalSourcePattern = /^\s*([A-Z]{2,4}\s*\d{3,4})\s*(?:-|:)?\s*(.*)$/i;
const advancedPlacementCodePattern = /^AP\s*\d{4}$/i;
const transferTextPattern = /\bTransfer\b|\bTR\b|\btransferred\b/i;

export function extractExternalCreditRecords(
  text: string,
): ExternalCreditRecord[] {
  const normalizedText = normalizeWhitespace(text);
  const records: ExternalCreditRecord[] = [];

  for (const match of normalizedText.matchAll(satisfiedByPattern)) {
  const rawEvidence = normalizeWhitespace(match[1]);
    const externalEvidence = trimExternalEvidence(rawEvidence);
    if (!externalEvidence) {
      continue;
    }

    const record = parseSatisfiedByEvidence(externalEvidence);
    if (!record) {
      continue;
    }

    const satisfyTarget = inferSatisfiedCourse({
      fullText: normalizedText,
      satisfiedByIndex: match.index ?? 0,
      sourceCode: record.sourceCode,
    });

    records.push({
      ...record,
      ...satisfyTarget,
      confidence: satisfyTarget.satisfiesCourseCode
        ? record.confidence
        : record.confidence === "high"
          ? "medium"
          : record.confidence,
    });
  }

  return dedupeExternalCredits(records).slice(0, 40);
}

export function countExternalCreditRecords(
  records: ExternalCreditRecord[],
): ExternalCreditCounts {
  return records.reduce<ExternalCreditCounts>(
    (counts, record) => {
      counts[record.sourceType] += 1;
      return counts;
    },
    { advanced_placement: 0, transfer: 0, other: 0 },
  );
}

export function parseSatisfiedByEvidence(
  rawEvidence: string,
): Omit<
  ExternalCreditRecord,
  "satisfiesCourseCode" | "satisfiesCourseTitle"
> | null {
  const evidence = normalizeWhitespace(rawEvidence);
  const match = compactExternalSourcePattern.exec(evidence);

  if (!match) {
    return null;
  }

  const sourceCode = normalizeSourceCode(match[1]);
  const details = normalizeWhitespace(match[2] ?? "");
  const sourceType = detectSourceType(sourceCode, evidence);
  if (looksLikeOrdinaryAuburnCourse(sourceCode) && sourceType === "other") {
    return null;
  }
  const parts = details
    .split(/\s+-\s+/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);

  const title = cleanExternalTitle(parts[0] ?? "");
  const institution =
    sourceType === "transfer" ? cleanInstitution(parts.at(-1) ?? "") : undefined;
  const displayName =
    sourceType === "advanced_placement"
      ? title
        ? `AP ${title}`
        : sourceCode
      : title
        ? `${sourceCode} ${title}`
        : sourceCode;

  return {
    sourceCode,
    displayName,
    sourceType,
    ...(institution ? { institution } : {}),
    rawEvidence: evidence,
    confidence: getEvidenceConfidence({ sourceType, title, evidence }),
  };
}

function inferSatisfiedCourse({
  fullText,
  satisfiedByIndex,
  sourceCode,
}: {
  fullText: string;
  satisfiedByIndex: number;
  sourceCode: string;
}): Pick<ExternalCreditRecord, "satisfiesCourseCode" | "satisfiesCourseTitle"> {
  const before = fullText.slice(Math.max(0, satisfiedByIndex - 260), satisfiedByIndex);
  const matches = Array.from(before.matchAll(auburnCourseCodePattern));
  const sourceCodeNoSpace = sourceCode.replace(/\s+/g, "").toUpperCase();

  for (const match of matches.reverse()) {
    const code = `${match[1]} ${match[2]}`.toUpperCase();
    const afterCourse = before.slice((match.index ?? 0) + match[0].length);
    if (/\bSatisfied\s+by\b/i.test(afterCourse)) {
      continue;
    }

    if (code.replace(/\s+/g, "") === sourceCodeNoSpace) {
      continue;
    }

    const title = extractSatisfiedCourseTitle(before, match.index ?? 0, code);
    return {
      satisfiesCourseCode: code,
      ...(title ? { satisfiesCourseTitle: title } : {}),
    };
  }

  return {};
}

function extractSatisfiedCourseTitle(
  before: string,
  matchIndex: number,
  code: string,
) {
  const afterCode = before.slice(matchIndex + code.length);
  const title = afterCode
    .replace(/\b(?:Grade|Credits?|Term|Satisfied\s+by)\b[\s\S]*$/i, "")
    .replace(/\b(?:A|B|C|D|S|P|CR|TR|TA|TP|AP)\b[\s\S]*$/i, "")
    .replace(/[|:;-]+$/g, "")
    .trim();

  return title.length >= 3 ? title.slice(0, 80) : undefined;
}

function detectSourceType(
  sourceCode: string,
  evidence: string,
): ExternalCreditSourceType {
  if (
    advancedPlacementCodePattern.test(sourceCode) ||
    /\bAdvanced\s+Placement\s+Credit\b/i.test(evidence)
  ) {
    return "advanced_placement";
  }

  if (
    transferTextPattern.test(evidence) ||
    /^[A-Z]{2,4}\d{3}$/.test(sourceCode)
  ) {
    return "transfer";
  }

  return "other";
}

function looksLikeOrdinaryAuburnCourse(sourceCode: string) {
  return /^[A-Z]{2,4}\d{4}$/.test(sourceCode) && !advancedPlacementCodePattern.test(sourceCode);
}

function cleanExternalTitle(title: string) {
  return title
    .replace(/\bAdvanced\s+Placement\s+Credit\b/gi, "")
    .replace(/\bTransfer\s+Credit\b/gi, "")
    .replace(/\bCredits?\b[\s\S]*$/i, "")
    .trim();
}

function cleanInstitution(value: string) {
  const institution = value
    .replace(/\b[A-Z]{2,4}\s+\d{4}\b[\s\S]*$/i, "")
    .trim();

  if (!institution || /^(?:Transfer|TR|Credit|Credits?)$/i.test(institution)) {
    return undefined;
  }

  if (/^Advanced\s+Placement\s+Credit$/i.test(institution)) {
    return undefined;
  }

  return institution;
}

function getEvidenceConfidence({
  sourceType,
  title,
  evidence,
}: {
  sourceType: ExternalCreditSourceType;
  title: string;
  evidence: string;
}): ExternalCreditConfidence {
  if (!title) {
    return "low";
  }

  if (
    sourceType === "advanced_placement" &&
    /\bAdvanced\s+Placement\s+Credit\b/i.test(evidence)
  ) {
    return "high";
  }

  if (sourceType === "transfer" && evidence.split(/\s+-\s+/).length >= 3) {
    return "high";
  }

  return "medium";
}

function normalizeSourceCode(value: string) {
  const compact = value.replace(/\s+/g, "").toUpperCase();
  const match = /^([A-Z]{2,4})(\d{3,4})$/.exec(compact);

  if (!match) {
    return value.toUpperCase();
  }

  return advancedPlacementCodePattern.test(compact)
    ? compact
    : `${match[1]}${match[2]}`;
}

function trimExternalEvidence(evidence: string) {
  const advancedPlacementEnd = /\bAdvanced\s+Placement\s+Credit\b/i.exec(evidence);
  if (advancedPlacementEnd) {
    return evidence.slice(
      0,
      (advancedPlacementEnd.index ?? 0) + advancedPlacementEnd[0].length,
    );
  }

  return evidence
    .replace(/(\s+-\s+[^-]*?)\s+\b[A-Z]{2,4}\s+\d{4}\b[\s\S]*$/i, "$1")
    .trim();
}

function dedupeExternalCredits(records: ExternalCreditRecord[]) {
  const seen = new Set<string>();

  return records.filter((record) => {
    const key = [
      record.sourceCode,
      record.displayName,
      record.satisfiesCourseCode ?? "",
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}
