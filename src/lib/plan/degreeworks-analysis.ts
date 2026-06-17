import { parseCourseCodes } from "../courses/course-code-parser.ts";
import { extractTotalPlannedCredits } from "./total-planned-credits.ts";

export type DegreeWorksParserConfidence = "high" | "medium" | "low";

export type DegreeWorksDetectedSignals = {
  hasTransferCreditSignal: boolean;
  hasApCreditSignal: boolean;
  hasInProgressSignal: boolean;
  hasSubstitutionSignal: boolean;
  hasExceptionSignal: boolean;
  hasInsufficientTextSignal: boolean;
};

export type DegreeWorksAnalysis = {
  parsedCourseCodes: string[];
  parsedCourseCount: number;
  totalPlannedCredits: number | null;
  detectedRequirementBlockLabels: string[];
  detectedSignals: DegreeWorksDetectedSignals;
  parserWarnings: string[];
  confidence: DegreeWorksParserConfidence;
};

const minimumTextLength = 500;
const minimumParsedCourseCount = 10;
const highConfidenceCourseCount = 30;

const apCreditPattern = /\b(?:AP|Advanced Placement|AICE|IB)\b/i;
const transferCreditPattern = /\b(?:Transfer|TR|TRAN|transferred)\b/i;
const inProgressPattern =
  /\b(?:In-progress|In Progress|Registered|Currently Enrolled)\b/i;
const substitutionPattern = /\b(?:Substitution|Substituted|Petition)\b/i;
const exceptionPattern = /\b(?:Exception|Waived|Petition)\b/i;
const requirementBlockLabelPatterns = [
  { label: "Core Science", pattern: /\bCore\s+Science\b/i },
  { label: "Technical Elective", pattern: /\bTechnical\s+Elective\b/i },
  { label: "Free Elective", pattern: /\bFree\s+Elective\b/i },
  { label: "Humanities", pattern: /\bHumanities\b/i },
  { label: "Core Literature", pattern: /\b(?:Core\s+)?Literature\b/i },
  { label: "Social Science", pattern: /\bSocial\s+Science\b/i },
  { label: "Math Elective", pattern: /\bMath\s+Elective\b/i },
  { label: "Core Fine Arts", pattern: /\b(?:Core\s+)?Fine\s+Arts\b/i },
  { label: "Core History", pattern: /\bCore\s+History\b/i },
];

export function analyzeDegreeWorksText(text: string): DegreeWorksAnalysis {
  const parsedCourseCodes = parseCourseCodes(text);
  const parsedCourseCount = parsedCourseCodes.length;
  const totalPlannedCredits = extractTotalPlannedCredits(text);
  const normalizedText = text.trim();
  const detectedRequirementBlockLabels = detectRequirementBlockLabels(text);

  const detectedSignals: DegreeWorksDetectedSignals = {
    hasTransferCreditSignal: transferCreditPattern.test(text),
    hasApCreditSignal: apCreditPattern.test(text),
    hasInProgressSignal: inProgressPattern.test(text),
    hasSubstitutionSignal: substitutionPattern.test(text),
    hasExceptionSignal: exceptionPattern.test(text),
    hasInsufficientTextSignal:
      normalizedText.length < minimumTextLength ||
      parsedCourseCount < minimumParsedCourseCount,
  };

  const parserWarnings = buildParserWarnings(
    detectedSignals,
    detectedRequirementBlockLabels,
  );
  const hasWarningSignals =
    detectedSignals.hasTransferCreditSignal ||
    detectedSignals.hasApCreditSignal ||
    detectedSignals.hasInProgressSignal ||
    detectedSignals.hasSubstitutionSignal ||
    detectedSignals.hasExceptionSignal;

  return {
    parsedCourseCodes,
    parsedCourseCount,
    totalPlannedCredits,
    detectedRequirementBlockLabels,
    detectedSignals,
    parserWarnings,
    confidence: detectedSignals.hasInsufficientTextSignal
      ? "low"
      : hasWarningSignals
        ? "medium"
        : parsedCourseCount >= highConfidenceCourseCount
          ? "high"
          : "medium",
  };
}

function detectRequirementBlockLabels(text: string) {
  return requirementBlockLabelPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);
}

function buildParserWarnings(
  detectedSignals: DegreeWorksDetectedSignals,
  detectedRequirementBlockLabels: string[],
) {
  const warnings: string[] = [];

  if (detectedSignals.hasInsufficientTextSignal) {
    warnings.push(
      "The extracted PDF text was short or produced very few course codes, so the parser may have missed Degree Works content.",
    );
  }

  if (detectedSignals.hasApCreditSignal) {
    warnings.push(
      "Possible AP, AICE, IB, or Advanced Placement credit was detected and needs advisor verification.",
    );
  }

  if (detectedSignals.hasTransferCreditSignal) {
    warnings.push(
      "Possible transfer credit was detected and needs advisor verification.",
    );
  }

  if (detectedSignals.hasInProgressSignal) {
    warnings.push(
      "Possible in-progress or registered coursework was detected and needs advisor verification.",
    );
  }

  if (detectedSignals.hasSubstitutionSignal) {
    warnings.push(
      "Possible substitution or petition language was detected and needs advisor verification.",
    );
  }

  if (detectedSignals.hasExceptionSignal) {
    warnings.push(
      "Possible exception, waiver, or petition language was detected and needs advisor verification.",
    );
  }

  if (detectedRequirementBlockLabels.length > 0) {
    warnings.push(
      `Degree Works block labels were detected (${detectedRequirementBlockLabels.join(
        ", ",
      )}), but this parser does not safely map nearby courses into those official blocks. Requirement block statuses remain conservative.`,
    );
  }

  return warnings;
}
