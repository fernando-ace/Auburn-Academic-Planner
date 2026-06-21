import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCuratedAcademicSourceManifest,
  CURATED_ACADEMIC_SOURCE_MANIFEST_PATH,
  planCuratedAcademicSourceFetches,
} from "../src/lib/sources/curated-academic-sources.ts";
import {
  ACADEMIC_SOURCE_SEED_PATH,
  validateAcademicSourceSeeds,
  type AcademicSourceSeed,
} from "../src/lib/sources/source-scope.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const seedPath = path.join(projectRoot, ...ACADEMIC_SOURCE_SEED_PATH.split("/"));
const curatedManifestPath = path.join(
  projectRoot,
  ...CURATED_ACADEMIC_SOURCE_MANIFEST_PATH.split("/"),
);

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const seeds = readSeeds();
  const validation = validateAcademicSourceSeeds(seeds);
  if (!validation.passed) {
    throw new Error(
      `Academic source seed validation failed:\n${validation.errors.map((error) => `- ${error}`).join("\n")}`,
    );
  }

  const plans = planCuratedAcademicSourceFetches(seeds);

  console.log("Curated academic source fetch plan");
  console.log(`Seed file: ${ACADEMIC_SOURCE_SEED_PATH}`);
  console.log(`Eligible RAG-only sources: ${plans.length}`);
  console.log(`Mode: ${dryRun ? "dry-run" : "fetch"}`);

  for (const plan of plans) {
    console.log(`- ${plan.seed.id}: ${plan.seed.url} -> ${plan.outputPath}`);
  }

  if (dryRun) {
    console.log("Dry run complete. No files were written and no URLs were fetched.");
    return;
  }

  const fetchedAt = new Date().toISOString().slice(0, 10);
  const manifest = buildCuratedAcademicSourceManifest(plans, fetchedAt);

  for (const plan of plans) {
    const outputPath = path.join(projectRoot, ...plan.outputPath.split("/"));
    const html = await fetchSource(plan.seed.url);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, html);
    console.log(`Fetched ${plan.seed.id} (${html.length} characters).`);
  }

  mkdirSync(path.dirname(curatedManifestPath), { recursive: true });
  writeFileSync(curatedManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${CURATED_ACADEMIC_SOURCE_MANIFEST_PATH}`);
}

function readSeeds() {
  return JSON.parse(readFileSync(seedPath, "utf8")) as AcademicSourceSeed[];
}

async function fetchSource(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AuburnAcademicPlannerSourceFetcher/1.0",
      Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) {
    throw new Error(`Fetch returned unsupported content type for ${url}: ${contentType}`);
  }

  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`Fetch returned empty content for ${url}`);
  }

  return text;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
