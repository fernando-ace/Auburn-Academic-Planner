import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildMajorAcademicSourceManifest,
  discoverAuburnMajorSourcesFromIndex,
  formatMajorSourceDiscoveryDryRun,
  normalizeMajorUrl,
  planMajorAcademicSourceFetches,
  validateMajorAcademicSources,
  type GeneratedMajorSourceSeed,
} from "../src/lib/sources/major-academic-sources.ts";

const projectRoot = process.cwd();
const fixtureIndexHtml = `
  <html><body>
    <div id="textcontainer">
      <h2>College of Example</h2>
      <a href="/undergraduate/collegeofexample/dept/accountancy_major/">Accountancy - BSBA</a>
      <a href="/undergraduate/collegeofexample/dept/accountancy_major/#overview">Accountancy</a>
      <a href="https://bulletin.auburn.edu/undergraduate/collegeofexample/dept/finance_major/index.html?x=1">Finance - BSBA</a>
      <a href="/undergraduate/minors/accounting_minor/">Accounting Minor</a>
      <a href="/Policies/Academic/transfercredit/">Transfer Policy</a>
      <a href="https://example.com/undergraduate/collegeofexample/dept/bad_major/">Bad Host</a>
    </div>
    Auburn Bulletin 2025-2026
  </body></html>
`;

test("major discovery includes only official undergraduate Bulletin major links", () => {
  const report = discoverAuburnMajorSourcesFromIndex({
    generatedAt: "2026-06-22T12:00:00.000Z",
    html: fixtureIndexHtml,
  });

  assert.equal(report.rawLinkCount, 6);
  assert.equal(report.discoveredCount, 2);
  assert.equal(report.duplicateCount, 1);
  assert.equal(report.skippedCount, 3);
  assert.deepEqual(
    report.sources.map((source) => source.url),
    [
      "https://bulletin.auburn.edu/undergraduate/collegeofexample/dept/accountancy_major/",
      "https://bulletin.auburn.edu/undergraduate/collegeofexample/dept/finance_major/",
    ],
  );
});

test("generated major source IDs are stable, unique, and RAG-only", () => {
  const report = discoverAuburnMajorSourcesFromIndex({
    generatedAt: "2026-06-22T12:00:00.000Z",
    html: fixtureIndexHtml,
  });

  assert.deepEqual(
    report.sources.map((source) => source.id),
    ["auburn-major-accountancy", "auburn-major-finance"],
  );
  assert.equal(new Set(report.sources.map((source) => source.id)).size, 2);

  for (const source of report.sources) {
    assert.equal(source.type, "bulletin_major");
    assert.equal(source.status, "rag_only");
    assert.match(source.notes, /RAG-only/i);
    assert.equal(source.catalogYear, "2025-2026");
    assert.equal(source.college, "College of Example");
  }
});

test("major URL normalization rejects non-major and non-Bulletin URLs", () => {
  assert.equal(
    normalizeMajorUrl(
      "https://bulletin.auburn.edu/undergraduate/collegeofbusiness/finance_major/index.html#text",
    ),
    "https://bulletin.auburn.edu/undergraduate/collegeofbusiness/finance_major/",
  );
  assert.equal(
    normalizeMajorUrl("https://bulletin.auburn.edu/undergraduate/minors/foo_minor/"),
    null,
  );
  assert.equal(
    normalizeMajorUrl("https://www.auburn.edu/undergraduate/college/foo_major/"),
    null,
  );
});

test("major fetch planning and manifest preserve RAG-only metadata", () => {
  const seeds = discoverAuburnMajorSourcesFromIndex({
    generatedAt: "2026-06-22T12:00:00.000Z",
    html: fixtureIndexHtml,
  }).sources;
  const plans = planMajorAcademicSourceFetches(seeds);
  const manifest = buildMajorAcademicSourceManifest(plans, "2026-06-22");

  assert.equal(plans[0].outputPath, "sources/auburn/majors/auburn-major-accountancy.html");
  assert.deepEqual(
    manifest.map((entry) => [entry.id, entry.type, entry.status, entry.fileName]),
    [
      [
        "auburn-major-accountancy",
        "bulletin_major",
        "rag_only",
        "auburn/majors/auburn-major-accountancy.html",
      ],
      [
        "auburn-major-finance",
        "bulletin_major",
        "rag_only",
        "auburn/majors/auburn-major-finance.html",
      ],
    ],
  );
});

test("major source validation rejects deterministic-rule status", () => {
  const [seed] = discoverAuburnMajorSourcesFromIndex({
    generatedAt: "2026-06-22T12:00:00.000Z",
    html: fixtureIndexHtml,
  }).sources;
  const invalidSeed = {
    ...seed,
    status: "deterministic_rule_source",
  } as unknown as GeneratedMajorSourceSeed;
  const result = validateMajorAcademicSources({
    manifest: undefined,
    reader: {
      hasFile: () => false,
      readText: () => undefined,
    },
    seeds: [invalidSeed],
  });

  assert.equal(result.passed, false);
  assert.ok(result.errors.some((error) => error.includes("status must be rag_only")));
});

test("major discovery dry-run prints counts and writes nothing", () => {
  const output = execFileSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/discover-auburn-major-sources.ts",
      "--dry-run",
    ],
    { cwd: projectRoot, encoding: "utf8" },
  );

  assert.match(output, /Auburn Bulletin undergraduate major source discovery/);
  assert.match(output, /Discovered major pages: \d+/);
  assert.match(output, /Dry run complete\. No files were written and no URLs were fetched\./);
});

test("source upload dry-run separates curated and major counts", () => {
  const output = execFileSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/create-gemini-file-search-store.ts",
      "--dry-run",
    ],
    { cwd: projectRoot, encoding: "utf8" },
  );

  assert.match(output, /Curated sources: 7/);
  assert.match(output, /All-major RAG-only sources: \d+/);
  assert.match(output, /Total upload count: \d+/);
});

test("checked-in generated major seeds stay RAG-only", () => {
  const seeds = JSON.parse(
    readFileSync(
      path.join(projectRoot, "sources/auburn/generated-major-source-seeds.json"),
      "utf8",
    ),
  ) as GeneratedMajorSourceSeed[];

  assert.ok(seeds.length > 100);
  assert.equal(seeds.every((seed) => seed.status === "rag_only"), true);
  assert.equal(seeds.every((seed) => seed.type === "bulletin_major"), true);
});

test("formats major source discovery report with sample list", () => {
  const report = discoverAuburnMajorSourcesFromIndex({
    generatedAt: "2026-06-22T12:00:00.000Z",
    html: fixtureIndexHtml,
  });
  const output = formatMajorSourceDiscoveryDryRun(report);

  assert.match(output, /Sample discovered sources:/);
  assert.match(output, /auburn-major-accountancy/);
});
