import { createHash } from "node:crypto";

import {
  AuburnSourceFetchPolicyError,
  fetchAuburnSourceText,
  type AuburnSourceFetch,
} from "./auburn-source-fetch.ts";

export const LIVE_SOURCE_WORKER_COUNT = 3;
export const LIVE_SOURCE_PACING_MS = 150;
export const LIVE_SOURCE_MAX_ATTEMPTS = 3;

const retryBackoffMs = [750, 1_500] as const;
const retryJitterLimitMs = 250;
const transientHttpStatuses = new Set([408, 425, 429]);
const redirectHttpStatuses = new Set([301, 302, 303, 307, 308]);

export type LiveSourceEntry = {
  id: string;
  url: string;
  fileName: string;
};

export type SourceContentSummary = {
  bytes: number;
  sha256: string;
};

export type LiveSourceDrift = LiveSourceEntry & {
  cached: SourceContentSummary;
  live: SourceContentSummary;
};

export type LiveSourceUnavailable = LiveSourceEntry & {
  attempts: number;
  reason: string;
};

export type LiveSourceFreshnessResult = {
  passed: boolean;
  checkedCount: number;
  unchangedCount: number;
  retryCount: number;
  drift: LiveSourceDrift[];
  unavailable: LiveSourceUnavailable[];
};

export type LiveSourceFreshnessDependencies = {
  fetchSource(url: string): Promise<string>;
  readCachedSource(fileName: string): string;
  sleep(milliseconds: number): Promise<void>;
  random(): number;
};

export class LiveSourceTransientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LiveSourceTransientError";
  }
}

export class LiveSourceUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LiveSourceUnavailableError";
  }
}

export async function checkLiveSourceFreshness({
  entries,
  dependencies,
}: {
  entries: LiveSourceEntry[];
  dependencies: LiveSourceFreshnessDependencies;
}): Promise<LiveSourceFreshnessResult> {
  const drift: LiveSourceDrift[] = [];
  const unavailable: LiveSourceUnavailable[] = [];
  let nextEntryIndex = 0;
  let retryCount = 0;
  let unchangedCount = 0;

  async function checkNextEntries() {
    let hasMadeRequest = false;

    while (true) {
      const entryIndex = nextEntryIndex;
      nextEntryIndex += 1;
      if (entryIndex >= entries.length) {
        return;
      }

      if (hasMadeRequest) {
        await dependencies.sleep(LIVE_SOURCE_PACING_MS);
      }
      hasMadeRequest = true;

      const entry = entries[entryIndex];
      const cachedText = normalizeLineEndings(
        dependencies.readCachedSource(entry.fileName),
      );
      let liveText: string | undefined;
      let terminalError: unknown;
      let attempts = 0;

      for (
        let attempt = 1;
        attempt <= LIVE_SOURCE_MAX_ATTEMPTS;
        attempt += 1
      ) {
        attempts = attempt;
        try {
          liveText = normalizeLineEndings(
            await dependencies.fetchSource(entry.url),
          );
          break;
        } catch (error) {
          if (error instanceof AuburnSourceFetchPolicyError) {
            throw error;
          }

          terminalError = error;
          if (
            !(error instanceof LiveSourceTransientError) ||
            attempt === LIVE_SOURCE_MAX_ATTEMPTS
          ) {
            break;
          }

          retryCount += 1;
          await dependencies.sleep(retryDelayMs(attempt, dependencies.random));
        }
      }

      if (liveText === undefined) {
        unavailable.push({
          ...entry,
          attempts,
          reason: safeErrorMessage(terminalError),
        });
        continue;
      }

      if (liveText === cachedText) {
        unchangedCount += 1;
        continue;
      }

      drift.push({
        ...entry,
        cached: summarizeSourceContent(cachedText),
        live: summarizeSourceContent(liveText),
      });
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(LIVE_SOURCE_WORKER_COUNT, entries.length) },
      () => checkNextEntries(),
    ),
  );

  return {
    passed: drift.length === 0 && unavailable.length === 0,
    checkedCount: entries.length,
    unchangedCount,
    retryCount,
    drift,
    unavailable,
  };
}

export function createLiveSourceFetcher({
  fetchImpl = fetch,
  userAgent =
    "AuburnAcademicPlannerSourceFreshness/1.0 (+https://github.com/fernando-ace/Auburn-Academic-Planner)",
}: {
  fetchImpl?: AuburnSourceFetch;
  userAgent?: string;
} = {}) {
  return async (url: string) => {
    let failedHttpStatus: number | undefined;

    try {
      return await fetchAuburnSourceText(url, {
        fetchImpl: async (input, init) => {
          const response = await fetchImpl(input, init);
          if (!redirectHttpStatuses.has(response.status)) {
            failedHttpStatus = response.ok ? undefined : response.status;
          }
          return response;
        },
        headers: {
          Accept:
            "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
          "User-Agent": userAgent,
        },
      });
    } catch (error) {
      if (error instanceof AuburnSourceFetchPolicyError) {
        throw error;
      }

      if (failedHttpStatus !== undefined) {
        const message = `Auburn source returned HTTP ${failedHttpStatus}.`;
        if (isTransientHttpStatus(failedHttpStatus)) {
          throw new LiveSourceTransientError(message, { cause: error });
        }
        throw new LiveSourceUnavailableError(message, { cause: error });
      }

      throw new LiveSourceTransientError(
        "Auburn source request failed before a response was received.",
        { cause: error },
      );
    }
  };
}

export function normalizeLineEndings(value: string) {
  return value.replace(/\r\n/g, "\n");
}

export function summarizeSourceContent(value: string): SourceContentSummary {
  return {
    bytes: Buffer.byteLength(value, "utf8"),
    sha256: createHash("sha256").update(value).digest("hex"),
  };
}

function retryDelayMs(attempt: number, random: () => number) {
  const baseDelay = retryBackoffMs[Math.min(attempt - 1, retryBackoffMs.length - 1)];
  const randomValue = Math.min(1, Math.max(0, random()));
  return baseDelay + Math.floor(randomValue * retryJitterLimitMs);
}

function isTransientHttpStatus(status: number) {
  return transientHttpStatuses.has(status) || (status >= 500 && status <= 599);
}

function safeErrorMessage(error: unknown) {
  if (
    error instanceof LiveSourceTransientError ||
    error instanceof LiveSourceUnavailableError
  ) {
    return error.message;
  }

  return "Live source check failed without a classified response.";
}
