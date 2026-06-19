import {
  getCoursePlanningMetadata,
  type AvailabilityConfidence,
  type CoursePlanningMetadata,
  type PlanningTerm,
} from "./course-planning-metadata.ts";

export type CourseTermAvailability = {
  canPlace: boolean;
  term: PlanningTerm | null;
  termIsSpecific: boolean;
  availabilityConfidence: AvailabilityConfidence;
  availabilityNotes: string[];
  advisorReviewItems: string[];
};

const specificTermPattern = /\b(spring|summer|fall|winter)\s+20\d{2}\b/i;

export function getPlanningMetadataForCourse(courseCode: string) {
  return getCoursePlanningMetadata(courseCode);
}

export function determineCourseTermAvailability(
  metadata: CoursePlanningMetadata | null,
  termLabel: string,
): CourseTermAvailability {
  const term = parseSpecificPlanningTerm(termLabel);
  const code = metadata?.code ?? "This course";

  if (!metadata || metadata.availabilityConfidence === "unknown_requires_advisor_review") {
    const note = term
      ? `Local data does not confirm ${code} is offered in ${termLabel}; verify the offering with an advisor or department.`
      : `Local data does not confirm when ${code} is offered; verify the target-term offering with an advisor or department.`;

    return {
      canPlace: true,
      term,
      termIsSpecific: term !== null,
      availabilityConfidence: "unknown_requires_advisor_review",
      availabilityNotes: [note],
      advisorReviewItems: [note],
    };
  }

  if (!term) {
    const note = `${code} has a local typical-term rule, but ${termLabel} is not specific enough to apply it; verify the offering with an advisor or department.`;
    return {
      canPlace: true,
      term: null,
      termIsSpecific: false,
      availabilityConfidence: metadata.availabilityConfidence,
      availabilityNotes: [note],
      advisorReviewItems: [note],
    };
  }

  if (!metadata.typicalTerms.includes(term)) {
    return {
      canPlace: false,
      term,
      termIsSpecific: true,
      availabilityConfidence: metadata.availabilityConfidence,
      availabilityNotes: [
        `${code} is not modeled for ${formatTerm(term)} under the local typical-term rule.`,
      ],
      advisorReviewItems: [],
    };
  }

  return {
    canPlace: true,
    term,
    termIsSpecific: true,
    availabilityConfidence: metadata.availabilityConfidence,
    availabilityNotes: [
      `${code} matches the local ${formatTerm(term)} typical-term rule; live availability still requires verification.`,
    ],
    advisorReviewItems: [],
  };
}

export function attachCoursePlanningConstraints(
  courseCode: string,
  termLabel: string,
) {
  const metadata = getPlanningMetadataForCourse(courseCode);
  const availability = determineCourseTermAvailability(metadata, termLabel);

  return {
    metadata,
    ...availability,
  };
}

export function getAvailabilityAdvisorReviewItems(
  courseCode: string,
  termLabel: string,
) {
  return attachCoursePlanningConstraints(courseCode, termLabel).advisorReviewItems;
}

export function parseSpecificPlanningTerm(termLabel: string): PlanningTerm | null {
  const match = specificTermPattern.exec(termLabel.trim());
  return (match?.[1].toLowerCase() as PlanningTerm | undefined) ?? null;
}

function formatTerm(term: PlanningTerm) {
  return `${term[0].toUpperCase()}${term.slice(1)}`;
}
