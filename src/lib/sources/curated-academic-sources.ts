import {
  classifyAcademicSource,
  isDeterministicRuleSource,
  type AcademicSourceSeed,
  type AcademicSourceStatus,
  type AcademicSourceType,
} from "./source-scope.ts";

export const CURATED_ACADEMIC_SOURCE_DIR = "sources/auburn/curated";
export const CURATED_ACADEMIC_SOURCE_MANIFEST_PATH =
  "sources/auburn/curated/manifest.json";

export type CuratedAcademicSourceManifestEntry = {
  id: string;
  title: string;
  url: string;
  type: AcademicSourceType;
  status: AcademicSourceStatus;
  college: string | null;
  department: string | null;
  catalogYear: string | null;
  seedLastChecked: string;
  fetchedAt: string;
  fileName: string;
  contentType: string;
};

export type CuratedAcademicSourceFetchPlan = {
  seed: AcademicSourceSeed;
  fileName: string;
  outputPath: string;
  contentType: string;
};

export type CuratedAcademicSourceValidationResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
};

export type CuratedAcademicSourceValidationReader = {
  hasFile(relativePath: string): boolean;
  readText(relativePath: string): string | undefined;
};

export function formatCuratedAcademicSourceDryRun(
  plans: CuratedAcademicSourceFetchPlan[],
) {
  const lines = [
    "Curated academic source fetch plan",
    `Eligible RAG-only sources: ${plans.length}`,
  ];

  for (const [index, plan] of plans.entries()) {
    lines.push(
      `Source ${String(index + 1).padStart(2, "0")}/${String(plans.length).padStart(2, "0")}: id=${plan.seed.id} | url=${plan.seed.url} | outputPath=${plan.outputPath}`,
    );
  }

  return lines.join("\n");
}

export function planCuratedAcademicSourceFetches(
  seeds: AcademicSourceSeed[],
): CuratedAcademicSourceFetchPlan[] {
  return seeds
    .filter((seed) => isCuratedFetchEligible(seed, seeds))
    .map((seed) => {
      const fileName = `auburn/curated/${safeCuratedSourceFileBase(seed.id)}.html`;
      return {
        seed,
        fileName,
        outputPath: `sources/${fileName}`,
        contentType: "text/html",
      };
    });
}

export function isCuratedFetchEligible(
  seed: AcademicSourceSeed,
  seeds: AcademicSourceSeed[],
) {
  if (seed.status !== "rag_only") return false;
  return classifyAcademicSource(seed, seeds) !== "excluded";
}

export function buildCuratedAcademicSourceManifest(
  plans: CuratedAcademicSourceFetchPlan[],
  fetchedAt: string,
): CuratedAcademicSourceManifestEntry[] {
  return plans.map((plan) =>
    buildCuratedAcademicSourceManifestEntry(plan, fetchedAt),
  );
}

export function buildCuratedAcademicSourceManifestEntry(
  plan: CuratedAcademicSourceFetchPlan,
  fetchedAt: string,
): CuratedAcademicSourceManifestEntry {
  return {
    id: plan.seed.id,
    title: plan.seed.title,
    url: plan.seed.url,
    type: plan.seed.type,
    status: plan.seed.status,
    college: plan.seed.college,
    department: plan.seed.department,
    catalogYear: plan.seed.catalogYear,
    seedLastChecked: plan.seed.lastChecked,
    fetchedAt,
    fileName: plan.fileName,
    contentType: plan.contentType,
  };
}

export function validateCuratedAcademicSources(
  manifest: unknown,
  seeds: AcademicSourceSeed[],
  reader: CuratedAcademicSourceValidationReader,
): CuratedAcademicSourceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(manifest)) {
    return {
      passed: false,
      errors: ["sources/auburn/curated/manifest.json must contain a top-level array."],
      warnings,
    };
  }

  const seedById = new Map(seeds.map((seed) => [seed.id, seed]));
  const seenIds = new Set<string>();

  manifest.forEach((entry, index) => {
    const label = `curated[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${label} must be an object.`);
      return;
    }

    const id = stringValue(entry.id);
    if (!id) {
      errors.push(`${label}.id is required.`);
      return;
    }

    if (seenIds.has(id)) {
      errors.push(`${label}.id duplicates ${id}.`);
    }
    seenIds.add(id);

    const seed = seedById.get(id);
    if (!seed) {
      errors.push(`${label}.id ${id} is not present in academic-source-seeds.json.`);
      return;
    }

    if (!isCuratedFetchEligible(seed, seeds)) {
      errors.push(`${id} is not eligible for curated RAG fetch.`);
    }

    if (isDeterministicRuleSource(seed)) {
      errors.push(`${id} is a deterministic rule source and must stay out of the curated RAG cache.`);
    }

    compareString(entry.title, seed.title, `${label}.title`, errors);
    compareString(entry.url, seed.url, `${label}.url`, errors);
    compareString(entry.type, seed.type, `${label}.type`, errors);
    compareString(entry.status, seed.status, `${label}.status`, errors);
    compareNullableString(entry.college, seed.college, `${label}.college`, errors);
    compareNullableString(entry.department, seed.department, `${label}.department`, errors);
    compareNullableString(entry.catalogYear, seed.catalogYear, `${label}.catalogYear`, errors);
    compareString(entry.seedLastChecked, seed.lastChecked, `${label}.seedLastChecked`, errors);

    const expectedFileName = `auburn/curated/${safeCuratedSourceFileBase(seed.id)}.html`;
    compareString(entry.fileName, expectedFileName, `${label}.fileName`, errors);
    compareString(entry.contentType, "text/html", `${label}.contentType`, errors);

    const fetchedAt = stringValue(entry.fetchedAt);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fetchedAt)) {
      errors.push(`${label}.fetchedAt must use YYYY-MM-DD.`);
    }

    if (entry.status === "deterministic_rule_source") {
      errors.push(`${id} cannot become deterministic_rule_source through curated fetch metadata.`);
    }

    const fileName = stringValue(entry.fileName);
    if (!fileName) return;

    if (!isCuratedFileName(fileName)) {
      errors.push(`${label}.fileName must stay under auburn/curated/.`);
      return;
    }

    const relativePath = `sources/${fileName}`;
    if (!reader.hasFile(relativePath)) {
      errors.push(`${relativePath} is listed in curated manifest but does not exist.`);
      return;
    }

    const content = reader.readText(relativePath);
    if (content === undefined || content.trim().length === 0) {
      errors.push(`${relativePath} is empty.`);
    }
  });

  return {
    passed: errors.length === 0,
    errors: unique(errors),
    warnings,
  };
}

export function safeCuratedSourceFileBase(sourceId: string) {
  const normalized = sourceId.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`Invalid curated source id for file name: ${sourceId}`);
  }
  return normalized;
}

function compareString(
  actual: unknown,
  expected: string,
  label: string,
  errors: string[],
) {
  const actualText = stringValue(actual);
  if (actualText !== expected) {
    errors.push(`${label} expected ${expected || "empty"} but found ${actualText || "missing"}.`);
  }
}

function compareNullableString(
  actual: unknown,
  expected: string | null,
  label: string,
  errors: string[],
) {
  if (actual !== expected) {
    errors.push(`${label} expected ${expected ?? "null"} but found ${String(actual ?? "missing")}.`);
  }
}

function isCuratedFileName(fileName: string) {
  const normalized = fileName.replace(/\\/g, "/");
  return (
    normalized.startsWith("auburn/curated/") &&
    !normalized.includes("../") &&
    !normalized.startsWith("/") &&
    normalized.endsWith(".html")
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unique(values: string[]) {
  return [...new Set(values)];
}
