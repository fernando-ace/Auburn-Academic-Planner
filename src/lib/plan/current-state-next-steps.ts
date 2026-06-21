import type {
  CurrentDegreeAuditAnalysis,
  CurrentDegreeAuditCourseStatusRecord,
  CurrentDegreeAuditRequirementBlock,
} from "./current-degree-audit-analysis.ts";
import type { DegreeWorksParserConfidence } from "./degreeworks-analysis.ts";
import { formatExternalCreditAwareCode } from "./external-credit-display.ts";
import { formatStillNeededItemForDisplay } from "./degreeworks-still-needed.ts";

export type CurrentStateGapReport = {
  overallStatus:
    | "strong_progress"
    | "needs_review"
    | "missing_requirements"
    | "insufficient_data";
  summaryBullets: string[];
  incompleteBlocks: CurrentDegreeAuditRequirementBlock[];
  stillNeededCourseCodes: string[];
  advisorReviewItems: string[];
  nextActions: string[];
  advisorQuestions: string[];
};

export type CurrentStateSuggestedCourse = {
  code: string;
  title?: string;
  reason: string;
  priority: "high" | "medium" | "low";
  source: "still_needed" | "still_needed_options" | "incomplete_block";
  advisorVerificationRequired: true;
};

export type CurrentStateVerificationItem = {
  code: string;
  status:
    | "preregistered"
    | "in_progress"
    | "transfer_or_ap"
    | "non_degree_applicable"
    | "unknown";
  reason: string;
};

export type CurrentStateAdvisorMilestone = {
  label: string;
  reason: string;
};

export type CurrentStateNextSteps = {
  targetPath: "degreeworks_native";
  confidence: DegreeWorksParserConfidence;
  suggestedCourses: CurrentStateSuggestedCourse[];
  advisorMilestones: CurrentStateAdvisorMilestone[];
  verificationItems: CurrentStateVerificationItem[];
  notYetRecommended: { code: string; reason: string }[];
  advisorQuestions: string[];
  notes: string[];
};

const maxSuggestedCourses = 5;

export function buildCurrentStateGapReport({
  audit,
}: {
  audit: CurrentDegreeAuditAnalysis;
}): CurrentStateGapReport {
  const incompleteBlocks = audit.requirementBlocks.filter(
    (block) => block.status !== "complete",
  );
  const advisorReviewItems = [
    ...audit.parserWarnings,
    ...audit.preregisteredCourseCodes.map(
      (code) =>
        `${code} is preregistered; verify registration and completion timing before treating it as complete.`,
    ),
    ...audit.inProgressCourseCodes.map(
      (code) =>
        `${code} appears in progress; verify final completion before using it as completed coursework.`,
    ),
    ...(audit.externalCreditRecords.length > 0
      ? audit.externalCreditRecords.map((record) =>
          record.satisfiesCourseCode
            ? `${record.displayName} appears to satisfy ${record.satisfiesCourseCode}; confirm applicability with an advisor.`
            : `${record.displayName} appears in AP or transfer evidence; confirm applicability with an advisor.`,
        )
      : audit.transferOrApCourseCodes.map(
          (code) =>
            `${code} appears satisfied by AP or transfer evidence; confirm applicability with an advisor.`,
        )),
    ...audit.nonDegreeApplicableCourseCodes.map(
      (code) =>
        `${formatExternalCreditAwareCode({
          code,
          externalCreditRecords: audit.externalCreditRecords,
        })} appears in Fall Through or non-degree-applicable evidence; ask whether it can apply to a requirement.`,
    ),
  ];
  const overallStatus =
    audit.confidence === "low"
      ? "insufficient_data"
      : audit.stillNeededCourseCodes.length > 0 || incompleteBlocks.length > 0
        ? "missing_requirements"
        : advisorReviewItems.length > 0
          ? "needs_review"
          : "strong_progress";

  return {
    overallStatus,
    summaryBullets: [
      `Worksheet parser confidence: ${audit.confidence}.`,
      formatCreditSummary(audit),
      audit.degreeStatus === "incomplete"
        ? "Degree Works marks the audit incomplete; use Still needed lines and incomplete blocks for advisor discussion."
        : "Degree completion status could not be confirmed by the local parser; verify in Degree Works and with an advisor.",
      `${audit.stillNeededCourseCodes.length} still-needed course code(s) were detected.`,
    ],
    incompleteBlocks,
    stillNeededCourseCodes: audit.stillNeededCourseCodes,
    advisorReviewItems: dedupe(advisorReviewItems).slice(0, 12),
    nextActions: [
      "Bring this current-progress summary and the official Degree Works audit to an academic advisor.",
      "Review Still needed lines before choosing next-semester courses.",
      "Verify preregistered and in-progress courses before treating them as completed.",
      "Confirm AP, transfer, Fall Through, substitutions, exceptions, and advisor-approved alternatives.",
    ],
    advisorQuestions: [
      "Which Still needed courses or incomplete blocks should I prioritize next semester?",
      "Do my preregistered or in-progress courses change what I should take next?",
      "Do AP, transfer, or Fall Through courses satisfy any remaining requirements?",
      "Which courses are actually offered in the target term?",
      "Would the suggested set create a reasonable semester load?",
    ],
  };
}

export function buildCurrentStateNextSteps({
  audit,
}: {
  audit: CurrentDegreeAuditAnalysis;
}): CurrentStateNextSteps {
  const verifyInstead = new Map<string, CurrentStateVerificationItem>();
  const suggestedCourses: CurrentStateSuggestedCourse[] = [];
  const seenSuggestions = new Set<string>();

  for (const record of audit.courseStatusRecords) {
    const item = verificationItemForRecord({ record, audit });
    if (item) verifyInstead.set(record.code, item);
  }

  for (const item of audit.stillNeededItems) {
    if (suggestedCourses.length >= maxSuggestedCourses) break;

    if (item.requirementType === "specific_course") {
      for (const code of item.courseOptions) {
        if (suggestedCourses.length >= maxSuggestedCourses) break;
        if (seenSuggestions.has(code) || verifyInstead.has(code)) continue;

        seenSuggestions.add(code);
        suggestedCourses.push({
          code,
          reason: "Degree Works lists this exact course in Still needed evidence.",
          priority: "high",
          source: "still_needed",
          advisorVerificationRequired: true,
        });
      }
    } else if (
      item.requirementType === "course_options" &&
      item.courseOptions.length > 0 &&
      item.courseOptions.length <= 3
    ) {
      const code = item.courseOptions.join(" or ");
      if (!seenSuggestions.has(code)) {
        seenSuggestions.add(code);
        suggestedCourses.push({
          code,
          reason: `Degree Works lists an option set for ${item.requirementLabel}; ask an advisor which option fits this requirement.`,
          priority: "medium",
          source: "still_needed_options",
          advisorVerificationRequired: true,
        });
      }
    }
  }

  const advisorMilestones = audit.stillNeededItems
    .filter((item) => item.requirementType === "graduation_milestone")
    .map((item) => ({
      label: item.requirementLabel,
      reason: `${item.requirementLabel}: verify timing and completion with an advisor.`,
    }));
  const notYetRecommended = audit.stillNeededItems
    .filter((item) =>
      ["credit_hours_from_list", "block_reference", "advisor_review"].includes(
        item.requirementType,
      ),
    )
    .map((item) => ({
      code: formatStillNeededItemForDisplay(item),
      reason: "This Degree Works requirement needs advisor review before choosing a specific course.",
    }));

  return {
    targetPath: "degreeworks_native",
    confidence: audit.confidence,
    suggestedCourses,
    advisorMilestones,
    verificationItems: Array.from(verifyInstead.values()).slice(0, 12),
    notYetRecommended: notYetRecommended.slice(0, 12),
    advisorQuestions: [
      "Which Still needed items should I prioritize next?",
      "Do my preregistered, in-progress, AP, transfer, or Fall Through courses change this plan?",
      "Which course options satisfy the remaining Degree Works requirements?",
      "Are substitutions, exceptions, or advisor-approved alternatives missing from the PDF text?",
    ],
    notes: [
      "Suggestions come only from Degree Works Worksheet/Audit evidence.",
      "Requirements are not added beyond the uploaded Degree Works PDF.",
    ],
  };
}

export function buildCurrentProgressAdvisorSummary({
  audit,
  gapReport,
  nextSteps,
}: {
  audit: CurrentDegreeAuditAnalysis;
  gapReport: CurrentStateGapReport;
  nextSteps: CurrentStateNextSteps;
}) {
  const lines = [
    "Advisor Meeting Summary",
    "",
    "This is a preparation summary, not an official degree audit.",
    "",
    "Current progress:",
    `- Program detected from Degree Works: ${audit.detectedProgram.displayName}`,
    `- Parser confidence: ${audit.confidence}`,
    `- Credits: ${formatCreditSummary(audit)}`,
    `- Still-needed course codes detected: ${audit.stillNeededCourseCodes.length}`,
    "",
    "Top items to review:",
    ...gapReport.nextActions.slice(0, 4).map((item, index) => `${index + 1}. ${item}`),
  ];

  if (nextSteps.suggestedCourses.length > 0) {
    lines.push(
      "",
      "Courses to discuss with an advisor:",
      ...nextSteps.suggestedCourses.slice(0, 6).map((course) => `- ${course.code}`),
    );
  }

  lines.push(
    "",
    "Questions for my advisor:",
    ...gapReport.advisorQuestions.slice(0, 5).map((question) => `- ${question}`),
  );

  return lines.join("\n");
}

function verificationItemForRecord({
  audit,
  record,
}: {
  audit: CurrentDegreeAuditAnalysis;
  record: CurrentDegreeAuditCourseStatusRecord;
}): CurrentStateVerificationItem | null {
  if (
    ![
      "preregistered",
      "in_progress",
      "transfer_or_ap",
      "non_degree_applicable",
      "unknown",
    ].includes(record.status)
  ) {
    return null;
  }

  const label = formatExternalCreditAwareCode({
    code: record.code,
    externalCreditRecords: audit.externalCreditRecords,
  });

  return {
    code: label,
    status: record.status as CurrentStateVerificationItem["status"],
    reason: `${label} appears as ${record.status.replaceAll("_", " ")} in Degree Works evidence; verify before using it for planning decisions.`,
  };
}

function formatCreditSummary(audit: CurrentDegreeAuditAnalysis) {
  const applied = typeof audit.creditsApplied === "number" ? audit.creditsApplied : "unknown";
  const required = typeof audit.creditsRequired === "number" ? audit.creditsRequired : "unknown";
  const needed = typeof audit.creditsNeeded === "number" ? audit.creditsNeeded : "unknown";

  return `${applied} applied / ${required} required / ${needed} needed.`;
}

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}
