import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  ACADEMIC_SOURCE_SEED_PATH,
  classifyAcademicSource,
  validateAcademicSourceSeeds,
  type AcademicSourceSeed,
} from "../src/lib/sources/source-scope.ts";

const projectRoot = process.cwd();
const seeds = JSON.parse(
  readFileSync(path.join(projectRoot, ...ACADEMIC_SOURCE_SEED_PATH.split("/")), "utf8"),
) as AcademicSourceSeed[];

test("seed file validates required metadata fields", () => {
  const result = validateAcademicSourceSeeds(seeds);

  assert.equal(result.passed, true);
  assert.deepEqual(result.errors, []);
});

test("only RAG or excluded statuses are accepted", () => {
  const invalidSeeds = [
    {
      ...seeds[0],
      status: "deterministic_rule_source",
    },
  ];
  const result = validateAcademicSourceSeeds(invalidSeeds);

  assert.equal(result.passed, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("status must be one of: rag_only, excluded"),
    ),
  );
});

test("academic and curated Auburn source URLs classify correctly", () => {
  assert.equal(
    classifyAcademicSource("https://bulletin.auburn.edu/undergraduate/majors/"),
    "eligible_academic_source",
  );
  assert.equal(
    classifyAcademicSource("https://bulletin.auburn.edu/coursesofinstruction/"),
    "eligible_academic_source",
  );
  assert.equal(
    classifyAcademicSource(
      "https://www.auburn.edu/administration/registrar/degreeworks",
      seeds,
    ),
    "rag_only",
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
