import {
  buildAiCertificatePlanCheck,
  buildCustomAiCertificatePlanCheck,
  normalizePlanCheckCourseCode,
} from "../../../../lib/plan/ai-certificate-plan-check.ts";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(buildAiCertificatePlanCheck());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const validation = parseCustomPlanCheckRequest(body);

  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  return Response.json(buildCustomAiCertificatePlanCheck(validation.input));
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

  return {
    ok: true as const,
    input: {
      courseCodes: body.courseCodes.map(normalizePlanCheckCourseCode),
      planDescription: readOptionalString(body.planDescription, "Custom plan"),
      major: readOptionalString(body.major, "Unspecified"),
      totalPlannedCredits: readOptionalCreditValue(body.totalPlannedCredits),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readOptionalString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function readOptionalCreditValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
