import {
  checkSoftwareEngineeringDegree,
  softwareEngineeringDegreeRule,
} from "../../../../lib/rules/software-engineering-degree.ts";
import {
  getDegreeWorksPlanSample,
  getDegreeWorksPlanSampleCourseCodes,
} from "../../../../lib/samples/degreeworks-plan-sample.ts";

export const runtime = "nodejs";

type CustomSoftwareEngineeringPlanCheckInput = {
  courseCodes: string[];
  planDescription: string;
  major: string;
  program: string;
  totalPlannedCredits: number | null;
};

export async function GET() {
  const plan = getDegreeWorksPlanSample();

  return Response.json(
    buildSoftwareEngineeringPlanCheck({
      courseCodes: getDegreeWorksPlanSampleCourseCodes(),
      planDescription: plan.planDescription,
      major: plan.major,
      program: plan.program,
      totalPlannedCredits: plan.totalPlannedCredits,
    }),
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const validation = parseCustomPlanCheckRequest(body);

  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  return Response.json(buildSoftwareEngineeringPlanCheck(validation.input));
}

function buildSoftwareEngineeringPlanCheck({
  courseCodes,
  major,
  planDescription,
  program,
  totalPlannedCredits,
}: CustomSoftwareEngineeringPlanCheckInput) {
  const normalizedCourseCodes = courseCodes.map(normalizePlanCheckCourseCode);
  const result = checkSoftwareEngineeringDegree({
    courseCodes: normalizedCourseCodes,
    totalPlannedCredits,
  });

  return {
    planDescription,
    major,
    program,
    totalPlannedCredits,
    exactRequiredCoursesSatisfied: result.exactRequiredCoursesSatisfied,
    exactRequiredCoursesMissing: result.exactRequiredCoursesMissing,
    alternativeCourseGroups: result.alternativeCourseGroups,
    advisorVerifiedRequirements: result.advisorVerifiedRequirements,
    totalHoursRequired: result.totalHoursRequired,
    hasEnoughTotalCredits: result.hasEnoughTotalCredits,
    isLikelyComplete: result.isLikelyComplete,
    advisorVerificationRequired: result.advisorVerificationRequired,
    notes: result.notes,
  };
}

function parseCustomPlanCheckRequest(body: unknown) {
  if (!isRecord(body)) {
    return {
      ok: false as const,
      error: "Request body must be a JSON object.",
    };
  }

  if (!Array.isArray(body.courseCodes) || body.courseCodes.length === 0) {
    return {
      ok: false as const,
      error: "courseCodes must be a non-empty array of course code strings.",
    };
  }

  if (
    !body.courseCodes.every(
      (courseCode) =>
        typeof courseCode === "string" && courseCode.trim().length > 0,
    )
  ) {
    return {
      ok: false as const,
      error: "courseCodes must contain only non-empty strings.",
    };
  }

  if (!isOptionalCreditValue(body.totalPlannedCredits)) {
    return {
      ok: false as const,
      error: "totalPlannedCredits must be a finite number or null when provided.",
    };
  }

  return {
    ok: true as const,
    input: {
      courseCodes: body.courseCodes.map(normalizePlanCheckCourseCode),
      planDescription: readOptionalString(body.planDescription, "Custom plan"),
      major: readOptionalString(body.major, "Unspecified"),
      program: softwareEngineeringDegreeRule.program,
      totalPlannedCredits: readOptionalCreditValue(body.totalPlannedCredits),
    },
  };
}

function normalizePlanCheckCourseCode(courseCode: string) {
  return courseCode.trim().toUpperCase().replace(/\s+/g, " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readOptionalString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function isOptionalCreditValue(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function readOptionalCreditValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
