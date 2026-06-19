import { parseCourseCodes } from "../courses/course-code-parser.ts";

export type DegreeWorksCourseStatus =
  | "completed"
  | "in_progress"
  | "planned"
  | "transfer_or_ap"
  | "substituted_or_waived"
  | "missing"
  | "unknown";

export type DegreeWorksCourseStatusConfidence = "high" | "medium" | "low";

export type DegreeWorksCourseStatusRecord = {
  code: string;
  status: DegreeWorksCourseStatus;
  termLabel?: string;
  credits?: number | null;
  rawEvidence?: string;
  confidence: DegreeWorksCourseStatusConfidence;
};

export type DegreeWorksCourseStatusCounts = Record<DegreeWorksCourseStatus, number>;

const statusOrder: DegreeWorksCourseStatus[] = [
  "completed",
  "in_progress",
  "planned",
  "transfer_or_ap",
  "substituted_or_waived",
  "missing",
  "unknown",
];

const termLabelPattern = /\b(?:Spring|Summer|Fall|Winter)\s+20\d{2}\b/gi;
const completedPattern =
  /\b(?:completed|complete|satisfied|earned|credits earned|applied|grade\s*[:=-]?\s*(?:A|B|C|D|S|P))\b/i;
const inProgressPattern =
  /\b(?:in-progress|in progress|currently enrolled|registered)\b/i;
const plannedPattern = /\b(?:planned|plan(?:ned)? course|future term)\b/i;
const transferOrApPattern =
  /\b(?:transfer|transferred|TR|TRAN|advanced placement|AP|IB|AICE)\b/i;
const substitutedOrWaivedPattern =
  /\b(?:substitution|substituted|exception|waived|waiver|petition)\b/i;
const missingPattern =
  /\b(?:missing|not satisfied|still needed|needed|required but not found)\b/i;
const creditsPattern = /\bCredits?\s*:\s*(\d+(?:\.\d+)?)\b/i;
const evidenceRadius = 180;
const termLookbackRadius = 700;

export function extractDegreeWorksCourseStatuses(
  text: string,
): DegreeWorksCourseStatusRecord[] {
  const courseCodes = parseCourseCodes(text);

  return courseCodes.map((code) => {
    const match = findCourseCodeMatch(text, code);
    const startIndex = match?.index ?? 0;
    const rawEvidence = getEvidenceWindow(text, startIndex, code.length);
    const termLabel = findNearestTermLabel(text, startIndex);
    const credits = extractCredits(
      getEvidenceAfterCourse(text, startIndex, code.length),
    );
    const status = detectStatus(rawEvidence, termLabel);

    return {
      code,
      status,
      ...(termLabel ? { termLabel } : {}),
      credits,
      ...(rawEvidence ? { rawEvidence } : {}),
      confidence: getStatusConfidence(status, rawEvidence, termLabel),
    };
  });
}

export function countDegreeWorksCourseStatuses(
  records: DegreeWorksCourseStatusRecord[],
): DegreeWorksCourseStatusCounts {
  const counts = Object.fromEntries(
    statusOrder.map((status) => [status, 0]),
  ) as DegreeWorksCourseStatusCounts;

  for (const record of records) {
    counts[record.status] += 1;
  }

  return counts;
}

export function getEmptyDegreeWorksCourseStatusCounts() {
  return countDegreeWorksCourseStatuses([]);
}

function detectStatus(
  evidence: string,
  termLabel: string | undefined,
): DegreeWorksCourseStatus {
  if (substitutedOrWaivedPattern.test(evidence)) {
    return "substituted_or_waived";
  }

  if (transferOrApPattern.test(evidence)) {
    return "transfer_or_ap";
  }

  if (inProgressPattern.test(evidence)) {
    return "in_progress";
  }

  if (plannedPattern.test(evidence) || termLabel) {
    return "planned";
  }

  if (completedPattern.test(evidence)) {
    return "completed";
  }

  if (missingPattern.test(evidence)) {
    return "missing";
  }

  return "unknown";
}

function getStatusConfidence(
  status: DegreeWorksCourseStatus,
  evidence: string,
  termLabel: string | undefined,
): DegreeWorksCourseStatusConfidence {
  if (status === "unknown") {
    return "low";
  }

  if (status === "planned" && termLabel && !plannedPattern.test(evidence)) {
    return "medium";
  }

  return "high";
}

function findCourseCodeMatch(text: string, code: string) {
  const [prefix, number] = code.split(" ");
  const pattern = new RegExp(`\\b${prefix}\\s*${number}\\b`, "i");

  return pattern.exec(text);
}

function findNearestTermLabel(text: string, courseIndex: number) {
  const lineStart = text.lastIndexOf("\n", courseIndex);
  const lineEnd = text.indexOf("\n", courseIndex);
  const currentLine = text.slice(
    lineStart === -1 ? 0 : lineStart + 1,
    lineEnd === -1 ? text.length : lineEnd,
  );
  const currentLineTerm = currentLine.match(termLabelPattern)?.at(-1);

  termLabelPattern.lastIndex = 0;

  if (currentLineTerm || text.includes("\n")) {
    return currentLineTerm;
  }

  const searchStart = Math.max(0, courseIndex - termLookbackRadius);
  const beforeCourse = text.slice(searchStart, courseIndex);
  const matches = Array.from(beforeCourse.matchAll(termLabelPattern));
  const nearest = matches.at(-1)?.[0];

  termLabelPattern.lastIndex = 0;

  return nearest;
}

function extractCredits(evidenceAfterCourse: string) {
  const match = creditsPattern.exec(evidenceAfterCourse);

  return match ? Number(match[1]) : null;
}

function getEvidenceWindow(text: string, courseIndex: number, codeLength: number) {
  const lineStart = text.lastIndexOf("\n", courseIndex);
  const lineEnd = text.indexOf("\n", courseIndex);
  const boundedLine = text.slice(
    lineStart === -1 ? 0 : lineStart + 1,
    lineEnd === -1 ? text.length : lineEnd,
  );

  if (boundedLine.length > 0 && boundedLine.length <= evidenceRadius * 2) {
    return normalizeEvidence(boundedLine);
  }

  return normalizeEvidence(
    text.slice(
      Math.max(0, courseIndex - evidenceRadius),
      Math.min(text.length, courseIndex + codeLength + evidenceRadius),
    ),
  );
}

function getEvidenceAfterCourse(
  text: string,
  courseIndex: number,
  codeLength: number,
) {
  const lineEnd = text.indexOf("\n", courseIndex);
  const boundedEnd = Math.min(
    lineEnd === -1 ? text.length : lineEnd,
    courseIndex + codeLength + evidenceRadius,
  );

  return text.slice(courseIndex, boundedEnd);
}

function normalizeEvidence(evidence: string) {
  return evidence.replace(/\s+/g, " ").trim();
}
