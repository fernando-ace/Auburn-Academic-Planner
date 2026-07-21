import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkProjectSourceIntegrity } from "../src/lib/sources/source-integrity-filesystem.ts";
import {
  checkLiveSourceFreshness,
  createLiveSourceFetcher,
  type LiveSourceEntry,
} from "../src/lib/sources/live-source-freshness.ts";
import { CURATED_ACADEMIC_SOURCE_MANIFEST_PATH } from "../src/lib/sources/curated-academic-sources.ts";
import { MAJOR_ACADEMIC_SOURCE_MANIFEST_PATH } from "../src/lib/sources/major-academic-sources.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

async function main() {
  const integrity = checkProjectSourceIntegrity({ projectRoot });
  if (!integrity.passed) {
    console.error("Live source freshness: FAIL");
    console.error("Local source integrity must pass before live URLs are checked.");
    printList("Integrity errors", integrity.errors);
    printList("Missing files", integrity.missingFiles);
    process.exitCode = 1;
    return;
  }

  const entries = [
    ...readManifest(CURATED_ACADEMIC_SOURCE_MANIFEST_PATH),
    ...readManifest(MAJOR_ACADEMIC_SOURCE_MANIFEST_PATH),
  ];
  const result = await checkLiveSourceFreshness({
    entries,
    dependencies: {
      fetchSource: createLiveSourceFetcher(),
      random: Math.random,
      readCachedSource(fileName) {
        return readFileSync(
          path.join(projectRoot, "sources", ...fileName.split("/")),
          "utf8",
        );
      },
      sleep(milliseconds) {
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
      },
    },
  });

  console.log(`Live source freshness: ${result.passed ? "PASS" : "FAIL"}`);
  console.log(`Sources checked: ${result.checkedCount}`);
  console.log(`Unchanged: ${result.unchangedCount}`);
  console.log(`Retries: ${result.retryCount}`);
  console.log(`Drift findings: ${result.drift.length}`);
  console.log(`Unavailable sources: ${result.unavailable.length}`);

  if (result.drift.length > 0) {
    console.log("\nDrift findings:");
    for (const finding of result.drift) {
      console.log(`- ${finding.id} | ${finding.url}`);
      console.log(`  file=${finding.fileName}`);
      console.log(
        `  cached=sha256:${finding.cached.sha256} bytes:${finding.cached.bytes}`,
      );
      console.log(
        `  live=sha256:${finding.live.sha256} bytes:${finding.live.bytes}`,
      );
    }
  }

  if (result.unavailable.length > 0) {
    console.log("\nUnavailable sources:");
    for (const finding of result.unavailable) {
      console.log(
        `- ${finding.id} | ${finding.url} | attempts=${finding.attempts} | ${finding.reason}`,
      );
    }
  }

  if (!result.passed) {
    process.exitCode = 1;
  }
}

function readManifest(relativePath: string): LiveSourceEntry[] {
  const manifestPath = path.join(projectRoot, ...relativePath.split("/"));
  const value = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
  if (!Array.isArray(value)) {
    throw new TypeError(`${relativePath} must contain a top-level array.`);
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new TypeError(`${relativePath}[${index}] must be an object.`);
    }

    const id = requiredString(entry.id, `${relativePath}[${index}].id`);
    const url = requiredString(entry.url, `${relativePath}[${index}].url`);
    const fileName = requiredString(
      entry.fileName,
      `${relativePath}[${index}].fileName`,
    );
    return { id, url, fileName };
  });
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function printList(label: string, values: string[]) {
  if (values.length === 0) {
    return;
  }
  console.error(`\n${label}:`);
  for (const value of values) {
    console.error(`- ${value}`);
  }
}

main().catch((error) => {
  console.error("Live source freshness: FAIL");
  console.error(error instanceof Error ? error.message : "Unknown live-check error.");
  process.exitCode = 1;
});
