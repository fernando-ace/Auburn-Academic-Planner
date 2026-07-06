import { readFileSync } from "node:fs";
import path from "node:path";

import { AUBURN_COURSE_PREFIXES } from "../src/lib/courses/auburn-course-prefixes.generated.ts";
import {
  extractAuburnCoursePrefixes,
  formatGeneratedPrefixModule,
} from "./generate-auburn-course-prefixes.ts";

const projectRoot = process.cwd();
const catalogIndexPath = path.join(
  projectRoot,
  "sources",
  "auburn",
  "curated",
  "auburn-courses-of-instruction-index.html",
);
const generatedPath = path.join(
  projectRoot,
  "src",
  "lib",
  "courses",
  "auburn-course-prefixes.generated.ts",
);

const html = readFileSync(catalogIndexPath, "utf8");
const expectedPrefixes = extractAuburnCoursePrefixes(html);
const expectedModule = `${formatGeneratedPrefixModule(expectedPrefixes)}\n`;
const actualModule = readFileSync(generatedPath, "utf8");

if (actualModule !== expectedModule) {
  console.error(
    "Auburn course prefix artifact is out of date. Run npm run courses:prefixes:generate.",
  );
  process.exit(1);
}

if (expectedPrefixes.join("\n") !== AUBURN_COURSE_PREFIXES.join("\n")) {
  console.error("Generated prefix module does not match its exported values.");
  process.exit(1);
}

console.log(`Auburn course prefix artifact is current (${expectedPrefixes.length} prefixes).`);
