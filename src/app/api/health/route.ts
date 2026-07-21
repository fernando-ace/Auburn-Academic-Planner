import {
  checkRateLimitConnectivity,
  getRateLimitConfigurationStatus,
} from "../../../lib/api/rate-limit.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const check = new URL(request.url).searchParams.get("check");
  const isDeepCheck = check === "deep";
  const chatConfigured = Boolean(
    process.env.GEMINI_API_KEY?.trim() &&
      process.env.GEMINI_FILE_SEARCH_STORE_NAME?.trim(),
  );
  const rateLimit = getRateLimitConfigurationStatus();
  const requestProtectionConnectivity = isDeepCheck
    ? await checkRateLimitConnectivity()
    : "not_checked";
  const configured = chatConfigured && rateLimit.fullyConfigured;
  const ready = configured && requestProtectionConnectivity === "ready";
  const healthy = isDeepCheck ? ready : configured;
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.trim().slice(0, 12);

  return Response.json(
    {
      check: isDeepCheck ? "deep_readiness" : "shallow_configuration",
      status: isDeepCheck
        ? ready
          ? "ready"
          : "degraded"
        : configured
          ? "configured"
          : "degraded",
      services: {
        planning: "ready",
        chatConfiguration: chatConfigured ? "configured" : "missing",
        requestProtection: {
          configuration: rateLimit.fullyConfigured ? "configured" : "missing",
          connectivity: requestProtectionConnectivity,
        },
      },
      ...(commit ? { commit } : {}),
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
      },
    },
  );
}
