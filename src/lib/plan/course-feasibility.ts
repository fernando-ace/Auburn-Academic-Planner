import type { BulletinSamplePlanOrdering } from "./bulletin-sample-plan.ts";

export type GeneratedPathScheduleBasis =
  | "current_progress_term"
  | "bulletin_sample_order_hint"
  | "bulletin_sample_term_mismatch"
  | "degreeworks_credit_cap_only"
  | "advisor_review";

export type GeneratedPathFeasibilityItem = {
  kind:
    | "course"
    | "option"
    | "milestone"
    | "placeholder"
    | "registered"
    | "current";
  label: string;
  courseCodes: string[];
  locked?: boolean;
};

export type GeneratedPathScheduleAssessment = {
  label: string;
  basis: GeneratedPathScheduleBasis;
  samplePlanTerm: string | null;
  reason: string;
};

export type GeneratedTermFeasibility = {
  assessments: GeneratedPathScheduleAssessment[];
  warnings: string[];
};

export type GeneratedPathFeasibilitySummary = {
  degreeWorksGrounding: "checked";
  creditCaps: "checked";
  bulletinSequence:
    | "catalog_matched_hint"
    | "unconfirmed_catalog_hint"
    | "not_available";
  prerequisitesAndCorequisites: "not_checked";
  courseOfferings: "not_checked";
  seatAvailability: "not_checked";
};

export function summarizeGeneratedPathFeasibility({
  auditCatalogYear,
  ordering,
}: {
  auditCatalogYear?: string | null;
  ordering: BulletinSamplePlanOrdering | null;
}): GeneratedPathFeasibilitySummary {
  return {
    degreeWorksGrounding: "checked",
    creditCaps: "checked",
    bulletinSequence: !ordering
      ? "not_available"
      : catalogYearsMatch(auditCatalogYear, ordering.catalogYear)
        ? "catalog_matched_hint"
        : "unconfirmed_catalog_hint",
    prerequisitesAndCorequisites: "not_checked",
    courseOfferings: "not_checked",
    seatAvailability: "not_checked",
  };
}

/**
 * Classifies the evidence behind a generated term without treating Bulletin
 * sample-plan pages as prerequisite or course-offering rules.
 */
export function classifyGeneratedTermFeasibility({
  auditCatalogYear,
  items,
  ordering,
  termLabel,
}: {
  auditCatalogYear?: string | null;
  items: GeneratedPathFeasibilityItem[];
  ordering: BulletinSamplePlanOrdering | null;
  termLabel: string;
}): GeneratedTermFeasibility {
  const assessments = items.map((item) =>
    classifyItem({ item, ordering, termLabel }),
  );
  const warnings: string[] = [];
  const mismatches = assessments.filter(
    (assessment) => assessment.basis === "bulletin_sample_term_mismatch",
  );
  const creditCapOnly = assessments.filter(
    (assessment) => assessment.basis === "degreeworks_credit_cap_only",
  );
  const advisorReview = assessments.filter(
    (assessment) => assessment.basis === "advisor_review",
  );
  const samplePlanAssessments = assessments.filter((assessment) =>
    assessment.basis.startsWith("bulletin_sample_"),
  );

  if (mismatches.length > 0) {
    const mismatchLabels = mismatches
      .map(
        (assessment) =>
          `${assessment.label} (${assessment.samplePlanTerm ?? "sample term unknown"})`,
      )
      .join(", ");
    warnings.push(
      `${mismatchLabels} ${verbForCount(mismatches.length, "appears", "appear")} in a different season in the matched Bulletin sample plan but ${verbForCount(mismatches.length, "is", "are")} drafted for ${termLabel}. This is a sequence mismatch to review, not proof that a course is unavailable.`,
    );
  }

  if (creditCapOnly.length > 0) {
    warnings.push(
      `${joinLabels(creditCapOnly)} ${verbForCount(creditCapOnly.length, "is", "are")} placed from Degree Works Still needed order and the selected credit cap only; no checked-in course sequence, prerequisite, or offering evidence was applied.`,
    );
  }

  if (advisorReview.length > 0) {
    warnings.push(
      `${joinLabels(advisorReview)} ${verbForCount(advisorReview.length, "is", "are")} an advisor-choice option, milestone, or placeholder; course-level schedule feasibility is not verified.`,
    );
  }

  if (
    samplePlanAssessments.length > 0 &&
    !catalogYearsMatch(auditCatalogYear, ordering?.catalogYear)
  ) {
    warnings.push(
      "The Bulletin sample-plan catalog year could not be confirmed against Current Progress, so its sequence is an unverified planning hint.",
    );
  }

  return {
    assessments,
    warnings: Array.from(new Set(warnings)),
  };
}

function classifyItem({
  item,
  ordering,
  termLabel,
}: {
  item: GeneratedPathFeasibilityItem;
  ordering: BulletinSamplePlanOrdering | null;
  termLabel: string;
}): GeneratedPathScheduleAssessment {
  if (item.locked || item.kind === "registered" || item.kind === "current") {
    return {
      label: item.label,
      basis: "current_progress_term",
      samplePlanTerm: null,
      reason:
        "Current Progress places this preregistered or in-progress course in the displayed term.",
    };
  }

  if (
    item.kind === "option" ||
    item.kind === "milestone" ||
    item.kind === "placeholder"
  ) {
    return {
      label: item.label,
      basis: "advisor_review",
      samplePlanTerm: null,
      reason:
        "The generated path selected or reserved this item from a Degree Works choice that still requires advisor review.",
    };
  }

  const courseCode = normalizeCourseCode(item.courseCodes[0] ?? "");
  const samplePlanCourse = courseCode
    ? ordering?.coursesByCode[courseCode]
    : undefined;

  if (!samplePlanCourse) {
    return {
      label: item.label,
      basis: "degreeworks_credit_cap_only",
      samplePlanTerm: null,
      reason:
        "Degree Works identifies this course as still needed, but no checked-in course sequencing evidence was applied to its term placement.",
    };
  }

  const generatedSeason = extractSeason(termLabel);
  const samplePlanSeason = extractSeason(samplePlanCourse.termLabel);
  const isSeasonMismatch =
    Boolean(generatedSeason) &&
    Boolean(samplePlanSeason) &&
    generatedSeason !== samplePlanSeason;

  return {
    label: item.label,
    basis: isSeasonMismatch
      ? "bulletin_sample_term_mismatch"
      : "bulletin_sample_order_hint",
    samplePlanTerm: samplePlanCourse.termLabel,
    reason: isSeasonMismatch
      ? "The generated term season differs from the season shown in the matched Bulletin sample plan."
      : "The matched Bulletin sample plan supplies an ordering hint only; it does not verify prerequisites or actual offerings.",
  };
}

function catalogYearsMatch(
  auditCatalogYear?: string | null,
  sampleCatalogYear?: string | null,
) {
  const audit = normalizeCatalogYear(auditCatalogYear);
  const sample = normalizeCatalogYear(sampleCatalogYear);
  return Boolean(audit && sample && audit === sample);
}

function normalizeCatalogYear(value?: string | null) {
  const match = /\b((?:19|20)\d{2})\s*[-\u2013\u2014/]\s*((?:19|20)?\d{2})\b/.exec(
    value ?? "",
  );
  if (!match) {
    return null;
  }

  const startYear = match[1];
  const endYear =
    match[2].length === 2 ? `${startYear.slice(0, 2)}${match[2]}` : match[2];
  return `${startYear}-${endYear}`;
}

function extractSeason(value: string) {
  return /\bFall\b/i.test(value)
    ? "Fall"
    : /\bSpring\b/i.test(value)
      ? "Spring"
      : /\bSummer\b/i.test(value)
        ? "Summer"
        : null;
}

function joinLabels(assessments: GeneratedPathScheduleAssessment[]) {
  return assessments.map((assessment) => assessment.label).join(", ");
}

function verbForCount(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function normalizeCourseCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, " ");
}
