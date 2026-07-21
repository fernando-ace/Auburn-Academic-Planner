import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import { deflateSync } from "node:zlib";
import test from "node:test";

import {
  getDefaultGeneratedPathStartTerm,
  nextGeneratedPathTerm,
  parseGeneratedPathTerm,
} from "../src/lib/plan/generated-path-terms.ts";

const execFileAsync = promisify(execFile);
const expectedCommit = "0123456789abcdef0123456789abcdef01234567";
const releaseHealthToken = "release-health-token-for-smoke-test";
const smokeStartTerm = getDefaultGeneratedPathStartTerm(new Date(), true);

type MockDeploymentOptions = {
  brokenFlagshipPath?: boolean;
  corruptCompressedIcon?: boolean;
  canonicalOrigin?: string;
  commit?: string;
  corruptIcon?: boolean;
  extraFlagshipCourse?: boolean;
  hostileGroundedSource?: boolean;
  healthNoStore?: boolean;
  inconsistentFlagshipCredits?: boolean;
  manualPlanStub?: boolean;
  nodeMajor?: number;
  nonContiguousFlagshipTerms?: boolean;
  oversizedDeclaredPage?: boolean;
  oversizedHealthBody?: boolean;
  rejectHealthToken?: boolean;
  reflectHealthToken?: boolean;
  oversizedHealthDiagnostics?: boolean;
  oversizedPageBody?: boolean;
  oversizedPngBody?: boolean;
};

test("production smoke proves release identity, metadata, and flagship planning", async () => {
  const requests = {
    currentProgressPdf: false,
    deepHealth: false,
    generatedPath: false,
    groundedChat: false,
  };
  let origin = "";
  const server = createServer(async (request, response) => {
    try {
      await handleRequest(request, response, origin, requests, {});
    } catch (error) {
      response.statusCode = 500;
      response.end(error instanceof Error ? error.message : "Mock server error");
    }
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  origin = `http://127.0.0.1:${address.port}`;

  try {
    const result = await runSmoke(origin, expectedCommit);

    assert.match(result.stdout, /PASS permanent Planning Hub redirect/);
    assert.match(result.stdout, /PASS canonical metadata and install assets/);
    assert.match(
      result.stdout,
      /PASS flagship Current Progress PDF and path regeneration/,
    );
    assert.match(result.stdout, /Production smoke passed/);
    assert.equal(requests.currentProgressPdf, true);
    assert.equal(requests.deepHealth, true);
    assert.equal(requests.generatedPath, true);
    assert.equal(requests.groundedChat, true);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("production smoke refuses to run without an exact expected commit", async () => {
  await assert.rejects(
    runSmoke("http://127.0.0.1:9", undefined),
    (error: unknown) => {
      assert.ok(error && typeof error === "object" && "stderr" in error);
      assert.match(
        String((error as { stderr: unknown }).stderr),
        /Set EXPECTED_COMMIT_SHA to the full 40-character Git commit/,
      );
      return true;
    },
  );
});

for (const scenario of [
  {
    name: "rejects a stale deployed commit",
    options: {
      commit: "fedcba9876543210fedcba9876543210fedcba98",
    },
    error: /Deployment commit mismatch/,
  },
  {
    name: "rejects an unsupported production runtime",
    options: { nodeMajor: 24 },
    error: /must use supported Node 22\.x/,
  },
  {
    name: "rejects canonical metadata from the wrong origin",
    options: { canonicalOrigin: "https://wrong-origin.example" },
    error: /canonical URL does not match/,
  },
  {
    name: "rejects cacheable deep health evidence",
    options: { healthNoStore: false },
    error: /Deep health response is not marked no-store/,
  },
  {
    name: "rejects an unrelated hard-coded generated path",
    options: { brokenFlagshipPath: true },
    error: /Current Progress PDF smoke failed/,
  },
  {
    name: "rejects a corrupt install image",
    options: { corruptIcon: true },
    error: /192px icon is too small to be a valid PNG/,
  },
  {
    name: "rejects CRC-valid but undecodable PNG data",
    options: { corruptCompressedIcon: true },
    error: /192px icon PNG image data could not be decoded/,
  },
  {
    name: "rejects a stubbed manual planning result",
    options: { manualPlanStub: true },
    error: /Planning API failed/,
  },
  {
    name: "rejects a non-Auburn grounded source URL",
    options: { hostileGroundedSource: true },
    error: /credential-free HTTPS DegreeWorks source on auburn\.edu/,
  },
  {
    name: "diagnoses a rejected release-health token",
    options: { rejectHealthToken: true },
    error: /Deep health rejected RELEASE_HEALTH_TOKEN/,
  },
  {
    name: "bounds oversized nested health diagnostics",
    options: { oversizedHealthDiagnostics: true },
    error: /Health gate is not ready/,
  },
  {
    name: "rejects an oversized declared page body",
    options: { oversizedDeclaredPage: true },
    error: /Planning Hub HTML exceeded the .* response limit/,
  },
  {
    name: "rejects an oversized chunked page body",
    options: { oversizedPageBody: true },
    error: /Planning Hub HTML exceeded the .* response limit/,
  },
  {
    name: "rejects an oversized chunked health body",
    options: { oversizedHealthBody: true },
    error: /Deep health exceeded the .* response limit/,
  },
  {
    name: "rejects an oversized chunked PNG body",
    options: { oversizedPngBody: true },
    error: /192px icon exceeded the .* response limit/,
  },
  {
    name: "rejects parser output with invented flagship courses",
    options: { extraFlagshipCourse: true },
    error: /Current Progress PDF smoke failed/,
  },
  {
    name: "rejects noncontiguous flagship terms",
    options: { nonContiguousFlagshipTerms: true },
    error: /Current Progress PDF smoke failed/,
  },
  {
    name: "rejects inconsistent flagship credit arithmetic",
    options: { inconsistentFlagshipCredits: true },
    error: /Current Progress PDF smoke failed/,
  },
  {
    name: "does not log a reflected release-health token",
    options: { reflectHealthToken: true },
    error: /Deployment commit mismatch/,
    forbiddenOutput: releaseHealthToken,
  },
] as const) {
  test(`production smoke ${scenario.name}`, async () => {
    await expectSmokeFailure(
      scenario.options,
      scenario.error,
      "forbiddenOutput" in scenario ? scenario.forbiddenOutput : undefined,
    );
  });
}

async function expectSmokeFailure(
  options: MockDeploymentOptions,
  expectedError: RegExp,
  forbiddenOutput?: string,
) {
  const requests = {
    currentProgressPdf: false,
    deepHealth: false,
    generatedPath: false,
    groundedChat: false,
  };
  let origin = "";
  const server = createServer(async (request, response) => {
    try {
      await handleRequest(request, response, origin, requests, options);
    } catch (error) {
      response.statusCode = 500;
      response.end(error instanceof Error ? error.message : "Mock server error");
    }
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  origin = `http://127.0.0.1:${address.port}`;

  try {
    await assert.rejects(runSmoke(origin, expectedCommit), (error: unknown) => {
      assert.ok(error && typeof error === "object" && "stderr" in error);
      const stderr = String((error as { stderr: unknown }).stderr);
      assert.match(stderr, expectedError);
      assert.ok(stderr.length < 4_096, "smoke diagnostics must remain bounded");
      if (forbiddenOutput) {
        assert.ok(
          !stderr.includes(forbiddenOutput),
          "smoke diagnostics must not reflect the release-health token",
        );
      }
      return true;
    });
  } finally {
    server.close();
    await once(server, "close");
  }
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  origin: string,
  requests: {
    currentProgressPdf: boolean;
    deepHealth: boolean;
    generatedPath: boolean;
    groundedChat: boolean;
  },
  options: MockDeploymentOptions,
) {
  const requestUrl = new URL(request.url ?? "/", origin);
  const pathname = requestUrl.pathname;

  if (pathname === "/") {
    response.statusCode = 308;
    response.setHeader("Location", "/plan-check");
    response.end();
    return;
  }

  if (pathname === "/plan-check" || pathname === "/chat") {
    const title =
      pathname === "/plan-check" ? "Planning Hub" : "Source-Grounded Chat";
    setPageHeaders(response);
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    const metadataOrigin = options.canonicalOrigin ?? origin;
    const pageHtml = `<!doctype html><html><head>
      <title>${title} | Auburn Academic Planner</title>
      <link rel="canonical" href="${metadataOrigin}${pathname}">
      <meta property="og:url" content="${metadataOrigin}${pathname}">
      <meta property="og:image" content="${metadataOrigin}/opengraph-image">
    </head><body><main>${title}</main></body></html>`;
    if (pathname === "/plan-check" && options.oversizedDeclaredPage) {
      response.setHeader("Content-Length", String(10 * 1_024 * 1_024));
      response.end(pageHtml);
      return;
    }
    if (pathname === "/plan-check" && options.oversizedPageBody) {
      response.write(pageHtml);
      for (let index = 0; index < 33; index += 1) {
        response.write("x".repeat(64 * 1_024));
      }
      response.end();
      return;
    }
    response.end(pageHtml);
    return;
  }

  if (pathname === "/robots.txt") {
    response.setHeader("Content-Type", "text/plain");
    response.end(`User-agent: *\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`);
    return;
  }

  if (pathname === "/sitemap.xml") {
    response.setHeader("Content-Type", "application/xml");
    response.end(
      `<urlset><url><loc>${origin}/plan-check</loc></url><url><loc>${origin}/feedback</loc></url></urlset>`,
    );
    return;
  }

  if (pathname === "/manifest.webmanifest") {
    sendJson(response, 200, {
      start_url: "/plan-check",
      icons: [
        { src: "/icon-192", sizes: "192x192" },
        { src: "/icon", sizes: "512x512" },
      ],
    });
    return;
  }

  if (
    ["/opengraph-image", "/apple-icon", "/icon-192", "/icon"].includes(
      pathname,
    )
  ) {
    response.setHeader("Content-Type", "image/png");
    const dimensions: Record<string, [number, number]> = {
      "/opengraph-image": [1200, 630],
      "/apple-icon": [180, 180],
      "/icon-192": [192, 192],
      "/icon": [512, 512],
    };
    if (options.oversizedPngBody && pathname === "/icon-192") {
      for (let index = 0; index < 81; index += 1) {
        response.write(Buffer.alloc(64 * 1_024));
      }
      response.end();
      return;
    }
    response.end(
      options.corruptIcon && pathname === "/icon-192"
        ? Buffer.from([0x89, 0x50, 0x4e, 0x47])
        : makePng(
            ...dimensions[pathname],
            options.corruptCompressedIcon && pathname === "/icon-192",
          ),
    );
    return;
  }

  if (pathname === "/api/health") {
    assert.equal(requestUrl.searchParams.get("check"), "deep");
    assert.ok(requestUrl.searchParams.get("nonce"));
    assert.equal(
      request.headers.authorization,
      `Bearer ${releaseHealthToken}`,
    );
    requests.deepHealth = true;
    if (options.rejectHealthToken) {
      response.setHeader("Cache-Control", "no-store, max-age=0");
      sendJson(response, 401, {
        check: "deep_readiness",
        status: "unauthorized",
      });
      return;
    }
    if (options.healthNoStore !== false) {
      response.setHeader("Cache-Control", "no-store, max-age=0");
    }
    if (options.oversizedHealthBody) {
      response.setHeader("Content-Type", "application/json");
      response.write('{"check":"deep_readiness","error":"');
      response.write("x".repeat(160 * 1_024));
      response.end('"}');
      return;
    }
    if (options.reflectHealthToken) {
      sendJson(response, 503, {
        check: "deep_readiness",
        status: "degraded",
        commit: releaseHealthToken,
        error: releaseHealthToken,
        services: {
          runtime: { nodeMajor: 22, support: "supported" },
          requestProtection: { connectivity: releaseHealthToken },
        },
      });
      return;
    }
    const nodeMajor = options.nodeMajor ?? 22;
    const ready = nodeMajor === 22 && !options.oversizedHealthDiagnostics;
    sendJson(response, ready ? 200 : 503, {
      check: "deep_readiness",
      status: ready ? "ready" : "degraded",
      services: {
        planning: "ready",
        chatConfiguration: "configured",
        runtime: {
          nodeMajor,
          support: nodeMajor === 22 ? "supported" : "unsupported",
        },
        releaseProbe: "configured",
        requestProtection: {
          configuration: "configured",
          connectivity: options.oversizedHealthDiagnostics
            ? "x".repeat(20_000)
            : "ready",
        },
      },
      commit: options.commit ?? expectedCommit,
    });
    return;
  }

  if (pathname === "/api/plan/analyze-degreeworks-current/upload") {
    const body = (await readBody(request)).toString("latin1");
    assert.match(body, /synthetic-current-progress-smoke\.pdf/);
    assert.match(body, /%PDF-1\.7/);
    assert.match(body, /generatedPathPreferences/);
    requests.currentProgressPdf = true;
    sendPrivateJson(response, 200, {
      documentType: "worksheet_audit",
      currentProgressAnalysis: {
        documentType: "worksheet_audit",
        stillNeededCourseCodes: [
          "COMP 3220",
          "COMP 3270",
          "ELEC 2200",
          ...(options.extraFlagshipCourse ? ["MATH 1610"] : []),
        ],
      },
      generatedPlannedPath: usefulGeneratedPath(
        options.brokenFlagshipPath,
        options.extraFlagshipCourse,
        options.nonContiguousFlagshipTerms,
        options.inconsistentFlagshipCredits,
      ),
      advisorMeetingSummary:
        "Advisor Meeting Summary\n\nGenerated draft path for advisor review.",
    });
    return;
  }

  if (pathname === "/api/plan/generate-path") {
    const body = JSON.parse((await readBody(request)).toString("utf8")) as {
      currentProgressAnalysis?: { documentType?: string };
    };
    assert.equal(body.currentProgressAnalysis?.documentType, "worksheet_audit");
    requests.generatedPath = true;
    sendPrivateJson(response, 200, {
      generatedPlannedPath: usefulGeneratedPath(
        options.brokenFlagshipPath,
        options.extraFlagshipCourse,
        options.nonContiguousFlagshipTerms,
        options.inconsistentFlagshipCredits,
      ),
      advisorMeetingSummary:
        "Advisor Meeting Summary\n\nGenerated draft path for advisor review.",
    });
    return;
  }

  if (pathname === "/api/plan/analyze-degreeworks/manual") {
    const body = JSON.parse((await readBody(request)).toString("utf8")) as {
      plannedCoursesText?: string;
    };
    assert.equal(
      body.plannedCoursesText,
      "Fall 2030 Credits: 6\nCOMP 1210, MATH 1610",
    );
    sendPrivateJson(
      response,
      200,
      options.manualPlanStub
        ? { documentType: "planned_path" }
        : {
            documentType: "planned_path",
            parsedCourseCount: 2,
            parsedCourseCodes: ["COMP 1210", "MATH 1610"],
            semesterPlanAnalysis: {
              terms: [
                {
                  label: "Fall 2030",
                  index: 0,
                  courseCodes: ["COMP 1210", "MATH 1610"],
                  plannedCredits: 6,
                },
              ],
              unassignedCourseCodes: [],
              warnings: [],
              confidence: "medium",
            },
          },
    );
    return;
  }

  if (pathname === "/api/chat") {
    const body = JSON.parse((await readBody(request)).toString("utf8")) as {
      messages?: unknown[];
    };
    if (!body.messages?.length) {
      sendPrivateJson(response, 400, { error: "Messages are required." });
      return;
    }

    requests.groundedChat = true;
    sendPrivateJson(response, 200, {
      answer: "Open Degree Works from Academic Portals in AU Access.",
      advisorVerificationNote: "Verify this with an Auburn academic advisor.",
      confidence: "High",
      sources: [
        {
          title: "DegreeWorks",
          url: options.hostileGroundedSource
            ? "https://auburn.edu.attacker.example/degreeworks"
            : "https://www.auburn.edu/administration/registrar/degreeworks",
        },
      ],
    });
    return;
  }

  response.statusCode = 404;
  response.end("Not found");
}

function usefulGeneratedPath(
  broken = false,
  includeExtraCourse = false,
  nonContiguousTerms = false,
  inconsistentCredits = false,
) {
  const courseSpecs = broken
    ? [{ code: "MATH 1610", credits: 4 }]
    : [
        { code: "COMP 3270", credits: 3 },
        { code: "ELEC 2200", credits: 4 },
        { code: "COMP 3220", credits: 3 },
        ...(includeExtraCourse ? [{ code: "MATH 1610", credits: 4 }] : []),
      ];
  const placedItems = courseSpecs.map(({ code, credits }) => ({
    kind: "course",
    label: code,
    courseCodes: [code],
    credits,
    reason: "Placed from synthetic Degree Works Still needed evidence.",
  }));
  const firstTermItems = placedItems.slice(0, 2);
  const secondTermItems = placedItems.slice(2);
  const terms = [
    generatedTerm(0, smokeStartTerm, firstTermItems),
    ...(secondTermItems.length > 0
      ? [
          generatedTerm(
            1,
            nonContiguousTerms ? "Spring 2031" : nextSmokeTermLabel(),
            secondTermItems,
          ),
        ]
      : []),
  ];
  if (inconsistentCredits) {
    terms[0].plannedCredits += 1;
  }
  const draftCredits = placedItems.reduce(
    (total, item) => total + item.credits,
    0,
  );

  return {
    targetPath: "degreeworks_native",
    preferences: {
      startTerm: smokeStartTerm,
      maxCreditsPerTerm: 9,
      includeSummer: true,
      maxSummerCredits: 6,
      maxTerms: 12,
    },
    terms,
    placedItems,
    advisorReviewItems: [],
    unplacedItems: [],
    creditTotals: {
      lockedCurrentCredits: 0,
      draftCredits,
      totalDisplayedCredits: draftCredits,
    },
    orderingSource: {
      authority: "degreeworks_current_progress",
      bulletinOrderingHint: null,
      bulletinOrderingWarning: null,
    },
    feasibility: {
      degreeWorksGrounding: "checked",
      creditCaps: "checked",
      bulletinSequence: "degreeworks_order_only",
      prerequisitesAndCorequisites: "not_checked",
      courseOfferings: "not_checked",
    },
    confidence: "high",
    notes: ["Synthetic release-check result for advisor review."],
  };
}

function nextSmokeTermLabel() {
  const next = nextGeneratedPathTerm({
    includeSummer: true,
    ...parseGeneratedPathTerm(smokeStartTerm, true),
  });
  return `${next.term} ${next.year}`;
}

function generatedTerm(
  index: number,
  label: string,
  items: Array<{
    kind: string;
    label: string;
    courseCodes: string[];
    credits: number;
    reason: string;
  }>,
) {
  const draftCredits = items.reduce((total, item) => total + item.credits, 0);
  return {
    label,
    index,
    plannedCredits: draftCredits,
    lockedCredits: 0,
    draftCredits,
    items,
    warnings: [],
  };
}

function setPageHeaders(response: ServerResponse) {
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; frame-ancestors 'none'",
  );
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
}

function sendPrivateJson(
  response: ServerResponse,
  status: number,
  value: unknown,
) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  sendJson(response, status, value);
}

function sendJson(response: ServerResponse, status: number, value: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(value));
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function makePng(width: number, height: number, invalidCompressedData = false) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const scanlines = Buffer.alloc((width * 4 + 1) * height);

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makePngChunk("IHDR", header),
    makePngChunk(
      "IDAT",
      invalidCompressedData
        ? Buffer.from([0x78, 0x9c, 0x00])
        : deflateSync(scanlines),
    ),
    makePngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function makePngChunk(type: string, data: Buffer) {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function runSmoke(origin: string, commit: string | undefined) {
  const environment = {
    ...process.env,
    DEPLOYED_APP_URL: origin,
    RELEASE_HEALTH_TOKEN: releaseHealthToken,
    ...(commit ? { EXPECTED_COMMIT_SHA: commit } : {}),
  };
  if (!commit) {
    delete environment.EXPECTED_COMMIT_SHA;
  }

  return execFileAsync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      path.resolve("scripts", "smoke-production.ts"),
    ],
    {
      cwd: process.cwd(),
      env: environment,
      timeout: 30_000,
    },
  );
}
