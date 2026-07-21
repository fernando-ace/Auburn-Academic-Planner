import {
  checkRateLimitConnectivity,
  getRateLimitConfigurationStatus,
} from "../../../lib/api/rate-limit.ts";
import {
  isAuthorizedReleaseHealthRequest,
  isReleaseHealthTokenConfigured,
} from "../../../lib/api/release-health-auth.ts";
import {
  getNodeMajor,
  isSupportedNodeRuntime,
} from "../../../lib/runtime-support.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const check = new URL(request.url).searchParams.get("check");
  const isDeepCheck = check === "deep";
  if (isDeepCheck && !isAuthorizedReleaseHealthRequest(request)) {
    return Response.json(
      {
        check: "deep_readiness",
        status: "unauthorized",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          Pragma: "no-cache",
          "WWW-Authenticate": "Bearer",
        },
      },
    );
  }

  const chatConfigured = Boolean(
    process.env.GEMINI_API_KEY?.trim() &&
      process.env.GEMINI_FILE_SEARCH_STORE_NAME?.trim(),
  );
  const rateLimit = getRateLimitConfigurationStatus();
  const releaseProbeConfigured = isReleaseHealthTokenConfigured();
  const nodeMajor = getNodeMajor();
  const runtimeSupported = isSupportedNodeRuntime();
  const requestProtectionConnectivity = isDeepCheck
    ? await checkRateLimitConnectivity()
    : "not_checked";
  const configured =
    chatConfigured && rateLimit.fullyConfigured && releaseProbeConfigured;
  const ready =
    configured &&
    runtimeSupported &&
    requestProtectionConnectivity === "ready";
  const healthy = isDeepCheck ? ready : configured && runtimeSupported;
  const configuredCommit = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  const commit =
    configuredCommit && /^[0-9a-f]{40}$/i.test(configuredCommit)
      ? configuredCommit.toLowerCase()
      : null;
  const serviceDetails = {
    planning: "ready",
    chatConfiguration: chatConfigured ? "configured" : "missing",
    runtime: {
      nodeMajor,
      support: runtimeSupported ? "supported" : "unsupported",
    },
    releaseProbe: releaseProbeConfigured ? "configured" : "missing",
    requestProtection: {
      configuration: rateLimit.fullyConfigured ? "configured" : "missing",
      connectivity: requestProtectionConnectivity,
    },
  };

  return Response.json(
    {
      check: isDeepCheck ? "deep_readiness" : "shallow_configuration",
      status: isDeepCheck
        ? ready
          ? "ready"
          : "degraded"
        : configured && runtimeSupported
          ? "configured"
          : "degraded",
      ...(isDeepCheck ? { services: serviceDetails } : {}),
      ...(isDeepCheck && commit ? { commit } : {}),
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
