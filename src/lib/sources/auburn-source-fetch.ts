import { isAllowedAuburnSourceUrl } from "./source-scope.ts";

export const AUBURN_SOURCE_FETCH_TIMEOUT_MS = 15_000;
export const MAX_AUBURN_SOURCE_RESPONSE_BYTES = 5 * 1024 * 1024;

const MAX_AUBURN_SOURCE_REDIRECTS = 5;
const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const supportedContentTypes =
  /text\/html|application\/xhtml\+xml|text\/plain/i;

export type AuburnSourceFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type AuburnSourceFetchOptions = {
  fetchImpl?: AuburnSourceFetch;
  headers?: HeadersInit;
  maxBytes?: number;
  maxRedirects?: number;
  timeoutMs?: number;
};

export class AuburnSourceFetchPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuburnSourceFetchPolicyError";
  }
}

export async function fetchAuburnSourceText(
  rawUrl: string,
  options: AuburnSourceFetchOptions = {},
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxBytes = options.maxBytes ?? MAX_AUBURN_SOURCE_RESPONSE_BYTES;
  const maxRedirects =
    options.maxRedirects ?? MAX_AUBURN_SOURCE_REDIRECTS;
  const timeoutMs = options.timeoutMs ?? AUBURN_SOURCE_FETCH_TIMEOUT_MS;

  assertPositiveInteger(maxBytes, "maxBytes");
  assertPositiveInteger(timeoutMs, "timeoutMs");
  assertNonNegativeInteger(maxRedirects, "maxRedirects");

  let currentUrl = parseAllowedUrl(rawUrl, "Source URL");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for (let redirectCount = 0; ; redirectCount += 1) {
      const response = await fetchImpl(currentUrl, {
        headers: options.headers,
        redirect: "manual",
        signal: controller.signal,
      });

      if (redirectStatuses.has(response.status)) {
        if (redirectCount >= maxRedirects) {
          throw new AuburnSourceFetchPolicyError(
            `Fetch exceeded ${maxRedirects} redirects for ${rawUrl}.`,
          );
        }

        const location = response.headers.get("location");
        if (!location) {
          throw new AuburnSourceFetchPolicyError(
            `Fetch redirect for ${currentUrl.href} did not include a Location header.`,
          );
        }

        const redirectUrl = new URL(location, currentUrl);
        if (!isAllowedAuburnSourceUrl(redirectUrl)) {
          throw new AuburnSourceFetchPolicyError(
            `Fetch redirect left the Auburn HTTPS boundary: ${redirectUrl.href}`,
          );
        }

        currentUrl = redirectUrl;
        continue;
      }

      const responseUrl = response.url
        ? parseAllowedUrl(response.url, "Final response URL")
        : currentUrl;

      if (!response.ok) {
        throw new Error(
          `Fetch failed for ${responseUrl.href}: ${response.status} ${response.statusText}`,
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType && !supportedContentTypes.test(contentType)) {
        throw new AuburnSourceFetchPolicyError(
          `Fetch returned unsupported content type for ${responseUrl.href}: ${contentType}`,
        );
      }

      return await readResponseText(response, responseUrl, maxBytes);
    }
  } catch (error) {
    if (
      controller.signal.aborted &&
      !(error instanceof AuburnSourceFetchPolicyError)
    ) {
      throw new Error(`Fetch timed out after ${timeoutMs}ms for ${rawUrl}.`, {
        cause: error,
      });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseText(
  response: Response,
  responseUrl: URL,
  maxBytes: number,
) {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength)) {
    const declaredBytes = Number(declaredLength);
    if (declaredBytes > maxBytes) {
      throw new AuburnSourceFetchPolicyError(
        `Fetch response for ${responseUrl.href} exceeds the ${maxBytes}-byte limit.`,
      );
    }
  }

  if (!response.body) {
    throw new AuburnSourceFetchPolicyError(
      `Fetch returned empty content for ${responseUrl.href}.`,
    );
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new AuburnSourceFetchPolicyError(
        `Fetch response for ${responseUrl.href} exceeds the ${maxBytes}-byte limit.`,
      );
    }

    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder().decode(bytes);
  if (!text.trim()) {
    throw new AuburnSourceFetchPolicyError(
      `Fetch returned empty content for ${responseUrl.href}.`,
    );
  }

  return text;
}

function parseAllowedUrl(value: string, label: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AuburnSourceFetchPolicyError(`${label} must be an absolute URL.`);
  }

  if (!isAllowedAuburnSourceUrl(url)) {
    throw new AuburnSourceFetchPolicyError(
      `${label} must use HTTPS on auburn.edu or an auburn.edu subdomain.`,
    );
  }

  return url;
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new AuburnSourceFetchPolicyError(
      `${label} must be a positive integer.`,
    );
  }
}

function assertNonNegativeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new AuburnSourceFetchPolicyError(
      `${label} must be a non-negative integer.`,
    );
  }
}
