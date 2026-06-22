import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMajorAcademicSourceManifest,
  formatMajorAcademicSourceFetchDryRun,
  GENERATED_MAJOR_SOURCE_SEEDS_PATH,
  MAJOR_ACADEMIC_SOURCE_MANIFEST_PATH,
  planMajorAcademicSourceFetches,
  type GeneratedMajorSourceSeed,
} from "../src/lib/sources/major-academic-sources.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const seedPath = path.join(projectRoot, ...GENERATED_MAJOR_SOURCE_SEEDS_PATH.split("/"));
const manifestPath = path.join(projectRoot, ...MAJOR_ACADEMIC_SOURCE_MANIFEST_PATH.split("/"));

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const seeds = JSON.parse(readFileSync(seedPath, "utf8")) as GeneratedMajorSourceSeed[];
  const plans = planMajorAcademicSourceFetches(seeds);

  console.log(formatMajorAcademicSourceFetchDryRun(plans));
  console.log(`Seed file: ${GENERATED_MAJOR_SOURCE_SEEDS_PATH}`);
  console.log(`Mode: ${dryRun ? "dry-run" : "fetch"}`);

  if (dryRun) {
    console.log("Dry run complete. No files were written and no URLs were fetched.");
    return;
  }

  const fetchedAt = new Date().toISOString().slice(0, 10);
  const failures: string[] = [];

  for (const plan of plans) {
    try {
      const outputPath = path.join(projectRoot, ...plan.outputPath.split("/"));
      const html = await fetchSource(plan.seed.url);
      mkdirSync(path.dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, html);
      console.log(`Fetched ${plan.seed.id} (${html.length} characters).`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      failures.push(`${plan.seed.id}: ${detail}`);
      console.error(`Failed ${plan.seed.id}: ${detail}`);
    }
  }

  const manifest = buildMajorAcademicSourceManifest(plans, fetchedAt);
  mkdirSync(path.dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${MAJOR_ACADEMIC_SOURCE_MANIFEST_PATH}`);

  if (failures.length > 0) {
    throw new Error(
      `Major source fetch completed with ${failures.length} failure(s):\n${failures.map((failure) => `- ${failure}`).join("\n")}`,
    );
  }
}

async function fetchSource(url: string) {
  const response = await fetchWithRetry(url);

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

async function fetchWithRetry(url: string) {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetch(url, {
        headers: {
          "User-Agent": "AuburnAcademicPlannerMajorSourceFetcher/1.0",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
        },
      });
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
