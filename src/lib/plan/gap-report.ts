import type { AiCertificateCheckResult, CourseRule } from "../rules/ai-certificate.ts";
import type { ComputerScienceDegreeCheckResult } from "../rules/computer-science-degree.ts";
import type { SoftwareEngineeringDegreeCheckResult } from "../rules/software-engineering-degree.ts";
import type { SoftwareEngineeringPrerequisiteCheckResult } from "../rules/software-engineering-prerequisites.ts";
import type {
  DegreeWorksDetectedSignals,
  DegreeWorksParserConfidence,
} from "./degreeworks-analysis.ts";

export type GapReportStatus =
  | "strong_progress"
  | "needs_review"
  | "missing_requirements"
  | "insufficient_data";

export type GapReportBestFitPath =
  | "ai_certificate"
  | "software_engineering"
  | "computer_science"
  | "mixed_or_unclear";

export type GapReportMissingRequirement = {
  area: string;
  items: string[];
  severity: "info" | "warning" | "advisor_review";
};

export type GapReport = {
  overallStatus: GapReportStatus;
  bestFitPath: GapReportBestFitPath;
  summaryBullets: string[];
  satisfiedHighlights: string[];
  missingRequirements: GapReportMissingRequirement[];
  advisorReviewItems: string[];
  nextActions: string[];
  advisorQuestions: string[];
};

export function buildGapReport({
  aiCertificateCheck,
  softwareEngineeringCheck,
  computerScienceCheck,
  detectedSignals,
  parserWarnings,
  parserConfidence,
  prerequisiteCheck,
}: {
  aiCertificateCheck: AiCertificateCheckResult;
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
  detectedSignals: DegreeWorksDetectedSignals;
  parserWarnings: string[];
  parserConfidence: DegreeWorksParserConfidence;
  prerequisiteCheck: SoftwareEngineeringPrerequisiteCheckResult;
}): GapReport {
  const missingRequirements = buildMissingRequirements({
    aiCertificateCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
  });
  const advisorReviewItems = buildAdvisorReviewItems({
    detectedSignals,
    parserWarnings,
    prerequisiteCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
  });
  const overallStatus = getOverallStatus({
    parserConfidence,
    missingRequirements,
    advisorReviewItems,
  });
  const bestFitPath = getBestFitPath({
    aiCertificateCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
    parserConfidence,
  });
  const satisfiedHighlights = buildSatisfiedHighlights({
    aiCertificateCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
  });
  const summaryBullets = buildSummaryBullets({
    overallStatus,
    bestFitPath,
    aiCertificateCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
    parserConfidence,
    missingRequirements,
    advisorReviewItems,
  });

  return {
    overallStatus,
    bestFitPath,
    summaryBullets,
    satisfiedHighlights,
    missingRequirements,
    advisorReviewItems,
    nextActions: buildNextActions({
      overallStatus,
      bestFitPath,
      missingRequirements,
      advisorReviewItems,
    }),
    advisorQuestions: buildAdvisorQuestions({
      detectedSignals,
      missingRequirements,
      prerequisiteCheck,
    }),
  };
}

function buildMissingRequirements({
  aiCertificateCheck,
  softwareEngineeringCheck,
  computerScienceCheck,
}: {
  aiCertificateCheck: AiCertificateCheckResult;
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
}) {
  const missingRequirements: GapReportMissingRequirement[] = [];

  if (aiCertificateCheck.requiredCoursesMissing.length > 0) {
    missingRequirements.push({
      area: "AI Engineering Certificate",
      items: capCourseItems(aiCertificateCheck.requiredCoursesMissing),
      severity: "warning",
    });
  }

  if (aiCertificateCheck.electiveCandidatesFound.length === 0) {
    missingRequirements.push({
      area: "AI Engineering Certificate elective",
      items: ["No planned AI elective candidate was found."],
      severity: "advisor_review",
    });
  }

  addDegreeMissingRequirements(missingRequirements, {
    area: "Software Engineering",
    result: softwareEngineeringCheck,
  });
  addDegreeMissingRequirements(missingRequirements, {
    area: "Computer Science",
    result: computerScienceCheck,
  });

  return missingRequirements;
}

function addDegreeMissingRequirements(
  missingRequirements: GapReportMissingRequirement[],
  {
    area,
    result,
  }: {
    area: string;
    result: SoftwareEngineeringDegreeCheckResult | ComputerScienceDegreeCheckResult;
  },
) {
  if (result.exactRequiredCoursesMissing.length > 0) {
    missingRequirements.push({
      area,
      items: capCourseItems(result.exactRequiredCoursesMissing),
      severity: "warning",
    });
  }

  const unsatisfiedGroups = result.alternativeCourseGroups.filter(
    (group) => !group.isSatisfied,
  );

  if (unsatisfiedGroups.length > 0) {
    missingRequirements.push({
      area: `${area} course groups`,
      items: capTextItems(unsatisfiedGroups.map((group) => group.name)),
      severity: "advisor_review",
    });
  }

  if (result.hasEnoughTotalCredits !== true) {
    missingRequirements.push({
      area: `${area} total credits`,
      items: [
        result.hasEnoughTotalCredits === null
          ? "Total planned credits were not provided."
          : `Total planned credits are below the ${result.totalHoursRequired}-credit requirement.`,
      ],
      severity: "advisor_review",
    });
  }
}

function getOverallStatus({
  parserConfidence,
  missingRequirements,
  advisorReviewItems,
}: {
  parserConfidence: DegreeWorksParserConfidence;
  missingRequirements: GapReportMissingRequirement[];
  advisorReviewItems: string[];
}): GapReportStatus {
  if (parserConfidence === "low") {
    return "insufficient_data";
  }

  if (
    missingRequirements.some(
      (requirement) => requirement.severity === "warning",
    )
  ) {
    return "missing_requirements";
  }

  if (missingRequirements.length > 0 || advisorReviewItems.length > 0) {
    return "needs_review";
  }

  return "strong_progress";
}

function getBestFitPath({
  aiCertificateCheck,
  softwareEngineeringCheck,
  computerScienceCheck,
  parserConfidence,
}: {
  aiCertificateCheck: AiCertificateCheckResult;
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
  parserConfidence: DegreeWorksParserConfidence;
}): GapReportBestFitPath {
  if (parserConfidence === "low") {
    return "mixed_or_unclear";
  }

  if (aiCertificateCheck.isLikelyComplete) {
    return "ai_certificate";
  }

  if (softwareEngineeringCheck.isLikelyComplete) {
    return "software_engineering";
  }

  if (computerScienceCheck.isLikelyComplete) {
    return "computer_science";
  }

  const scores = [
    {
      path: "ai_certificate" as const,
      score: scoreAiCertificate(aiCertificateCheck),
    },
    {
      path: "software_engineering" as const,
      score: scoreDegree(softwareEngineeringCheck),
    },
    {
      path: "computer_science" as const,
      score: scoreDegree(computerScienceCheck),
    },
  ].sort((left, right) => right.score - left.score);

  return scores[0].score - scores[1].score <= 1
    ? "mixed_or_unclear"
    : scores[0].path;
}

function scoreAiCertificate(result: AiCertificateCheckResult) {
  return (
    result.requiredCoursesSatisfied.length * 2 +
    result.electiveCandidatesFound.length * 2 -
    result.requiredCoursesMissing.length * 3
  );
}

function scoreDegree(
  result: SoftwareEngineeringDegreeCheckResult | ComputerScienceDegreeCheckResult,
) {
  const satisfiedGroups = result.alternativeCourseGroups.filter(
    (group) => group.isSatisfied,
  ).length;
  const creditScore =
    result.hasEnoughTotalCredits === true
      ? 2
      : result.hasEnoughTotalCredits === null
        ? 0
        : -2;

  return (
    result.exactRequiredCoursesSatisfied.length * 2 +
    satisfiedGroups * 2 +
    creditScore -
    result.exactRequiredCoursesMissing.length * 3
  );
}

function buildSatisfiedHighlights({
  aiCertificateCheck,
  softwareEngineeringCheck,
  computerScienceCheck,
}: {
  aiCertificateCheck: AiCertificateCheckResult;
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
}) {
  const highlights: string[] = [];

  if (aiCertificateCheck.isLikelyComplete) {
    highlights.push(
      "AI Engineering certificate looks likely complete, pending advisor verification.",
    );
  } else if (aiCertificateCheck.requiredCoursesMissing.length === 0) {
    highlights.push("All required AI Engineering certificate courses were found.");
  }

  if (softwareEngineeringCheck.hasEnoughTotalCredits) {
    highlights.push(
      "Software Engineering total planned credits meet the modeled 122-credit threshold.",
    );
  }

  if (computerScienceCheck.hasEnoughTotalCredits) {
    highlights.push(
      "Computer Science total planned credits meet the modeled 122-credit threshold.",
    );
  }

  return highlights.length > 0
    ? highlights
    : ["Some planned coursework was matched against the local deterministic rules."];
}

function buildSummaryBullets({
  overallStatus,
  bestFitPath,
  aiCertificateCheck,
  softwareEngineeringCheck,
  computerScienceCheck,
  parserConfidence,
  missingRequirements,
  advisorReviewItems,
}: {
  overallStatus: GapReportStatus;
  bestFitPath: GapReportBestFitPath;
  aiCertificateCheck: AiCertificateCheckResult;
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
  parserConfidence: DegreeWorksParserConfidence;
  missingRequirements: GapReportMissingRequirement[];
  advisorReviewItems: string[];
}) {
  if (overallStatus === "insufficient_data") {
    return [
      "The PDF parser had low confidence, so this report should be treated as incomplete.",
      "Use the detailed parsed courses and advisor review items to confirm what Degree Works actually shows.",
    ];
  }

  return [
    `Closest modeled path: ${formatBestFitPath(bestFitPath)}.`,
    aiCertificateCheck.isLikelyComplete
      ? "The AI Engineering certificate appears likely complete in the uploaded plan."
      : "The AI Engineering certificate still needs course or elective review.",
    `Software Engineering has ${softwareEngineeringCheck.exactRequiredCoursesMissing.length} exact required course(s) missing in the local model.`,
    `Computer Science has ${computerScienceCheck.exactRequiredCoursesMissing.length} exact required course(s) missing in the local model.`,
    missingRequirements.length === 0 && advisorReviewItems.length === 0
      ? "No modeled gaps were found, but advisor verification is still required."
      : `${missingRequirements.length} modeled gap area(s) and ${advisorReviewItems.length} advisor-review item(s) need attention.`,
    `Parser confidence: ${parserConfidence}.`,
  ];
}

function buildAdvisorReviewItems({
  detectedSignals,
  parserWarnings,
  prerequisiteCheck,
  softwareEngineeringCheck,
  computerScienceCheck,
}: {
  detectedSignals: DegreeWorksDetectedSignals;
  parserWarnings: string[];
  prerequisiteCheck: SoftwareEngineeringPrerequisiteCheckResult;
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
}) {
  return dedupe([
    ...parserWarnings,
    ...buildSignalReviewItems(detectedSignals),
    ...prerequisiteCheck.prerequisiteIssues.map((issue) => issue.message),
    ...prerequisiteCheck.advisorReviewItems,
    ...softwareEngineeringCheck.advisorVerifiedRequirements.map(
      (requirement) =>
        `Software Engineering ${requirement.name} (${requirement.creditHoursRequired} credits) needs advisor or Degree Works verification.`,
    ),
    ...computerScienceCheck.advisorVerifiedRequirements.map(
      (requirement) =>
        `Computer Science ${requirement.name} (${requirement.creditHoursRequired} credits) needs advisor or Degree Works verification.`,
    ),
  ]).slice(0, 8);
}

function buildSignalReviewItems(detectedSignals: DegreeWorksDetectedSignals) {
  return [
    detectedSignals.hasApCreditSignal
      ? "AP, AICE, IB, or Advanced Placement credit may affect this check."
      : null,
    detectedSignals.hasTransferCreditSignal
      ? "Transfer credit may affect this check."
      : null,
    detectedSignals.hasInProgressSignal
      ? "In-progress or registered coursework may affect this check."
      : null,
    detectedSignals.hasSubstitutionSignal
      ? "Substitutions or petitions may affect this check."
      : null,
    detectedSignals.hasExceptionSignal
      ? "Exceptions, waivers, or petitions may affect this check."
      : null,
  ].filter((item): item is string => Boolean(item));
}

function buildNextActions({
  overallStatus,
  bestFitPath,
  missingRequirements,
  advisorReviewItems,
}: {
  overallStatus: GapReportStatus;
  bestFitPath: GapReportBestFitPath;
  missingRequirements: GapReportMissingRequirement[];
  advisorReviewItems: string[];
}) {
  const actions = [
    "Bring this report and the official Degree Works audit to an academic advisor.",
    `Ask whether the ${formatBestFitPath(bestFitPath)} path is the right planning target.`,
  ];

  if (overallStatus === "insufficient_data") {
    actions.push(
      "Re-upload a clearer Degree Works PDF or compare the parsed course list against the official audit.",
    );
  }

  if (missingRequirements.length > 0) {
    actions.push("Review the top missing requirements before choosing next-term courses.");
  }

  if (advisorReviewItems.length > 0) {
    actions.push("Confirm AP, transfer, substitutions, exceptions, electives, and prerequisites with an advisor.");
  }

  return dedupe(actions).slice(0, 5);
}

function buildAdvisorQuestions({
  detectedSignals,
  missingRequirements,
  prerequisiteCheck,
}: {
  detectedSignals: DegreeWorksDetectedSignals;
  missingRequirements: GapReportMissingRequirement[];
  prerequisiteCheck: SoftwareEngineeringPrerequisiteCheckResult;
}) {
  const questions = [
    "Which missing or unmatched requirements should I prioritize next?",
    "Which program or certificate path does this plan most closely support?",
    "Do any electives, substitutions, exceptions, or hidden Degree Works sections change this summary?",
  ];

  if (hasAdvisorSignals(detectedSignals)) {
    questions.push(
      "Can you verify whether AP, transfer, substitution, exception, or in-progress coursework changes this requirement check?",
    );
  }

  if (prerequisiteCheck.prerequisiteIssues.length > 0) {
    questions.push(
      "Can you verify that my planned course order satisfies prerequisites?",
    );
  }

  if (missingRequirements.some((requirement) => requirement.area.includes("total credits"))) {
    questions.push("Does my official Degree Works audit show enough credits for this path?");
  }

  return dedupe(questions).slice(0, 6);
}

function hasAdvisorSignals(detectedSignals: DegreeWorksDetectedSignals) {
  return (
    detectedSignals.hasApCreditSignal ||
    detectedSignals.hasTransferCreditSignal ||
    detectedSignals.hasInProgressSignal ||
    detectedSignals.hasSubstitutionSignal ||
    detectedSignals.hasExceptionSignal
  );
}

function capCourseItems(courses: CourseRule[]) {
  return capTextItems(courses.map((course) => `${course.code} - ${course.title}`));
}

function capTextItems(items: string[], limit = 5) {
  if (items.length <= limit) {
    return items;
  }

  return [...items.slice(0, limit), `and ${items.length - limit} more`];
}

function dedupe(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

export function formatBestFitPath(path: GapReportBestFitPath) {
  switch (path) {
    case "ai_certificate":
      return "AI Engineering certificate";
    case "software_engineering":
      return "Software Engineering";
    case "computer_science":
      return "Computer Science";
    case "mixed_or_unclear":
      return "mixed or unclear";
  }
}
