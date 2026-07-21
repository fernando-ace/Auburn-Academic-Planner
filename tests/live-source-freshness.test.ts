import assert from "node:assert/strict";
import test from "node:test";

import { AuburnSourceFetchPolicyError } from "../src/lib/sources/auburn-source-fetch.ts";
import {
  checkLiveSourceFreshness,
  createLiveSourceFetcher,
  LiveSourceTransientError,
  type LiveSourceEntry,
} from "../src/lib/sources/live-source-freshness.ts";

const entry: LiveSourceEntry = {
  id: "auburn-test-source",
  url: "https://bulletin.auburn.edu/test-source/",
  fileName: "auburn/curated/auburn-test-source.html",
};

test("passes unchanged content after normalizing CRLF to LF", async () => {
  const result = await runCheck({
    cachedText: "<html>\r\nsource\r\n</html>\r\n",
    fetchSource: async () => "<html>\nsource\n</html>\n",
  });

  assert.equal(result.passed, true);
  assert.equal(result.unchangedCount, 1);
  assert.deepEqual(result.drift, []);
  assert.deepEqual(result.unavailable, []);
});

test("reports drift with hashes and byte counts but not source content", async () => {
  const result = await runCheck({
    cachedText: "cached source",
    fetchSource: async () => "live source",
  });

  assert.equal(result.passed, false);
  assert.equal(result.unchangedCount, 0);
  assert.equal(result.drift.length, 1);
  assert.match(result.drift[0].cached.sha256, /^[a-f0-9]{64}$/);
  assert.match(result.drift[0].live.sha256, /^[a-f0-9]{64}$/);
  assert.equal(result.drift[0].cached.bytes, 13);
  assert.equal(result.drift[0].live.bytes, 11);
  assert.equal("content" in result.drift[0].cached, false);
  assert.equal("content" in result.drift[0].live, false);
});

test("retries transient failures with injected bounded delays", async () => {
  let fetchCount = 0;
  const sleepCalls: number[] = [];
  const fetchSource = createLiveSourceFetcher({
    fetchImpl: async () => {
      fetchCount += 1;
      if (fetchCount < 3) {
        return new Response("temporary", { status: 503 });
      }
      return new Response("source", {
        headers: { "Content-Type": "text/plain" },
      });
    },
  });
  const result = await runCheck({
    cachedText: "source",
    fetchSource,
    sleepCalls,
  });

  assert.equal(result.passed, true);
  assert.equal(fetchCount, 3);
  assert.equal(result.retryCount, 2);
  assert.deepEqual(sleepCalls, [750, 1_500]);
});

test("reports a terminal unavailable source after three transient attempts", async () => {
  let fetchCount = 0;
  const sleepCalls: number[] = [];
  const result = await runCheck({
    cachedText: "source",
    fetchSource: async () => {
      fetchCount += 1;
      throw new LiveSourceTransientError("Temporary upstream failure.");
    },
    sleepCalls,
  });

  assert.equal(result.passed, false);
  assert.equal(fetchCount, 3);
  assert.equal(result.retryCount, 2);
  assert.deepEqual(sleepCalls, [750, 1_500]);
  assert.deepEqual(result.unavailable, [
    {
      ...entry,
      attempts: 3,
      reason: "Temporary upstream failure.",
    },
  ]);
});

test("does not retry a non-transient HTTP failure", async () => {
  let fetchCount = 0;
  const sleepCalls: number[] = [];
  const fetchSource = createLiveSourceFetcher({
    fetchImpl: async () => {
      fetchCount += 1;
      return new Response("missing", { status: 404 });
    },
  });
  const result = await runCheck({
    cachedText: "source",
    fetchSource,
    sleepCalls,
  });

  assert.equal(result.passed, false);
  assert.equal(fetchCount, 1);
  assert.equal(result.retryCount, 0);
  assert.deepEqual(sleepCalls, []);
  assert.deepEqual(result.unavailable, [
    {
      ...entry,
      attempts: 1,
      reason: "Auburn source returned HTTP 404.",
    },
  ]);
});

test("retries a body-stream failure after an HTTP 200 response", async () => {
  let fetchCount = 0;
  const sleepCalls: number[] = [];
  const fetchSource = createLiveSourceFetcher({
    fetchImpl: async () => {
      fetchCount += 1;
      if (fetchCount === 1) {
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new Error("Response stream disconnected."));
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          },
        );
      }
      return new Response("source", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    },
  });
  const result = await runCheck({
    cachedText: "source",
    fetchSource,
    sleepCalls,
  });

  assert.equal(result.passed, true);
  assert.equal(fetchCount, 2);
  assert.equal(result.retryCount, 1);
  assert.deepEqual(sleepCalls, [750]);
});

test("fails immediately on an Auburn source policy violation", async () => {
  let fetchCount = 0;

  await assert.rejects(
    runCheck({
      cachedText: "source",
      fetchSource: async () => {
        fetchCount += 1;
        throw new AuburnSourceFetchPolicyError("Source left the Auburn boundary.");
      },
    }),
    /Source left the Auburn boundary/,
  );
  assert.equal(fetchCount, 1);
});

async function runCheck({
  cachedText,
  fetchSource,
  sleepCalls = [],
}: {
  cachedText: string;
  fetchSource: (url: string) => Promise<string>;
  sleepCalls?: number[];
}) {
  return checkLiveSourceFreshness({
    entries: [entry],
    dependencies: {
      fetchSource,
      random: () => 0,
      readCachedSource: () => cachedText,
      sleep: (milliseconds) => {
        sleepCalls.push(milliseconds);
        return Promise.resolve();
      },
    },
  });
}
