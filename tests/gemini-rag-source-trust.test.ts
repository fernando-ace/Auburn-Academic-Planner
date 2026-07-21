import assert from "node:assert/strict";
import test from "node:test";

import { FinishReason, type GroundingChunk } from "@google/genai";

import {
  buildExactMajorMetadataFilter,
  buildSourceMetadataFilter,
  dedupeRepeatedMarkdownBlocks,
  findExactlyNamedMajorSource,
  geminiAnswerWordCount,
  IncompleteGeminiResponseError,
  isRetryableGeminiRequestError,
  MAX_GEMINI_ANSWER_WORDS,
  normalizeManifestSource,
  requireStoppedGeminiResponse,
  resolveGroundingChunkSource,
  runBoundedGeminiGeneration,
  type ManifestSource,
} from "../src/lib/gemini-rag.ts";

const trustedManifestSource: ManifestSource = {
  id: "trusted-source",
  title: "Trusted Auburn source",
  type: "registrar",
  url: "https://www.auburn.edu/administration/registrar/trusted",
  fileName: "auburn/curated/trusted.html",
};

const computerScienceMajor: ManifestSource = {
  id: "auburn-major-computerscience",
  title: "Computer Science",
  type: "bulletin_major",
  fileName: "auburn/majors/auburn-major-computerscience.html",
};

const computerScienceOnlineMajor: ManifestSource = {
  id: "auburn-major-bachelorofcomputerscience",
  title: "Computer Science — Online Degree Completer Program",
  type: "bulletin_major",
  fileName: "auburn/majors/auburn-major-bachelorofcomputerscience.html",
};

const softwareEngineeringMajor: ManifestSource = {
  id: "auburn-major-softwareengineering",
  title: "Software Engineering",
  type: "bulletin_major",
  fileName: "auburn/majors/auburn-major-softwareengineering.html",
};

test("manifest normalization omits URLs outside the Auburn HTTPS boundary", () => {
  const untrustedUrls = [
    "https://example.com/source",
    "https://evilauburn.edu/source",
    "https://auburn.edu.evil.example/source",
    "http://www.auburn.edu/source",
  ];

  for (const url of untrustedUrls) {
    const normalized = normalizeManifestSource({
      ...trustedManifestSource,
      url,
    });

    assert.ok(normalized);
    assert.equal(normalized.url, undefined, url);
  }

  assert.equal(
    normalizeManifestSource(trustedManifestSource)?.url,
    trustedManifestSource.url,
  );
});

test("unmatched grounding chunks fail closed without exposing their URI", () => {
  const chunk = groundingChunk({
    title: "Trusted Auburn source",
    uri: "https://example.com/untrusted-grounding",
    id: "unknown-source",
    fileName: "unknown.html",
  });

  assert.equal(
    resolveGroundingChunkSource(chunk, [trustedManifestSource]),
    null,
  );
});

test("matched grounding uses only a validated manifest URL", () => {
  const chunk = groundingChunk({
    title: "Untrusted model title",
    uri: "https://example.com/untrusted-grounding",
    id: trustedManifestSource.id,
    fileName: trustedManifestSource.fileName,
  });

  const source = resolveGroundingChunkSource(chunk, [trustedManifestSource]);

  assert.ok(source);
  assert.equal(source.title, trustedManifestSource.title);
  assert.equal(source.url, trustedManifestSource.url);
  assert.equal(source.fileName, trustedManifestSource.fileName);
});

test("conflicting grounding identifiers fail closed", () => {
  const otherSource: ManifestSource = {
    ...trustedManifestSource,
    id: "other-source",
    title: "Other Auburn source",
    fileName: "auburn/curated/other.html",
  };
  const chunk = groundingChunk({
    id: trustedManifestSource.id,
    fileName: otherSource.fileName,
  });

  assert.equal(
    resolveGroundingChunkSource(chunk, [trustedManifestSource, otherSource]),
    null,
  );
});

test("matched grounding omits an invalid URL even if a caller bypasses normalization", () => {
  const unsafeManifestSource = {
    ...trustedManifestSource,
    url: "https://example.com/untrusted-manifest-url",
  };
  const chunk = groundingChunk({
    id: unsafeManifestSource.id,
    fileName: unsafeManifestSource.fileName,
  });

  const source = resolveGroundingChunkSource(chunk, [unsafeManifestSource]);

  assert.ok(source);
  assert.equal(source.url, undefined);
});

test("repeated normalized Markdown blocks are emitted only once", () => {
  const answer = [
    "Auburn requires six semester credit hours.",
    "**Verify this with an academic advisor.**",
    "AUBURN requires six   semester credit hours!",
    "Verify this with an academic advisor.",
  ].join("\n\n");

  assert.equal(
    dedupeRepeatedMarkdownBlocks(answer),
    [
      "Auburn requires six semester credit hours.",
      "**Verify this with an academic advisor.**",
    ].join("\n\n"),
  );
});

test("Gemini completion handling fails closed unless generation stops normally", () => {
  assert.doesNotThrow(() => requireStoppedGeminiResponse(FinishReason.STOP));

  for (const finishReason of [
    undefined,
    FinishReason.MAX_TOKENS,
    FinishReason.SAFETY,
    FinishReason.RECITATION,
  ]) {
    assert.throws(
      () => requireStoppedGeminiResponse(finishReason),
      IncompleteGeminiResponseError,
    );
  }
});

test("Gemini answer word counting enforces the public response ceiling", () => {
  assert.equal(geminiAnswerWordCount("  one   two\nthree  "), 3);
  assert.equal(
    geminiAnswerWordCount(
      Array.from({ length: MAX_GEMINI_ANSWER_WORDS }, () => "word").join(" "),
    ),
    MAX_GEMINI_ANSWER_WORDS,
  );
});

test("Gemini retries only transient upstream and network failures", () => {
  assert.equal(
    isRetryableGeminiRequestError(
      Object.assign(new Error("upstream unavailable"), { status: 503 }),
    ),
    true,
  );
  assert.equal(
    isRetryableGeminiRequestError(
      new Error(
        '{"error":{"code":504,"status":"DEADLINE_EXCEEDED"}}',
      ),
    ),
    true,
  );
  assert.equal(
    isRetryableGeminiRequestError(
      Object.assign(new Error("quota exhausted"), { status: 429 }),
    ),
    false,
  );
  assert.equal(
    isRetryableGeminiRequestError(
      Object.assign(new Error("invalid request"), { status: 400 }),
    ),
    false,
  );
});

test("Gemini transient retries share the two-attempt generation budget", async () => {
  const responses = [
    Object.assign(new Error("upstream unavailable"), { status: 503 }),
    { finishReason: "STOP" },
  ];
  let callCount = 0;

  const response = await runBoundedGeminiGeneration({
    generate: async () => {
      const next = responses[callCount++];
      if (next instanceof Error) {
        throw next;
      }
      return next;
    },
    shouldRetryCompactly: (result) => result.finishReason === "MAX_TOKENS",
    retryDelayMs: 0,
  });

  assert.equal(response.finishReason, "STOP");
  assert.equal(callCount, 2);
});

test("Gemini compact retries share the two-attempt generation budget", async () => {
  const instructions: string[] = [];
  const responses = [
    { finishReason: "MAX_TOKENS" },
    { finishReason: "STOP" },
  ];

  const response = await runBoundedGeminiGeneration({
    generate: async (systemInstruction) => {
      instructions.push(systemInstruction);
      return responses[instructions.length - 1];
    },
    shouldRetryCompactly: (result) => result.finishReason === "MAX_TOKENS",
    retryDelayMs: 0,
  });

  assert.equal(response.finishReason, "STOP");
  assert.equal(instructions.length, 2);
  assert.match(
    instructions[1],
    /previous generation could not finish within the response budget/i,
  );
});

test("Gemini does not make a third call after a transient retry", async () => {
  const responses = [
    Object.assign(new Error("upstream unavailable"), { status: 503 }),
    { finishReason: "MAX_TOKENS" },
  ];
  let callCount = 0;

  await assert.rejects(
    runBoundedGeminiGeneration({
      generate: async () => {
        const next = responses[callCount++];
        if (next instanceof Error) {
          throw next;
        }
        return next;
      },
      shouldRetryCompactly: (result) => result.finishReason === "MAX_TOKENS",
      retryDelayMs: 0,
    }),
    (error: unknown) =>
      error instanceof IncompleteGeminiResponseError &&
      error.finishReason === "ATTEMPT_BUDGET_EXHAUSTED",
  );
  assert.equal(callCount, 2);
});

test("Gemini does not retry a transient compact-generation failure", async () => {
  const compactError = Object.assign(new Error("upstream unavailable"), {
    status: 503,
  });
  const responses = [{ finishReason: "MAX_TOKENS" }, compactError];
  let callCount = 0;

  await assert.rejects(
    runBoundedGeminiGeneration({
      generate: async () => {
        const next = responses[callCount++];
        if (next instanceof Error) {
          throw next;
        }
        return next;
      },
      shouldRetryCompactly: (result) => result.finishReason === "MAX_TOKENS",
      retryDelayMs: 0,
    }),
    compactError,
  );
  assert.equal(callCount, 2);
});

test("Gemini does not retry non-transient generation failures", async () => {
  const invalidRequest = Object.assign(new Error("invalid request"), {
    status: 400,
  });
  let callCount = 0;

  await assert.rejects(
    runBoundedGeminiGeneration({
      generate: async () => {
        callCount += 1;
        throw invalidRequest;
      },
      shouldRetryCompactly: () => false,
      retryDelayMs: 0,
    }),
    invalidRequest,
  );
  assert.equal(callCount, 1);
});

test("exact named-major retrieval narrows File Search to the trusted manifest id", () => {
  const sources = [
    computerScienceOnlineMajor,
    softwareEngineeringMajor,
    computerScienceMajor,
  ];
  const question = "What courses are required for the Computer Science major?";

  assert.equal(
    findExactlyNamedMajorSource(question, sources)?.id,
    computerScienceMajor.id,
  );
  assert.equal(
    buildExactMajorMetadataFilter(question, sources),
    'id="auburn-major-computerscience"',
  );
});

test("exact named-major retrieval chooses a longer named program over its base title", () => {
  const question =
    "What is required for the Computer Science Online Degree Completer Program?";

  assert.equal(
    findExactlyNamedMajorSource(question, [
      computerScienceMajor,
      computerScienceOnlineMajor,
    ])?.id,
    computerScienceOnlineMajor.id,
  );
});

test("major metadata filtering stays off for comparisons and cross-source questions", () => {
  const sources = [computerScienceMajor, softwareEngineeringMajor];

  assert.equal(
    buildExactMajorMetadataFilter(
      "Compare the Computer Science and Software Engineering majors.",
      sources,
    ),
    undefined,
  );
  assert.equal(
    buildExactMajorMetadataFilter(
      "How might transfer credit apply to the Computer Science major?",
      sources,
    ),
    undefined,
  );
});

test("trusted multi-source metadata filters use explicit OR clauses", () => {
  assert.equal(
    buildSourceMetadataFilter([
      computerScienceMajor,
      softwareEngineeringMajor,
      computerScienceMajor,
    ]),
    '(id="auburn-major-computerscience" OR id="auburn-major-softwareengineering")',
  );
});

function groundingChunk({
  title,
  uri,
  id,
  fileName,
}: {
  title?: string;
  uri?: string;
  id?: string;
  fileName?: string;
}) {
  return {
    retrievedContext: {
      title,
      uri,
      text: "Grounded source text.",
      customMetadata: [
        ...(id ? [{ key: "id", stringValue: id }] : []),
        ...(fileName ? [{ key: "fileName", stringValue: fileName }] : []),
      ],
    },
  } as unknown as GroundingChunk;
}
