import { checkRateLimit } from "../../../../../lib/api/rate-limit.ts";
import { analyzeCombinedDegreeWorksText } from "../../../../../lib/plan/combined-degreeworks-analysis.ts";
import { parseCurrentProgressAnalysisInput } from "../../../../../lib/plan/current-progress-analysis-input.ts";
import { comparePlannedPathToCurrentProgress } from "../../../../../lib/plan/planned-path-coverage.ts";

export const runtime = "nodejs";

export const MAX_MANUAL_PLANNED_COURSES_TEXT_LENGTH = 20_000;

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(request, {
    namespace: "manual-planned-path",
    limit: 30,
    windowSeconds: 10 * 60,
  });

  if (!rateLimit.ok) {
    return Response.json(
      { error: rateLimit.error },
      { status: rateLimit.status },
    );
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return Response.json(
      { error: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const plannedCoursesText = (body as { plannedCoursesText?: unknown })
    .plannedCoursesText;

  if (typeof plannedCoursesText !== "string" || !plannedCoursesText.trim()) {
    return Response.json(
      { error: "Paste at least one planned Auburn course before checking Planned Path." },
      { status: 400 },
    );
  }

  if (plannedCoursesText.length > MAX_MANUAL_PLANNED_COURSES_TEXT_LENGTH) {
    return Response.json(
      { error: "Pasted planned-course text is too long to process safely." },
      { status: 413 },
    );
  }

  const combinedAnalysis = analyzeCombinedDegreeWorksText({
    text: plannedCoursesText,
  });

  if (combinedAnalysis.parsedCourseCount === 0) {
    return Response.json(
      { error: "No Auburn course codes were found in the pasted planned courses." },
      { status: 422 },
    );
  }

  const currentProgressAnalysis = parseCurrentProgressAnalysisInput(
    (body as { currentProgressAnalysis?: unknown }).currentProgressAnalysis,
  );
  const plannedPathCoverage = currentProgressAnalysis
    ? comparePlannedPathToCurrentProgress({
        currentAudit: currentProgressAnalysis,
        plannedCourseCodes: combinedAnalysis.parsedCourseCodes,
      })
    : null;

  return Response.json({
    sourceFileName: "Manual planned courses",
    documentType: "planned_path",
    selectedTargetPath: "degreeworks_native",
    ...combinedAnalysis,
    ...(plannedPathCoverage ? { plannedPathCoverage } : {}),
    notes: [
      "This manual planned-path analysis is not an official degree audit.",
      "Advisor verification is required before making registration, graduation, certificate, or degree-completion decisions.",
      "Manual planned-course text only includes the courses entered for this request.",
    ],
  });
}
