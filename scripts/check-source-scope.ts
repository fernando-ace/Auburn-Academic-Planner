import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ACADEMIC_SOURCE_SEED_PATH,
  classifyAcademicSource,
  validateAcademicSourceSeeds,
  type AcademicSourceSeed,
} from "../src/lib/sources/source-scope.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const seedPath = path.join(projectRoot, ...ACADEMIC_SOURCE_SEED_PATH.split("/"));

const seeds = JSON.parse(readFileSync(seedPath, "utf8")) as AcademicSourceSeed[];
const validation = validateAcademicSourceSeeds(seeds);
const classifications = seeds.map((seed) => ({
  id: seed.id,
  status: seed.status,
  classification: classifyAcademicSource(seed, seeds),
}));

const invalidClassifications = classifications.filter((result) => {
  if (result.status === "excluded") {
    return result.classification !== "excluded";
  }

  return result.classification === "excluded";
});

console.log("Source scope: CHECK");
console.log(`Seed file: ${ACADEMIC_SOURCE_SEED_PATH}`);
console.log(`Seeds checked: ${seeds.length}`);
console.log(`Metadata errors: ${validation.errors.length}`);
console.log(`Classification errors: ${invalidClassifications.length}`);

if (validation.errors.length > 0) {
  console.log("\nMetadata errors:");
  for (const error of validation.errors) console.log(`- ${error}`);
}

if (invalidClassifications.length > 0) {
  console.log("\nClassification errors:");
  for (const result of invalidClassifications) {
    console.log(`- ${result.id}: ${result.status} classified as ${result.classification}`);
  }
}

if (!validation.passed || invalidClassifications.length > 0) {
  console.log("\nSource scope: FAIL");
  process.exitCode = 1;
} else {
  console.log("Source scope: PASS");
}
