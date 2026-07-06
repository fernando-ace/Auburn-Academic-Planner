import { checkRateLimit } from "../../../../lib/api/rate-limit.ts";
import {
  buildCurrentProgressAdvisorSummary,
  buildCurrentStateGapReport,
  buildCurrentStateNextSteps,
} from "../../../../lib/plan/current-state-next-steps.ts";
import { parseCurrentProgressAnalysisInput } from "../../../../lib/plan/current-progress-analysis-input.ts";
import {
  buildGeneratedPlannedPath,
  parseGeneratedPathPreferences,
} from "../../../../lib/plan/generated-planned-path.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(request, {
    namespace: "generated-planned-path",
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

  const currentProgressAnalysis = parseCurrentProgressAnalysisInput(
    (body as { currentProgressAnalysis?: unknown }).currentProgressAnalysis,
  );
  if (!currentProgressAnalysis) {
    return Response.json(
      { error: "Current Progress analysis is required before generating a path." },
      { status: 400 },
    );
  }

  const currentStateGapReport = buildCurrentStateGapReport({
    audit: currentProgressAnalysis,
  });
  const currentStateNextSteps = buildCurrentStateNextSteps({
    audit: currentProgressAnalysis,
  });
  const generatedPlannedPath = buildGeneratedPlannedPath({
    audit: currentProgressAnalysis,
    preferences: parseGeneratedPathPreferences(
      (body as { preferences?: unknown }).preferences,
    ),
  });
  const advisorMeetingSummary = buildCurrentProgressAdvisorSummary({
    audit: currentProgressAnalysis,
    gapReport: currentStateGapReport,
    generatedPlannedPath,
    nextSteps: currentStateNextSteps,
  });

  return Response.json({
    generatedPlannedPath,
    advisorMeetingSummary,
    notes: [
      "This generated path is planning preparation, not an official degree audit.",
      "Advisor verification is required before making registration, graduation, certificate, or degree-completion decisions.",
      "The Current Progress analysis is processed for this request and is not permanently stored.",
    ],
  });
}
