import type { AiCertificateCheckResult, CourseRule } from "../rules/ai-certificate.ts";
import type { ComputerScienceDegreeCheckResult } from "../rules/computer-science-degree.ts";
import type { RequirementBlockResult } from "../rules/requirement-blocks.ts";
import type { SoftwareEngineeringDegreeCheckResult } from "../rules/software-engineering-degree.ts";
import type { SoftwareEngineeringPrerequisiteCheckResult } from "../rules/software-engineering-prerequisites.ts";
import {
  groupRuleTrustNotes,
  type RuleTrustNotes,
} from "../rules/rule-provenance.ts";
import { coursePlanningMetadataProvenance } from "./course-planning-metadata.ts";
import type {
  DegreeWorksDetectedSignals,
  DegreeWorksParserConfidence,
} from "./degreeworks-analysis.ts";
import type {
  DegreeWorksCourseStatus,
  DegreeWorksCourseStatusRecord,
} from "./degreeworks-course-status.ts";
import type { PlanningTargetPathInput } from "./target-path.ts";

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
  trustNotes?: RuleTrustNotes;
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
  courseStatusRecords = [],
  draftSemesterPlanGenerated = false,
  targetPath = "auto",
}: {
  aiCertificateCheck: AiCertificateCheckResult;
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
  detectedSignals: DegreeWorksDetectedSignals;
  parserWarnings: string[];
  parserConfidence: DegreeWorksParserConfidence;
  prerequisiteCheck: SoftwareEngineeringPrerequisiteCheckResult;
  courseStatusRecords?: DegreeWorksCourseStatusRecord[];
  draftSemesterPlanGenerated?: boolean;
  targetPath?: PlanningTargetPathInput;
}): GapReport {
  const missingRequirements = buildMissingRequirements({
    aiCertificateCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
    courseStatusRecords,
    targetPath,
  });
  const advisorReviewItems = buildAdvisorReviewItems({
    detectedSignals,
    parserWarnings,
    prerequisiteCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
    courseStatusRecords,
    targetPath,
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
    targetPath,
  });
  const satisfiedHighlights = buildSatisfiedHighlights({
    aiCertificateCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
    targetPath,
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
    trustNotes: groupRuleTrustNotes([
      ...(targetPath === "auto" || targetPath === "ai_certificate"
        ? [aiCertificateCheck.provenance]
        : []),
      ...(targetPath === "auto" || targetPath === "software_engineering"
        ? [
            softwareEngineeringCheck.provenance,
            ...softwareEngineeringCheck.requirementBlocks.map(
              (block) => block.provenance,
            ),
          ]
        : []),
      ...(targetPath === "auto" || targetPath === "computer_science"
        ? [
            computerScienceCheck.provenance,
            ...computerScienceCheck.requirementBlocks.map(
              (block) => block.provenance,
            ),
          ]
        : []),
      prerequisiteCheck.provenance,
      coursePlanningMetadataProvenance,
    ]),
    nextActions: buildNextActions({
      overallStatus,
      bestFitPath,
      missingRequirements,
      advisorReviewItems,
      draftSemesterPlanGenerated,
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
  courseStatusRecords,
  targetPath,
}: {
  aiCertificateCheck: AiCertificateCheckResult;
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
  courseStatusRecords: DegreeWorksCourseStatusRecord[];
  targetPath: PlanningTargetPathInput;
}) {
  const missingRequirements: GapReportMissingRequirement[] = [];
  const courseStatuses = getCourseStatusMap(courseStatusRecords);

  if (
    (targetPath === "auto" || targetPath === "ai_certificate") &&
    aiCertificateCheck.requiredCoursesMissing.length > 0
  ) {
    missingRequirements.push({
      area: "AI Engineering Certificate",
      items: capCourseItems(aiCertificateCheck.requiredCoursesMissing, courseStatuses),
      severity: "warning",
    });
  }

  if (
    (targetPath === "auto" || targetPath === "ai_certificate") &&
    aiCertificateCheck.electiveCandidatesFound.length === 0
  ) {
    missingRequirements.push({
      area: "AI Engineering Certificate elective",
      items: ["No planned AI elective candidate was found."],
      severity: "advisor_review",
    });
  }

  if (targetPath === "auto" || targetPath === "software_engineering") {
    addDegreeMissingRequirements(missingRequirements, {
      area: "Software Engineering",
      result: softwareEngineeringCheck,
      courseStatuses,
    });
  }
  if (targetPath === "auto" || targetPath === "computer_science") {
    addDegreeMissingRequirements(missingRequirements, {
      area: "Computer Science",
      result: computerScienceCheck,
      courseStatuses,
    });
  }

  return missingRequirements;
}

function addDegreeMissingRequirements(
  missingRequirements: GapReportMissingRequirement[],
  {
    area,
    result,
    courseStatuses,
  }: {
    area: string;
    result: SoftwareEngineeringDegreeCheckResult | ComputerScienceDegreeCheckResult;
    courseStatuses: Map<string, DegreeWorksCourseStatusRecord>;
  },
) {
  if (result.exactRequiredCoursesMissing.length > 0) {
    missingRequirements.push({
      area,
      items: capCourseItems(result.exactRequiredCoursesMissing, courseStatuses),
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

  const unresolvedBlocks = result.requirementBlocks.filter(
    (block) => block.status !== "satisfied",
  );

  if (unresolvedBlocks.length > 0) {
    missingRequirements.push({
      area: `${area} requirement blocks`,
      items: capTextItems(unresolvedBlocks.map(formatRequirementBlockGapItem), 8),
      severity: unresolvedBlocks.some((block) => block.status === "missing")
        ? "warning"
        : "advisor_review",
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
  targetPath,
}: {
  aiCertificateCheck: AiCertificateCheckResult;
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
  parserConfidence: DegreeWorksParserConfidence;
  targetPath: PlanningTargetPathInput;
}): GapReportBestFitPath {
  if (targetPath !== "auto") {
    return targetPath;
  }

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
  targetPath,
}: {
  aiCertificateCheck: AiCertificateCheckResult;
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
  targetPath: PlanningTargetPathInput;
}) {
  const highlights: string[] = [];

  if (
    (targetPath === "auto" || targetPath === "ai_certificate") &&
    aiCertificateCheck.isLikelyComplete
  ) {
    highlights.push(
      "AI Engineering certificate looks likely complete, pending advisor verification.",
    );
  } else if (
    (targetPath === "auto" || targetPath === "ai_certificate") &&
    aiCertificateCheck.requiredCoursesMissing.length === 0
  ) {
    highlights.push("All required AI Engineering certificate courses were found.");
  }

  if (
    (targetPath === "auto" || targetPath === "software_engineering") &&
    softwareEngineeringCheck.hasEnoughTotalCredits
  ) {
    highlights.push(
      "Software Engineering total planned credits meet the modeled 122-credit threshold.",
    );
  }

  if (
    (targetPath === "auto" || targetPath === "computer_science") &&
    computerScienceCheck.hasEnoughTotalCredits
  ) {
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

  const pathProgress =
    bestFitPath === "ai_certificate"
      ? aiCertificateCheck.isLikelyComplete
        ? "The AI Engineering certificate appears likely complete in the uploaded plan."
        : "The AI Engineering certificate still needs course or elective review."
      : bestFitPath === "software_engineering"
        ? `Software Engineering has ${softwareEngineeringCheck.exactRequiredCoursesMissing.length} exact required course(s) missing in the local model.`
        : bestFitPath === "computer_science"
          ? `Computer Science has ${computerScienceCheck.exactRequiredCoursesMissing.length} exact required course(s) missing in the local model.`
          : "The automatic target remains mixed or unclear, so the report includes all modeled paths.";

  return [
    `Closest modeled path: ${formatBestFitPath(bestFitPath)}.`,
    pathProgress,
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
  courseStatusRecords,
  targetPath,
}: {
  detectedSignals: DegreeWorksDetectedSignals;
  parserWarnings: string[];
  prerequisiteCheck: SoftwareEngineeringPrerequisiteCheckResult;
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
  courseStatusRecords: DegreeWorksCourseStatusRecord[];
  targetPath: PlanningTargetPathInput;
}) {
  return dedupe([
    ...parserWarnings,
    ...buildSignalReviewItems(detectedSignals),
    ...buildCourseStatusReviewItems(courseStatusRecords),
    ...prerequisiteCheck.prerequisiteIssues.map((issue) => issue.message),
    ...prerequisiteCheck.advisorReviewItems,
    ...(targetPath === "auto" || targetPath === "software_engineering"
      ? softwareEngineeringCheck.requirementBlocks
      .filter((block) => block.status !== "satisfied")
      .map(
        (block) =>
          `Software Engineering ${block.blockName} needs advisor or Degree Works verification (${formatRequirementBlockStatus(
            block,
          )}).`,
      )
      : []),
    ...(targetPath === "auto" || targetPath === "computer_science"
      ? computerScienceCheck.requirementBlocks
      .filter((block) => block.status !== "satisfied")
      .map(
        (block) =>
          `Computer Science ${block.blockName} needs advisor or Degree Works verification (${formatRequirementBlockStatus(
            block,
          )}).`,
      )
      : []),
  ]).slice(0, 10);
}

function buildCourseStatusReviewItems(
  courseStatusRecords: DegreeWorksCourseStatusRecord[],
) {
  const items = courseStatusRecords
    .filter((record) =>
      ["planned", "in_progress", "transfer_or_ap", "substituted_or_waived"].includes(
        record.status,
      ),
    )
    .map((record) => {
      if (record.status === "planned" || record.status === "in_progress") {
        return `${record.code} was found as ${formatCourseStatus(record.status)} and should be verified before treating it as completed.`;
      }

      return `${record.code} was found with ${formatCourseStatus(record.status)} status evidence and needs advisor verification.`;
    });

  return capTextItems(dedupe(items), 5);
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

function formatRequirementBlockGapItem(block: RequirementBlockResult) {
  const credits =
    typeof block.requiredCredits === "number"
      ? `, ${block.matchedCredits ?? 0}/${block.requiredCredits} modeled credits`
      : "";
  const candidates =
    block.candidateCourses.length > 0
      ? `; candidates found: ${block.candidateCourses.join(", ")}`
      : "";

  return `${block.blockName}: ${block.status}${credits}${candidates}`;
}

function formatRequirementBlockStatus(block: RequirementBlockResult) {
  const credits =
    typeof block.requiredCredits === "number"
      ? `, ${block.matchedCredits ?? 0}/${block.requiredCredits} modeled credits`
      : "";
  const candidates =
    block.candidateCourses.length > 0
      ? `, candidates: ${block.candidateCourses.join(", ")}`
      : "";

  return `${block.status}${credits}${candidates}`;
}

function hasUnresolvedRequirementBlocks(
  missingRequirements: GapReportMissingRequirement[],
) {
  return missingRequirements.some((requirement) =>
    requirement.area.includes("requirement blocks"),
  );
}

function buildNextActions({
  overallStatus,
  bestFitPath,
  missingRequirements,
  advisorReviewItems,
  draftSemesterPlanGenerated,
}: {
  overallStatus: GapReportStatus;
  bestFitPath: GapReportBestFitPath;
  missingRequirements: GapReportMissingRequirement[];
  advisorReviewItems: string[];
  draftSemesterPlanGenerated: boolean;
}) {
  const actions = [
    "Bring this report and the official Degree Works audit to an academic advisor.",
    `Ask whether the ${formatBestFitPath(bestFitPath)} path is the right planning target.`,
  ];

  if (draftSemesterPlanGenerated) {
    actions.push("Review the draft semester plan with an academic advisor.");
  }

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

  if (hasUnresolvedRequirementBlocks(missingRequirements)) {
    questions.push(
      "Which unresolved core, math elective, technical elective, or free elective blocks does Degree Works already mark complete?",
    );
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

function capCourseItems(
  courses: CourseRule[],
  courseStatuses?: Map<string, DegreeWorksCourseStatusRecord>,
) {
  return capTextItems(
    courses.map((course) => {
      const statusRecord = courseStatuses?.get(course.code);

      if (
        statusRecord &&
        statusRecord.status !== "missing" &&
        statusRecord.status !== "unknown"
      ) {
        return `${course.code} - ${course.title} was found as ${formatCourseStatus(
          statusRecord.status,
        )}; verify completion or applicability with an advisor.`;
      }

      return `${course.code} - ${course.title}`;
    }),
  );
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

function getCourseStatusMap(records: DegreeWorksCourseStatusRecord[]) {
  return new Map(records.map((record) => [record.code, record]));
}

function formatCourseStatus(status: DegreeWorksCourseStatus) {
  switch (status) {
    case "completed":
      return "completed";
    case "in_progress":
      return "in progress";
    case "planned":
      return "planned";
    case "transfer_or_ap":
      return "transfer/AP";
    case "substituted_or_waived":
      return "substituted/waived";
    case "missing":
      return "missing";
    case "unknown":
      return "unknown";
  }
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
