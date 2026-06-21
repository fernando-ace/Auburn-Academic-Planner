import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildCuratedAcademicSourceManifest,
  formatCuratedAcademicSourceDryRun,
  planCuratedAcademicSourceFetches,
  validateCuratedAcademicSources,
  type CuratedAcademicSourceManifestEntry,
} from "../src/lib/sources/curated-academic-sources.ts";
import {
  ACADEMIC_SOURCE_SEED_PATH,
  type AcademicSourceSeed,
} from "../src/lib/sources/source-scope.ts";

const projectRoot = process.cwd();
const seeds = JSON.parse(
  readFileSync(path.join(projectRoot, ...ACADEMIC_SOURCE_SEED_PATH.split("/")), "utf8"),
) as AcademicSourceSeed[];
const expectedEligibleSourceIds = [
  "auburn-undergraduate-majors-index",
  "auburn-courses-of-instruction-index",
  "auburn-computer-science-online-bulletin",
  "auburn-csse-department-bulletin",
  "auburn-engineering-undergraduate-majors",
  "auburn-core-curriculum",
  "auburn-registrar-degreeworks",
  "auburn-registrar-credit-tables",
  "auburn-transfer-credit-policy",
  "auburn-pathways-transfer-credit",
];

test("fetch planning includes eligible RAG-only seeds and excludes rule sources", () => {
  const plans = planCuratedAcademicSourceFetches(seeds);
  const plannedIds = new Set(plans.map((plan) => plan.seed.id));

  assert.equal(plans.length, 10);
  assert.deepEqual([...plannedIds], expectedEligibleSourceIds);
  assert.equal(plannedIds.has("auburn-computer-science-bulletin"), false);
  assert.equal(plannedIds.has("auburn-software-engineering-bulletin"), false);
  assert.equal(plannedIds.has("auburn-ai-engineering-certificate"), false);
});

test("fetch planning creates unique complete output paths", () => {
  const plans = planCuratedAcademicSourceFetches(seeds);
  const ids = plans.map((plan) => plan.seed.id);
  const outputPaths = plans.map((plan) => plan.outputPath);

  assert.equal(new Set(ids).size, expectedEligibleSourceIds.length);
  assert.equal(new Set(outputPaths).size, expectedEligibleSourceIds.length);

  for (const plan of plans) {
    assert.equal(plan.outputPath, `sources/auburn/curated/${plan.seed.id}.html`);
    assert.match(plan.outputPath, /^sources\/auburn\/curated\/[a-z0-9-]+\.html$/);
    assert.equal(plan.outputPath.includes(" "), false);
    assert.equal(plan.outputPath.includes("undefined"), false);
    assert.ok(plan.outputPath.length > "sources/auburn/curated/.html".length);
  }
});

test("dry run prints the fetch plan without fetching URLs", () => {
  const output = execFileSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/fetch-academic-sources.ts",
      "--dry-run",
    ],
    { cwd: projectRoot, encoding: "utf8" },
  );

  assert.match(output, /Curated academic source fetch plan/);
  assert.match(output, /Mode: dry-run/);
  assert.match(output, /Dry run complete\. No files were written and no URLs were fetched\./);
});

test("dry run text includes every eligible source exactly once", () => {
  const plans = planCuratedAcademicSourceFetches(seeds);
  const output = formatCuratedAcademicSourceDryRun(plans);
  const sourceLines = output
    .split(/\r?\n/)
    .filter((line) => line.startsWith("Source "));

  assert.equal(sourceLines.length, expectedEligibleSourceIds.length);
  assert.match(output, /Eligible RAG-only sources: 10/);

  for (const id of expectedEligibleSourceIds) {
    const matchingLines = sourceLines.filter((line) => line.includes(`id=${id} |`));
    assert.equal(matchingLines.length, 1, id);

    const line = matchingLines[0];
    assert.match(line, / \| url=https:\/\/.+ \| outputPath=sources\/auburn\/curated\/[a-z0-9-]+\.html$/);
    assert.equal(line.includes("outputPath=sources/auburn/curated/.html"), false);
    assert.equal(line.includes("outputPath=sources/auburn/curated/auburn- "), false);
  }
});

test("excluded sources cannot be planned for curated fetch", () => {
  const excludedSeed: AcademicSourceSeed = {
    id: "auburn-athletics-news",
    title: "Auburn Athletics News",
    url: "https://auburntigers.com/sports/football",
    type: "advising",
    college: null,
    department: null,
    catalogYear: null,
    status: "excluded",
    lastChecked: "2026-06-21",
    notes: "Out of scope.",
  };
  const plans = planCuratedAcademicSourceFetches([...seeds, excludedSeed]);

  assert.equal(plans.some((plan) => plan.seed.id === excludedSeed.id), false);
});

test("generated curated manifest preserves source metadata", () => {
  const [plan] = planCuratedAcademicSourceFetches(seeds);
  assert.ok(plan);

  const [entry] = buildCuratedAcademicSourceManifest([plan], "2026-06-21");

  assert.deepEqual(entry, {
    id: plan.seed.id,
    title: plan.seed.title,
    url: plan.seed.url,
    type: plan.seed.type,
    status: "rag_only",
    college: plan.seed.college,
    department: plan.seed.department,
    catalogYear: plan.seed.catalogYear,
    seedLastChecked: plan.seed.lastChecked,
    fetchedAt: "2026-06-21",
    fileName: `auburn/curated/${plan.seed.id}.html`,
    contentType: "text/html",
  });
});

test("curated validation accepts matching non-empty cached sources", () => {
  const [plan] = planCuratedAcademicSourceFetches(seeds);
  const manifest = buildCuratedAcademicSourceManifest([plan], "2026-06-21");
  const result = validateCuratedAcademicSources(manifest, seeds, {
    hasFile: (relativePath) => relativePath === `sources/${plan.fileName}`,
    readText: (relativePath) =>
      relativePath === `sources/${plan.fileName}` ? "<html>Auburn source</html>" : undefined,
  });

  assert.equal(result.passed, true);
  assert.deepEqual(result.errors, []);
});

test("curated validation fails for missing files, empty files, and metadata drift", () => {
  const [plan] = planCuratedAcademicSourceFetches(seeds);
  const [entry] = buildCuratedAcademicSourceManifest([plan], "2026-06-21");
  const missingResult = validateCuratedAcademicSources([entry], seeds, {
    hasFile: () => false,
    readText: () => undefined,
  });

  assert.equal(missingResult.passed, false);
  assert.ok(missingResult.errors.some((error) => error.includes("does not exist")));

  const emptyResult = validateCuratedAcademicSources([entry], seeds, {
    hasFile: () => true,
    readText: () => "   ",
  });

  assert.equal(emptyResult.passed, false);
  assert.ok(emptyResult.errors.some((error) => error.includes("is empty")));

  const driftedEntry: CuratedAcademicSourceManifestEntry = {
    ...entry,
    title: "Changed title",
  };
  const driftResult = validateCuratedAcademicSources([driftedEntry], seeds, {
    hasFile: () => true,
    readText: () => "<html>ok</html>",
  });

  assert.equal(driftResult.passed, false);
  assert.ok(driftResult.errors.some((error) => error.includes(".title expected")));
});

test("RAG-only sources cannot become deterministic rule sources automatically", () => {
  const [plan] = planCuratedAcademicSourceFetches(seeds);
  const [entry] = buildCuratedAcademicSourceManifest([plan], "2026-06-21");
  const invalidEntry = {
    ...entry,
    status: "deterministic_rule_source",
  };

  const result = validateCuratedAcademicSources([invalidEntry], seeds, {
    hasFile: () => true,
    readText: () => "<html>ok</html>",
  });

  assert.equal(result.passed, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("cannot become deterministic_rule_source"),
    ),
  );
});
