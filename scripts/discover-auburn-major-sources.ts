import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AUBURN_MAJOR_INDEX_SOURCE_PATH,
  discoverAuburnMajorSourcesFromIndex,
  formatMajorSourceDiscoveryDryRun,
  GENERATED_MAJOR_SOURCE_SEEDS_PATH,
} from "../src/lib/sources/major-academic-sources.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const indexPath = path.join(projectRoot, ...AUBURN_MAJOR_INDEX_SOURCE_PATH.split("/"));
const outputPath = path.join(projectRoot, ...GENERATED_MAJOR_SOURCE_SEEDS_PATH.split("/"));

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const generatedAt = new Date().toISOString();
  const html = readFileSync(indexPath, "utf8");
  const report = discoverAuburnMajorSourcesFromIndex({ generatedAt, html });

  console.log(formatMajorSourceDiscoveryDryRun(report));
  console.log(`Index file: ${AUBURN_MAJOR_INDEX_SOURCE_PATH}`);
  console.log(`Mode: ${dryRun ? "dry-run" : "write"}`);

  if (dryRun) {
    console.log("Dry run complete. No files were written and no URLs were fetched.");
    return;
  }

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report.sources, null, 2)}\n`);
  console.log(`Wrote ${GENERATED_MAJOR_SOURCE_SEEDS_PATH}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
