import { timingSafeEqual } from "node:crypto";

export const RELEASE_HEALTH_TOKEN_MIN_LENGTH = 32;

export function isReleaseHealthTokenConfigured(
  configuredToken = process.env.RELEASE_HEALTH_TOKEN,
) {
  return (
    typeof configuredToken === "string" &&
    configuredToken.trim().length >= RELEASE_HEALTH_TOKEN_MIN_LENGTH
  );
}

export function isAuthorizedReleaseHealthRequest(
  request: Request,
  configuredToken = process.env.RELEASE_HEALTH_TOKEN,
) {
  const expectedToken = configuredToken?.trim();
  if (!expectedToken || !isReleaseHealthTokenConfigured(expectedToken)) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  const match = /^Bearer (.+)$/i.exec(authorization ?? "");
  if (!match) {
    return false;
  }

  const providedToken = match[1];
  const expectedBytes = Buffer.from(expectedToken);
  const providedBytes = Buffer.from(providedToken);
  return (
    expectedBytes.length === providedBytes.length &&
    timingSafeEqual(expectedBytes, providedBytes)
  );
}
