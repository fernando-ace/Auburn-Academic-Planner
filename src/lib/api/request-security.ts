export const MAX_PLANNING_JSON_REQUEST_BYTES = 512 * 1024;

type ApiRequestValidationResult =
  | { ok: true }
  | { ok: false; error: string; status: 403 | 415 };

export type LimitedJsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; tooLarge: boolean };

export function validateApiRequest(
  request: Request,
  expectedContentType: "json" | "multipart",
): ApiRequestValidationResult {
  if (!isSameOriginBrowserRequest(request)) {
    return {
      ok: false,
      status: 403,
      error: "Cross-site requests are not allowed.",
    };
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const hasExpectedContentType =
    expectedContentType === "json"
      ? /^application\/(?:[a-z0-9.+-]+\+)?json(?:\s*;|$)/i.test(contentType)
      : /^multipart\/form-data(?:\s*;|$)/i.test(contentType);

  if (!hasExpectedContentType) {
    return {
      ok: false,
      status: 415,
      error:
        expectedContentType === "json"
          ? "Request content type must be application/json."
          : "Request content type must be multipart/form-data.",
    };
  }

  return { ok: true };
}

export async function readLimitedJsonBody(
  request: Request,
  maximumBytes: number,
): Promise<LimitedJsonBodyResult> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    return { ok: false, tooLarge: true };
  }

  if (!request.body) {
    return { ok: false, tooLarge: false };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, tooLarge: true };
    }
    chunks.push(value);
  }

  const bodyBytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return {
      ok: true,
      value: JSON.parse(new TextDecoder().decode(bodyBytes)) as unknown,
    };
  } catch {
    return { ok: false, tooLarge: false };
  }
}

export function privateJsonResponse(
  body: unknown,
  init: ResponseInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");

  return Response.json(body, {
    ...init,
    headers,
  });
}

export function isDeclaredBodyTooLarge(
  request: Request,
  maximumBytes: number,
) {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) {
    return false;
  }

  const declaredLength = Number(contentLength);
  return Number.isFinite(declaredLength) && declaredLength > maximumBytes;
}

function isSameOriginBrowserRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    if (originUrl.protocol !== "http:" && originUrl.protocol !== "https:") {
      return false;
    }

    if (originUrl.origin === requestUrl.origin) {
      return true;
    }

    const forwardedProtocol = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    const expectedProtocol =
      forwardedProtocol === "http" || forwardedProtocol === "https"
        ? `${forwardedProtocol}:`
        : requestUrl.protocol;
    const publicHosts = [
      request.headers.get("x-forwarded-host")?.split(",")[0],
      request.headers.get("host"),
    ]
      .map((host) => host?.trim().toLowerCase())
      .filter((host): host is string => Boolean(host));

    return publicHosts.some(
      (host) => originUrl.protocol === expectedProtocol && originUrl.host === host,
    );
  } catch {
    return false;
  }
}
