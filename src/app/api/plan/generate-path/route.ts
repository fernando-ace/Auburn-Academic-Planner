import { checkRateLimit } from "../../../../lib/api/rate-limit.ts";
import {
  MAX_PLANNING_JSON_REQUEST_BYTES,
  privateJsonResponse,
  readLimitedJsonBody,
  validateApiRequest,
} from "../../../../lib/api/request-security.ts";
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
  const requestValidation = validateApiRequest(request, "json");
  if (!requestValidation.ok) {
    return privateJsonResponse(
      { error: requestValidation.error },
      { status: requestValidation.status },
    );
  }

  const rateLimit = await checkRateLimit(request, {
    namespace: "generated-planned-path",
    limit: 30,
    windowSeconds: 10 * 60,
  });

  if (!rateLimit.ok) {
    return privateJsonResponse(
      { error: rateLimit.error },
      { status: rateLimit.status },
    );
  }

  const bodyResult = await readLimitedJsonBody(
    request,
    MAX_PLANNING_JSON_REQUEST_BYTES,
  );
  if (!bodyResult.ok) {
    return privateJsonResponse(
      {
        error: bodyResult.tooLarge
          ? "Request body is too large to process safely."
          : "Request body must be JSON.",
      },
      { status: bodyResult.tooLarge ? 413 : 400 },
    );
  }

  const body = bodyResult.value;
  if (!body || typeof body !== "object") {
    return privateJsonResponse(
      { error: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const currentProgressInput = parseCurrentProgressAnalysisInput(
    (body as { currentProgressAnalysis?: unknown }).currentProgressAnalysis,
  );
  if (currentProgressInput.status === "invalid") {
    return privateJsonResponse(
      { error: currentProgressInput.error },
      { status: 400 },
    );
  }

  if (currentProgressInput.status === "absent") {
    return privateJsonResponse(
      { error: "Current Progress analysis is required before generating a path." },
      { status: 400 },
    );
  }

  const currentProgressAnalysis = currentProgressInput.value;

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

  return privateJsonResponse({
    generatedPlannedPath,
    advisorMeetingSummary,
    notes: [
      "This generated path is planning preparation, not an official degree audit.",
      "Advisor verification is required before making registration, graduation, certificate, or degree-completion decisions.",
      "The Current Progress analysis is processed for this request and is not permanently stored.",
    ],
  });
}
