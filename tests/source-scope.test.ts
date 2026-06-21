import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  ACADEMIC_SOURCE_SEED_PATH,
  assertNoExcludedDeterministicSources,
  classifyAcademicSource,
  deterministicRuleSourceIds,
  isDeterministicRuleSource,
  validateAcademicSourceSeeds,
  type AcademicSourceSeed,
} from "../src/lib/sources/source-scope.ts";

const projectRoot = process.cwd();
const seeds = JSON.parse(
  readFileSync(path.join(projectRoot, ...ACADEMIC_SOURCE_SEED_PATH.split("/")), "utf8"),
) as AcademicSourceSeed[];

test("bulletin major page is eligible", () => {
  assert.equal(
    classifyAcademicSource("https://bulletin.auburn.edu/undergraduate/majors/"),
    "eligible_academic_source",
  );
});

test("courses of instruction page is eligible", () => {
  assert.equal(
    classifyAcademicSource("https://bulletin.auburn.edu/coursesofinstruction/"),
    "eligible_academic_source",
  );
});

test("athletics, news, random pages, and unrelated PDFs are excluded", () => {
  const excludedUrls = [
    "https://auburntigers.com/sports/football",
    "https://www.auburn.edu/news/article/example",
    "https://example.com/auburn-degree-requirements",
    "https://www.auburn.edu/random/file.pdf",
  ];

  for (const url of excludedUrls) {
    assert.equal(classifyAcademicSource(url, seeds), "excluded", url);
  }
});

test("current deterministic rule sources classify correctly", () => {
  for (const sourceId of deterministicRuleSourceIds) {
    const seed = seeds.find((entry) => entry.id === sourceId);
    assert.ok(seed, `Missing seed for ${sourceId}`);
    assert.equal(isDeterministicRuleSource(seed), true);
    assert.equal(classifyAcademicSource(seed, seeds), "deterministic_rule_candidate");
  }
});

test("seed file validates required metadata fields", () => {
  const result = validateAcademicSourceSeeds(seeds);

  assert.equal(result.passed, true);
  assert.deepEqual(result.errors, []);
});

test("excluded sources cannot become deterministic rule sources", () => {
  const invalidSeeds: AcademicSourceSeed[] = [
    {
      id: "auburn-computer-science-bulletin",
      title: "Invalid Athletics Rule Source",
      url: "https://auburntigers.com/sports/football",
      type: "bulletin_major",
      college: "Samuel Ginn College of Engineering",
      department: "Computer Science and Software Engineering",
      catalogYear: "2025-2026",
      status: "deterministic_rule_source",
      lastChecked: "2026-06-21",
      notes: "This should fail because athletics pages are excluded.",
    },
  ];

  const validation = validateAcademicSourceSeeds(invalidSeeds);
  const explicitGuardErrors = assertNoExcludedDeterministicSources(invalidSeeds);

  assert.equal(validation.passed, false);
  assert.ok(
    validation.errors.some((error) =>
      error.includes("excluded") && error.includes("deterministic_rule_source"),
    ),
  );
  assert.ok(explicitGuardErrors.length > 0);
});
