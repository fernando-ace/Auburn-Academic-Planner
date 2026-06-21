import type { AiCertificateCheckResult, CourseRule } from "../rules/ai-certificate.ts";
import type { ComputerScienceDegreeCheckResult } from "../rules/computer-science-degree.ts";
import type { SoftwareEngineeringDegreeCheckResult } from "../rules/software-engineering-degree.ts";
import { getModeledMissingPrerequisites } from "../rules/software-engineering-prerequisites.ts";
import { attachCoursePlanningConstraints } from "./planning-constraints.ts";
import type { PlanningTargetPathInput } from "./target-path.ts";
import type {
  CurrentDegreeAuditAnalysis,
  CurrentDegreeAuditCourseStatusRecord,
  CurrentDegreeAuditRequirementBlock,
} from "./current-degree-audit-analysis.ts";
import type { DegreeWorksParserConfidence } from "./degreeworks-analysis.ts";
import { formatExternalCreditAwareCode } from "./external-credit-display.ts";

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
  source:
    | "still_needed"
    | "still_needed_options"
    | "incomplete_block"
    | "deterministic_gap";
  advisorVerificationRequired: true;
  availabilityConfidence?: string;
  availabilityNotes?: string[];
  planningNotes?: string[];
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
  targetPath:
    | "software_engineering"
    | "computer_science"
    | "ai_certificate"
    | "degreeworks_only"
    | "mixed_or_unclear";
  confidence: DegreeWorksParserConfidence;
  suggestedCourses: CurrentStateSuggestedCourse[];
  advisorMilestones: CurrentStateAdvisorMilestone[];
  verificationItems: CurrentStateVerificationItem[];
  notYetRecommended: { code: string; reason: string }[];
  advisorQuestions: string[];
  notes: string[];
};

type CurrentStateSuggestionCandidate = Omit<
  CurrentStateSuggestedCourse,
  | "advisorVerificationRequired"
  | "availabilityConfidence"
  | "availabilityNotes"
  | "planningNotes"
>;

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
      (code) => `${code} is preregistered; verify registration and completion timing before treating it as complete.`,
    ),
    ...audit.inProgressCourseCodes.map(
      (code) => `${code} appears in progress; verify final completion before using it as completed coursework.`,
    ),
    ...(audit.externalCreditRecords.length > 0
      ? audit.externalCreditRecords.map((record) =>
          record.satisfiesCourseCode
            ? `${record.displayName} appears to satisfy ${record.satisfiesCourseCode}; confirm applicability with an advisor.`
            : `${record.displayName} appears in AP or transfer evidence; confirm applicability with an advisor.`,
        )
      : audit.transferOrApCourseCodes.map(
          (code) => `${code} appears satisfied by AP or transfer evidence; confirm applicability with an advisor.`,
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
      "Which suggested courses are actually offered in the target term?",
      "Would the suggested set create a reasonable semester load?",
    ],
  };
}

export function buildCurrentStateNextSteps({
  audit,
  aiCertificateCheck,
  softwareEngineeringCheck,
  computerScienceCheck,
  targetPath,
}: {
  audit: CurrentDegreeAuditAnalysis;
  aiCertificateCheck: AiCertificateCheckResult;
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
  targetPath: PlanningTargetPathInput;
}): CurrentStateNextSteps {
  const resolvedTargetPath = resolveTargetPath({
    aiCertificateCheck,
    computerScienceCheck,
    softwareEngineeringCheck,
    targetPath,
  });
  const completed = new Set([
    ...audit.completedCourseCodes,
    ...audit.transferOrApCourseCodes,
  ]);
  const verifyInstead = new Map<string, CurrentStateVerificationItem>();
  const notYetRecommended: { code: string; reason: string }[] = [];

  for (const record of audit.courseStatusRecords) {
    const item = verificationItemForRecord({
      record,
      audit,
    });
    if (item) {
      verifyInstead.set(record.code, item);
    }
  }

  const stillNeededCandidates: CurrentStateSuggestionCandidate[] =
    audit.stillNeededItems.flatMap((item): CurrentStateSuggestionCandidate[] =>
      item.requirementType === "specific_course"
        ? item.courseOptions.map((code) => ({
            code,
            reason:
              "Degree Works lists this exact course in Still needed evidence.",
            priority: "high" as const,
            source: "still_needed" as const,
          }))
        : item.requirementType === "course_options" &&
            item.courseOptions.length > 0 &&
            item.courseOptions.length <= 3
          ? [
              {
                code: item.courseOptions.join(" or "),
                reason: `Degree Works lists an option set for ${item.requirementLabel}; ask an advisor which option fits this requirement.`,
                priority: "medium" as const,
                source: "still_needed_options" as const,
              },
            ]
          : [],
    );

  const candidateCourses: CurrentStateSuggestionCandidate[] = [
    ...stillNeededCandidates,
    ...(targetPath === "auto" || targetPath === "degreeworks_only"
      ? []
      : deterministicMissingCourses({
          aiCertificateCheck,
          computerScienceCheck,
          resolvedTargetPath,
          softwareEngineeringCheck,
        }).map((course) => ({
          code: course.code,
          title: course.title,
          reason:
            "The local deterministic requirement check still shows this course as a secondary gap.",
          priority: "medium" as const,
          source: "deterministic_gap" as const,
        }))),
  ];

  const suggestedCourses: CurrentStateSuggestedCourse[] = [];
  const seenSuggestions = new Set<string>();
  const advisorMilestones = audit.stillNeededItems
    .filter((item) => item.requirementType === "graduation_milestone")
    .map((item) => ({
      label: item.requirementLabel,
      reason: `${item.neededText} appears to be a Degree Works milestone or nonstandard requirement; verify timing and completion with an advisor.`,
    }));
  const stillNeededAdvisorReviewItems = audit.stillNeededItems
    .filter((item) =>
      ["credit_hours_from_list", "block_reference", "advisor_review"].includes(
        item.requirementType,
      ) ||
      (item.requirementType === "course_options" &&
        item.courseOptions.length > 3),
    )
    .map((item) =>
      item.requirementType === "credit_hours_from_list"
        ? `${item.requirementLabel} is a credit-hour option list; discuss approved options with an advisor instead of selecting one automatically.`
        : item.requirementType === "course_options"
          ? `${item.requirementLabel} has several Degree Works options; discuss the best option with an advisor instead of treating the full list as courses to take.`
        : `${item.requirementLabel} needs advisor review: ${item.neededText}`,
    );

  for (const candidate of candidateCourses) {
    if (seenSuggestions.has(candidate.code)) {
      continue;
    }
    seenSuggestions.add(candidate.code);

    const candidateOptions = candidate.code.includes(" or ")
      ? candidate.code.split(/\s+or\s+/i).map((code) => code.trim())
      : [candidate.code];

    if (candidateOptions.some((code) => completed.has(code))) {
      notYetRecommended.push({
        code: candidate.code,
        reason: `${candidate.code} includes a course that appears completed or AP/transfer-satisfied in the worksheet; verify applicability instead of adding it again.`,
      });
      continue;
    }

    const verificationMatch = candidateOptions.find((code) => verifyInstead.has(code));
    if (verificationMatch) {
      notYetRecommended.push({
        code: candidate.code,
        reason: `${verificationMatch} appears ${formatVerificationStatus(
          verifyInstead.get(verificationMatch)?.status,
        )}; verify registration/completion or applicability instead of adding it as a new suggestion.`,
      });
      continue;
    }

    const missingPrerequisites =
      candidate.source === "still_needed_options"
        ? []
        : getModeledMissingPrerequisites(
            candidate.code,
            audit.currentApplicableCourseCodes,
          );

    if (missingPrerequisites.length > 0) {
      notYetRecommended.push({
        code: candidate.code,
        reason: `${candidate.code} should wait until modeled prerequisite(s) ${missingPrerequisites.join(
          ", ",
        )} are completed or verified by an advisor.`,
      });
      continue;
    }

    suggestedCourses.push(enrichSuggestion(candidate));
  }

  return {
    targetPath: resolvedTargetPath,
    confidence: audit.confidence,
    suggestedCourses: suggestedCourses.slice(0, maxSuggestedCourses),
    advisorMilestones: dedupeMilestones(advisorMilestones),
    verificationItems: Array.from(verifyInstead.values()).slice(0, 12),
    notYetRecommended: dedupeByCode(notYetRecommended),
    advisorQuestions: [
      "Which Still needed courses should I prioritize next semester?",
      "Which Degree Works option-list or elective requirements should I discuss before choosing a course?",
      "Should preregistered courses be treated as already handled for registration planning?",
      "Do AP, transfer, or Fall Through courses change the remaining requirement list?",
      "Do these suggested courses satisfy prerequisites and catalog rules for my official program?",
      "Would this be a reasonable semester load with labs, work, and other commitments?",
    ],
    notes: [
      "These are current-progress discussion items, not registration advice or an official graduation plan.",
      "Completed and AP/transfer-satisfied courses are not suggested again.",
      "Degree Works option lists are shown for advisor discussion instead of choosing one automatically.",
      "Preregistered and in-progress courses are listed for verification instead of new recommendations.",
      "Course availability, prerequisites, substitutions, exceptions, and advisor approval may change these suggestions.",
      ...dedupe(stillNeededAdvisorReviewItems).slice(0, 5),
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
    "This is a current-progress preparation summary, not an official degree audit; advisor verification is required.",
    `Worksheet parser confidence: ${audit.confidence}`,
    `Degree status: ${audit.degreeStatus ?? "unknown"}`,
    formatCreditSummary(audit),
  ];

  if (audit.externalCreditRecords.length > 0) {
    lines.push(
      "AP/transfer credits were detected and should be verified in Degree Works with an advisor.",
    );

    if (audit.externalCreditRecords.length <= 3) {
      lines.push(
        "",
        "AP/transfer credits to verify:",
        ...audit.externalCreditRecords.map((record) =>
          record.satisfiesCourseCode
            ? `- ${record.displayName}: verify ${record.satisfiesCourseCode}`
            : `- ${record.displayName}: verify applicability`,
        ),
      );
    }
  }

  if (audit.stillNeededCourseCodes.length > 0) {
    lines.push(
      "",
      "Still needed courses to discuss:",
      ...audit.stillNeededCourseCodes.slice(0, 8).map((code) => `- ${code}`),
    );
  }

  if (audit.stillNeededItems.some((item) => item.courseOptions.length > 1)) {
    lines.push(
      "",
      "Still needed option sets to discuss:",
      ...audit.stillNeededItems
        .filter((item) => item.courseOptions.length > 1)
        .slice(0, 5)
        .map((item) => `- ${item.requirementLabel}: ${item.neededText}`),
    );
  }

  if (nextSteps.suggestedCourses.length > 0) {
    lines.push(
      "",
      "Current-progress next-semester discussion items:",
      ...nextSteps.suggestedCourses
        .slice(0, 5)
        .map((course) => `- ${course.code}: ${course.reason}`),
    );
  }

  if (nextSteps.advisorMilestones.length > 0) {
    lines.push(
      "",
      "Milestones to verify:",
      ...nextSteps.advisorMilestones.slice(0, 5).map((item) => `- ${item.reason}`),
    );
  }

  if (nextSteps.verificationItems.length > 0) {
    lines.push(
      "",
      "Courses to verify:",
      ...nextSteps.verificationItems.slice(0, 6).map((item) => `- ${item.reason}`),
    );
  }

  lines.push(
    "",
    "Questions to ask an advisor:",
    ...dedupe([
      ...gapReport.advisorQuestions,
      ...nextSteps.advisorQuestions,
    ])
      .slice(0, 8)
      .map((question) => `- ${question}`),
  );

  return lines.join("\n");
}

function resolveTargetPath({
  aiCertificateCheck,
  computerScienceCheck,
  softwareEngineeringCheck,
  targetPath,
}: {
  aiCertificateCheck: AiCertificateCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
  targetPath: PlanningTargetPathInput;
}): CurrentStateNextSteps["targetPath"] {
  if (targetPath !== "auto") {
    return targetPath;
  }

  const scores = [
    {
      path: "software_engineering" as const,
      score: softwareEngineeringCheck.exactRequiredCoursesMissing.length,
    },
    {
      path: "computer_science" as const,
      score: computerScienceCheck.exactRequiredCoursesMissing.length,
    },
    {
      path: "ai_certificate" as const,
      score: aiCertificateCheck.requiredCoursesMissing.length,
    },
  ].sort((left, right) => right.score - left.score);

  return scores[0].score === 0 || scores[0].score === scores[1].score
    ? "mixed_or_unclear"
    : scores[0].path;
}

function deterministicMissingCourses({
  aiCertificateCheck,
  computerScienceCheck,
  resolvedTargetPath,
  softwareEngineeringCheck,
}: {
  aiCertificateCheck: AiCertificateCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
  resolvedTargetPath: CurrentStateNextSteps["targetPath"];
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
}) {
  const courses: CourseRule[] = [];

  if (resolvedTargetPath === "ai_certificate" || resolvedTargetPath === "mixed_or_unclear") {
    courses.push(...aiCertificateCheck.requiredCoursesMissing);
  }

  if (resolvedTargetPath === "software_engineering" || resolvedTargetPath === "mixed_or_unclear") {
    courses.push(...softwareEngineeringCheck.exactRequiredCoursesMissing);
  }

  if (resolvedTargetPath === "computer_science" || resolvedTargetPath === "mixed_or_unclear") {
    courses.push(...computerScienceCheck.exactRequiredCoursesMissing);
  }

  return courses;
}

function enrichSuggestion(
  suggestion: CurrentStateSuggestionCandidate,
): CurrentStateSuggestedCourse {
  const constraints = attachCoursePlanningConstraints(suggestion.code, "Next Semester");

  return {
    ...suggestion,
    title: suggestion.title ?? constraints.metadata?.title,
    advisorVerificationRequired: true,
    availabilityConfidence: constraints.availabilityConfidence,
    availabilityNotes: constraints.availabilityNotes,
    planningNotes: constraints.metadata?.planningNotes ?? [],
  };
}

function verificationItemForRecord({
  record,
  audit,
}: {
  record: CurrentDegreeAuditCourseStatusRecord;
  audit: CurrentDegreeAuditAnalysis;
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

  const displayCode = formatExternalCreditAwareCode({
    code: record.code,
    externalCreditRecords: audit.externalCreditRecords,
  });

  return {
    code: record.code,
    status: record.status as CurrentStateVerificationItem["status"],
    reason:
      record.status === "preregistered"
        ? `${displayCode} is preregistered; verify registration/completion before adding it again.`
        : record.status === "in_progress"
          ? `${displayCode} appears in progress; verify final completion timing.`
          : record.status === "transfer_or_ap"
            ? `${displayCode} appears satisfied by AP or transfer evidence; verify applicability.`
            : record.status === "non_degree_applicable"
              ? `${displayCode} appears non-degree-applicable or in Fall Through evidence; ask whether it can apply.`
              : `${displayCode} has unknown worksheet status; verify it against Degree Works.`,
  };
}

function formatVerificationStatus(
  status: CurrentStateVerificationItem["status"] | undefined,
) {
  switch (status) {
    case "preregistered":
      return "preregistered";
    case "in_progress":
      return "in progress";
    case "transfer_or_ap":
      return "AP/transfer-satisfied";
    case "non_degree_applicable":
      return "non-degree-applicable";
    case "unknown":
    default:
      return "unclear";
  }
}

function formatCreditSummary(audit: CurrentDegreeAuditAnalysis) {
  const required = audit.creditsRequired ?? "unknown";
  const applied = audit.creditsApplied ?? "unknown";
  const needed = audit.creditsNeeded ?? "unknown";

  return `Credits required/applied/needed: ${required}/${applied}/${needed}.`;
}

function dedupe(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function dedupeByCode(items: { code: string; reason: string }[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.code)) {
      return false;
    }
    seen.add(item.code);
    return true;
  });
}

function dedupeMilestones(items: CurrentStateAdvisorMilestone[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.label)) {
      return false;
    }
    seen.add(item.label);
    return true;
  });
}
