import { buildDraftSemesterPlan } from "../../../../lib/plan/draft-semester-plan.ts";
import { buildNextSemesterSuggestions } from "../../../../lib/plan/next-semester-suggestions.ts";
import {
  isPlanningTargetPathInput,
  type PlanningTargetPathInput,
} from "../../../../lib/plan/target-path.ts";
import { checkAiEngineeringCertificate } from "../../../../lib/rules/ai-certificate.ts";
import { checkComputerScienceDegree } from "../../../../lib/rules/computer-science-degree.ts";
import { checkSoftwareEngineeringDegree } from "../../../../lib/rules/software-engineering-degree.ts";
import { checkSoftwareEngineeringPrerequisites } from "../../../../lib/rules/software-engineering-prerequisites.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const validation = parseRequest(body);

  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const input = validation.input;
  const aiCertificateCheck = checkAiEngineeringCertificate(input.courseCodes);
  const softwareEngineeringCheck = checkSoftwareEngineeringDegree({
    courseCodes: input.courseCodes,
    totalPlannedCredits: input.totalPlannedCredits,
  });
  const computerScienceCheck = checkComputerScienceDegree({
    courseCodes: input.courseCodes,
    totalPlannedCredits: input.totalPlannedCredits,
  });
  const prerequisiteCheck = checkSoftwareEngineeringPrerequisites({
    courseCodes: input.courseCodes,
  });
  const nextSemesterSuggestions = buildNextSemesterSuggestions({
    parsedCourseCodes: input.courseCodes,
    softwareEngineeringCheck,
    computerScienceCheck,
    aiCertificateCheck,
    prerequisiteCheck,
    targetPath: input.targetPath,
    parserConfidence: "medium",
  });

  return Response.json(
    buildDraftSemesterPlan({
      parsedCourseCodes: input.courseCodes,
      softwareEngineeringCheck,
      computerScienceCheck,
      aiCertificateCheck,
      prerequisiteCheck,
      requirementBlockResults: {
        softwareEngineering: softwareEngineeringCheck.requirementBlocks,
        computerScience: computerScienceCheck.requirementBlocks,
      },
      nextSemesterSuggestions,
      targetPath: input.targetPath,
      ...(input.maxCreditsPerSemester === undefined
        ? {}
        : { maxCreditsPerSemester: input.maxCreditsPerSemester }),
      ...(input.maxSemesters === undefined
        ? {}
        : { maxSemesters: input.maxSemesters }),
      ...(input.startingTermLabel === undefined
        ? {}
        : { startingTermLabel: input.startingTermLabel }),
    }),
  );
}

function parseRequest(body: unknown) {
  if (!isRecord(body)) {
    return { ok: false as const, error: "Request body must be a JSON object." };
  }

  if (!Array.isArray(body.courseCodes) || body.courseCodes.length === 0) {
    return {
      ok: false as const,
      error: "courseCodes must be a non-empty array of course code strings.",
    };
  }

  if (!body.courseCodes.every(isNonEmptyString)) {
    return {
      ok: false as const,
      error: "courseCodes must contain only non-empty strings.",
    };
  }

  const targetPath = body.targetPath ?? "auto";

  if (!isPlanningTargetPathInput(targetPath)) {
    return {
      ok: false as const,
      error: "targetPath must be software_engineering, computer_science, ai_certificate, or auto.",
    };
  }

  if (!isOptionalNonNegativeNumber(body.totalPlannedCredits)) {
    return {
      ok: false as const,
      error: "totalPlannedCredits must be a non-negative finite number or null.",
    };
  }

  if (!isOptionalPositiveNumber(body.maxCreditsPerSemester)) {
    return {
      ok: false as const,
      error: "maxCreditsPerSemester must be a positive finite number.",
    };
  }

  if (!isOptionalPositiveInteger(body.maxSemesters)) {
    return {
      ok: false as const,
      error: "maxSemesters must be a positive integer.",
    };
  }

  if (!isOptionalNonEmptyString(body.startingTermLabel)) {
    return {
      ok: false as const,
      error: "startingTermLabel must be a non-empty string when provided.",
    };
  }

  return {
    ok: true as const,
    input: {
      courseCodes: Array.from(new Set(body.courseCodes.map(normalizeCourseCode))),
      targetPath: targetPath as PlanningTargetPathInput,
      totalPlannedCredits:
        typeof body.totalPlannedCredits === "number"
          ? body.totalPlannedCredits
          : null,
      maxCreditsPerSemester:
        typeof body.maxCreditsPerSemester === "number"
          ? body.maxCreditsPerSemester
          : undefined,
      maxSemesters:
        typeof body.maxSemesters === "number" ? body.maxSemesters : undefined,
      startingTermLabel:
        typeof body.startingTermLabel === "string"
          ? body.startingTermLabel.trim()
          : undefined,
    },
  };
}

function normalizeCourseCode(courseCode: string) {
  return courseCode.trim().toUpperCase().replace(/\s+/g, " ");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalNonNegativeNumber(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "number" && Number.isFinite(value) && value >= 0)
  );
}

function isOptionalPositiveNumber(value: unknown) {
  return (
    value === undefined ||
    (typeof value === "number" && Number.isFinite(value) && value > 0)
  );
}

function isOptionalPositiveInteger(value: unknown) {
  return (
    value === undefined ||
    (typeof value === "number" && Number.isInteger(value) && value > 0)
  );
}

function isOptionalNonEmptyString(value: unknown) {
  return value === undefined || isNonEmptyString(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
