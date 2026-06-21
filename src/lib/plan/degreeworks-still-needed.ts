import { parseCourseCodes } from "../courses/course-code-parser.ts";

export type DegreeWorksStillNeededRequirementType =
  | "specific_course"
  | "course_options"
  | "credit_hours_from_list"
  | "block_reference"
  | "graduation_milestone"
  | "advisor_review";

export type DegreeWorksStillNeededItem = {
  blockName: string;
  requirementLabel: string;
  neededText: string;
  courseOptions: string[];
  creditAmount?: number | null;
  requirementType: DegreeWorksStillNeededRequirementType;
  confidence: "high" | "medium" | "low";
};

const milestoneCoursePattern = /\b(?:UNIV\s*4AA0|ENGR\s*1100|COMP\s*4810)\b/i;
const blockReferencePattern =
  /\b(?:see|refer to|from|below|section|block|major requirements?|degree requirements?)\b/i;
const maxNeededTextLength = 140;

export function parseDegreeWorksStillNeededItems({
  blockName,
  stillNeededText,
}: {
  blockName: string;
  stillNeededText: string[];
}): DegreeWorksStillNeededItem[] {
  return stillNeededText.map((neededText, index) =>
    parseDegreeWorksStillNeededItem({
      blockName,
      neededText,
      fallbackIndex: index,
    }),
  );
}

export function parseDegreeWorksStillNeededItem({
  blockName,
  neededText,
  fallbackIndex = 0,
}: {
  blockName: string;
  neededText: string;
  fallbackIndex?: number;
}): DegreeWorksStillNeededItem {
  const normalized = sanitizeStillNeededText(
    neededText.replace(/^Still\s+needed\s*:\s*/i, ""),
  );
  const courseOptions = extractStillNeededCourseOptions(normalized);
  const creditAmount = extractCreditAmount(normalized);
  const requirementType = classifyStillNeededRequirement({
    courseOptions,
    creditAmount,
    neededText: normalized,
  });

  return {
    blockName,
    requirementLabel: buildRequirementLabel({
      blockName,
      courseOptions,
      fallbackIndex,
      neededText: normalized,
      requirementType,
    }),
    neededText: normalized,
    courseOptions,
    creditAmount,
    requirementType,
    confidence: getConfidence({
      courseOptions,
      neededText: normalized,
      requirementType,
    }),
  };
}

export function formatStillNeededItemForDisplay(
  item: Pick<
    DegreeWorksStillNeededItem,
    "courseOptions" | "neededText" | "requirementLabel" | "requirementType" | "confidence"
  >,
) {
  if (item.requirementType === "graduation_milestone") {
    return formatMilestoneLabel(item.courseOptions, item.neededText);
  }

  if (item.requirementType === "specific_course") {
    return item.courseOptions[0] ?? item.requirementLabel;
  }

  if (item.requirementType === "course_options") {
    if (item.confidence === "low" || item.courseOptions.length === 0) {
      return "Option-list requirement needs advisor review";
    }

    return `Choose one from: ${item.courseOptions.slice(0, 6).join(", ")}`;
  }

  if (item.requirementType === "credit_hours_from_list") {
    if (/technical\s+elective/i.test(item.neededText)) {
      return "Technical elective options require advisor review";
    }

    return "Option-list requirement needs advisor review";
  }

  if (item.requirementType === "block_reference") {
    return item.requirementLabel || "Requirement block needs advisor review";
  }

  return "Option-list requirement needs advisor review";
}

export function extractStillNeededCourseOptions(text: string) {
  const directCodes = parseCourseCodes(text);
  const options = [...directCodes];
  const firstPrefix = directCodes[0]?.split(" ")[0];

  if (firstPrefix) {
    for (const match of text.matchAll(/\b(?:or|,|and)\s+(\d{4}[A-Z]?)\b/gi)) {
      options.push(`${firstPrefix} ${match[1].toUpperCase()}`);
    }
  }

  return dedupe(options.map(normalizeCourseCode));
}

function classifyStillNeededRequirement({
  courseOptions,
  creditAmount,
  neededText,
}: {
  courseOptions: string[];
  creditAmount: number | null;
  neededText: string;
}): DegreeWorksStillNeededRequirementType {
  if (milestoneCoursePattern.test(neededText) || creditAmount === 0) {
    return "graduation_milestone";
  }

  if (courseOptions.length === 0 && blockReferencePattern.test(neededText)) {
    return "block_reference";
  }

  if (courseOptions.length === 1) {
    return "specific_course";
  }

  if (courseOptions.length > 1) {
    if (
      (typeof creditAmount === "number" && creditAmount >= 6) ||
      /\b(?:elective|credits?\s+from|hours?\s+from|approved)\b/i.test(neededText)
    ) {
      return "credit_hours_from_list";
    }

    return "course_options";
  }

  return "advisor_review";
}

function extractCreditAmount(text: string) {
  const match =
    /\b(\d+(?:\.\d+)?)\s+(?:Credits?|Credit\s+Hours?|Hours?|Classes?|Class)\b/i.exec(
      text,
    ) ??
    /\bCredits?\s*[:=-]?\s*(\d+(?:\.\d+)?)\b/i.exec(text);

  return match ? Number(match[1]) : null;
}

function buildRequirementLabel({
  blockName,
  courseOptions,
  fallbackIndex,
  neededText,
  requirementType,
}: {
  blockName: string;
  courseOptions: string[];
  fallbackIndex: number;
  neededText: string;
  requirementType: DegreeWorksStillNeededRequirementType;
}) {
  if (requirementType === "graduation_milestone") {
    return formatMilestoneLabel(courseOptions, neededText);
  }

  if (courseOptions.length === 1) {
    return courseOptions[0];
  }

  if (courseOptions.length > 1) {
    return `${courseOptions.slice(0, 3).join(" or ")}${
      courseOptions.length > 3 ? "..." : ""
    }`;
  }

  if (requirementType === "block_reference") {
    return neededText.slice(0, 80);
  }

  return `${blockName} item ${fallbackIndex + 1}`;
}

function getConfidence({
  courseOptions,
  neededText,
  requirementType,
}: {
  courseOptions: string[];
  neededText: string;
  requirementType: DegreeWorksStillNeededRequirementType;
}) {
  if (requirementType === "advisor_review") {
    return "low";
  }

  if (requirementType === "block_reference") {
    return "medium";
  }

  if (courseOptions.length > 0 && neededText.length > 0) {
    return "high";
  }

  return "medium";
}

function normalizeCourseCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, " ");
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function sanitizeStillNeededText(text: string) {
  let normalized = normalizeWhitespace(text);
  const repeatedCreditMatch = /\b\d+(?:\.\d+)?\s+(?:Credits?|Credit\s+Hours?|Hours?|Classes?|Class)\b/gi;
  const creditMatches = [...normalized.matchAll(repeatedCreditMatch)];

  if (creditMatches.length > 1 && typeof creditMatches[1].index === "number") {
    normalized = normalized.slice(0, creditMatches[1].index).trim();
  }

  const colonIndex = normalized.indexOf(":");
  if (colonIndex > 0 && colonIndex <= 90 && parseCourseCodes(normalized.slice(0, colonIndex)).length > 0) {
    normalized = normalized.slice(0, colonIndex).trim();
  }

  normalized = normalized
    .replace(/\s+(?:Introduction|Course\s+Title|Attribute)\b.*$/i, "")
    .trim();

  return normalized.length > maxNeededTextLength
    ? `${normalized.slice(0, maxNeededTextLength - 1).trim()}...`
    : normalized;
}

function formatMilestoneLabel(courseOptions: string[], neededText: string) {
  if (courseOptions.includes("UNIV 4AA0") || /\bUNIV\s*4AA0\b/i.test(neededText)) {
    return "UNIV 4AA0 graduation requirement";
  }

  if (courseOptions.includes("COMP 4810") || /\bCOMP\s*4810\b/i.test(neededText)) {
    return "COMP 4810 program assessment";
  }

  if (courseOptions.includes("ENGR 1100") || /\bENGR\s*1100\b/i.test(neededText)) {
    return "ENGR 1100 orientation milestone";
  }

  return "Graduation milestone requirement";
}

function dedupe(items: string[]) {
  return Array.from(new Set(items));
}
