import assert from "node:assert/strict";
import test from "node:test";

import {
  AuburnSourceFetchPolicyError,
  fetchAuburnSourceText,
  type AuburnSourceFetch,
} from "../src/lib/sources/auburn-source-fetch.ts";

test("rejects non-Auburn source URLs before making a request", async () => {
  let requestCount = 0;
  const fetchImpl: AuburnSourceFetch = async () => {
    requestCount += 1;
    return new Response("unexpected");
  };

  await assert.rejects(
    fetchAuburnSourceText("https://evilauburn.edu/source", { fetchImpl }),
    AuburnSourceFetchPolicyError,
  );
  assert.equal(requestCount, 0);
});

test("blocks redirects that leave the Auburn HTTPS boundary", async () => {
  const requestedUrls: string[] = [];
  const fetchImpl: AuburnSourceFetch = async (input) => {
    requestedUrls.push(requestUrl(input));
    return new Response(null, {
      status: 302,
      headers: { Location: "https://example.com/untrusted-source" },
    });
  };

  await assert.rejects(
    fetchAuburnSourceText("https://bulletin.auburn.edu/source", {
      fetchImpl,
    }),
    /redirect left the Auburn HTTPS boundary/,
  );
  assert.deepEqual(requestedUrls, ["https://bulletin.auburn.edu/source"]);
});

test("follows relative redirects that remain on an Auburn host", async () => {
  const requestedUrls: string[] = [];
  const fetchImpl: AuburnSourceFetch = async (input) => {
    const url = requestUrl(input);
    requestedUrls.push(url);

    if (url.endsWith("/source")) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/trusted-source" },
      });
    }

    return new Response("<html>trusted</html>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  };

  const text = await fetchAuburnSourceText(
    "https://bulletin.auburn.edu/source",
    { fetchImpl },
  );

  assert.equal(text, "<html>trusted</html>");
  assert.deepEqual(requestedUrls, [
    "https://bulletin.auburn.edu/source",
    "https://bulletin.auburn.edu/trusted-source",
  ]);
});

test("enforces the response byte cap while streaming", async () => {
  const fetchImpl: AuburnSourceFetch = async () =>
    new Response("123456", {
      headers: { "Content-Type": "text/plain" },
    });

  await assert.rejects(
    fetchAuburnSourceText("https://auburn.edu/source", {
      fetchImpl,
      maxBytes: 5,
    }),
    /exceeds the 5-byte limit/,
  );
});

test("aborts a source request when the timeout elapses", async () => {
  const fetchImpl: AuburnSourceFetch = async (_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      );
    });

  await assert.rejects(
    fetchAuburnSourceText("https://auburn.edu/source", {
      fetchImpl,
      timeoutMs: 10,
    }),
    /timed out after 10ms/,
  );
});

function requestUrl(input: string | URL | Request) {
  return input instanceof Request ? input.url : input.toString();
}
