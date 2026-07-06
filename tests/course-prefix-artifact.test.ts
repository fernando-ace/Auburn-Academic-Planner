import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  extractAuburnCoursePrefixes,
  formatGeneratedPrefixModule,
} from "../scripts/generate-auburn-course-prefixes.ts";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");

test("generated course-prefix artifact matches Auburn course index", async () => {
  const html = await readFile(
    path.join(
      projectRoot,
      "sources",
      "auburn",
      "curated",
      "auburn-courses-of-instruction-index.html",
    ),
    "utf8",
  );
  const generatedModule = await readFile(
    path.join(
      projectRoot,
      "src",
      "lib",
      "courses",
      "auburn-course-prefixes.generated.ts",
    ),
    "utf8",
  );
  const expectedModule = `${formatGeneratedPrefixModule(
    extractAuburnCoursePrefixes(html),
  )}\n`;

  assert.equal(generatedModule, expectedModule);
});

test("course-prefix drift check detects a stale generated module", async () => {
  const html = await readFile(
    path.join(
      projectRoot,
      "sources",
      "auburn",
      "curated",
      "auburn-courses-of-instruction-index.html",
    ),
    "utf8",
  );
  const expectedModule = `${formatGeneratedPrefixModule(
    extractAuburnCoursePrefixes(html),
  )}\n`;
  const staleModule = expectedModule.replace('  "AERO",\n', "");

  assert.notEqual(staleModule, expectedModule);
});
