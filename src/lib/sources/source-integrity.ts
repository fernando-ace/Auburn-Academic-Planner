import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const MAX_SOURCE_AGE_DAYS = 180;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const publicRuleDefinitions = [
  {
    ruleFile: "ai-engineering-certificate.json",
    courseField: "requiredCourses",
    aiCertificate: true,
  },
  {
    ruleFile: "software-engineering-degree.json",
    courseField: "exactRequiredCourses",
    aiCertificate: false,
  },
  {
    ruleFile: "computer-science-degree.json",
    courseField: "exactRequiredCourses",
    aiCertificate: false,
  },
] as const;

type ManifestEntry = {
  id?: unknown;
  type?: unknown;
  catalogYear?: unknown;
  fileName?: unknown;
  url?: unknown;
  lastChecked?: unknown;
};

type RuleData = {
  sourceId?: unknown;
  catalogYear?: unknown;
  provenance?: {
    sourceId?: unknown;
    catalogYear?: unknown;
    sourceFile?: unknown;
    sourceUrl?: unknown;
  };
  requiredCourses?: { code?: unknown }[];
  exactRequiredCourses?: { code?: unknown }[];
};

export type SourceIntegrityMismatch = {
  ruleFile: string;
  field: string;
  expected: string;
  actual: string;
};

export type SourceDriftFinding = {
  ruleFile: string;
  sourceFile: string;
  missingCourseCodes: string[];
  missingEvidence: string[];
};

export type SourceIntegrityResult = {
  status: "pass" | "fail";
  passed: boolean;
  checkedAt: string;
  warnings: string[];
  errors: string[];
  missingFiles: string[];
  catalogYearMismatches: SourceIntegrityMismatch[];
  sourceIdMismatches: SourceIntegrityMismatch[];
  driftFindings: SourceDriftFinding[];
  recommendedFixes: string[];
};

export type SourceIntegrityOptions = {
  projectRoot?: string;
  checkedAt?: Date | string;
};

export function checkSourceIntegrity(
  options: SourceIntegrityOptions = {},
): SourceIntegrityResult {
  const projectRoot = options.projectRoot;
  const checkedAtDate = new Date(options.checkedAt ?? new Date());
  const checkedAt = checkedAtDate.toISOString();
  const warnings: string[] = [];
  const errors: string[] = [];
  const missingFiles: string[] = [];
  const catalogYearMismatches: SourceIntegrityMismatch[] = [];
  const sourceIdMismatches: SourceIntegrityMismatch[] = [];
  const driftFindings: SourceDriftFinding[] = [];
  const recommendedFixes: string[] = [];
  const manifestPath = projectRoot
    ? path.join(/*turbopackIgnore: true*/ projectRoot, "sources", "manifest.json")
    : path.join(process.cwd(), "sources", "manifest.json");

  if (!existsSync(manifestPath)) {
    missingFiles.push("sources/manifest.json");
    recommendedFixes.push("Restore sources/manifest.json with metadata for checked-in sources.");
    return finishResult();
  }

  const manifest = readJson(manifestPath, "sources/manifest.json");
  if (!Array.isArray(manifest)) {
    if (manifest !== undefined) {
      errors.push("sources/manifest.json must contain a top-level array.");
    }
    recommendedFixes.push("Fix sources/manifest.json so it is valid JSON with a top-level array.");
    return finishResult();
  }

  const manifestEntries = manifest as ManifestEntry[];
  validateManifestFreshness(manifestEntries);

  const rulesDirectory = projectRoot
    ? path.join(/*turbopackIgnore: true*/ projectRoot, "rules", "auburn")
    : path.join(process.cwd(), "rules", "auburn");
  if (!existsSync(rulesDirectory)) {
    missingFiles.push("rules/auburn");
    recommendedFixes.push("Restore the checked-in rules/auburn directory.");
    return finishResult();
  }

  const ruleDataByFile = new Map<string, RuleData>();
  for (const fileName of readdirSync(rulesDirectory).filter((name) => name.endsWith(".json")).sort()) {
    const relativePath = `rules/auburn/${fileName}`;
    const ruleData = readJson(path.join(rulesDirectory, fileName), relativePath);
    if (!isRecord(ruleData)) continue;

    const rule = ruleData as RuleData;
    ruleDataByFile.set(fileName, rule);
    validateRuleMetadata(relativePath, rule);
  }

  for (const definition of publicRuleDefinitions) {
    const rule = ruleDataByFile.get(definition.ruleFile);
    const rulePath = `rules/auburn/${definition.ruleFile}`;
    if (!rule) {
      if (!missingFiles.includes(rulePath)) missingFiles.push(rulePath);
      recommendedFixes.push(`Restore ${rulePath}.`);
      continue;
    }
    validatePublicRule(rulePath, rule, definition);
  }

  return finishResult();

  function readJson(filePath: string, label: string): unknown {
    try {
      return JSON.parse(readFileSync(filePath, "utf8"));
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown JSON error";
      errors.push(`${label} is not parseable JSON: ${detail}`);
      return undefined;
    }
  }

  function validateManifestFreshness(entries: ManifestEntry[]) {
    for (const [index, entry] of entries.entries()) {
      const sourceId = stringValue(entry.id) || `manifest entry ${index + 1}`;
      const dateText = stringValue(entry.lastChecked);
      if (!dateText || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
        errors.push(`${sourceId} has a missing or invalid lastChecked date.`);
        recommendedFixes.push(`Set ${sourceId} lastChecked to a valid YYYY-MM-DD date after reviewing the local source.`);
        continue;
      }

      const date = new Date(`${dateText}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateText) {
        errors.push(`${sourceId} has a missing or invalid lastChecked date.`);
        recommendedFixes.push(`Set ${sourceId} lastChecked to a valid YYYY-MM-DD date after reviewing the local source.`);
        continue;
      }

      const ageDays = Math.floor((checkedAtDate.getTime() - date.getTime()) / DAY_IN_MS);
      if (ageDays < 0) {
        errors.push(`${sourceId} has a future lastChecked date (${dateText}).`);
        recommendedFixes.push(`Correct the future lastChecked date for ${sourceId}.`);
      } else if (ageDays > MAX_SOURCE_AGE_DAYS) {
        warnings.push(`${sourceId} was last checked ${ageDays} days ago; review the local source for freshness.`);
        recommendedFixes.push(`Review ${sourceId} against an approved Auburn source and update lastChecked if still current.`);
      }
    }
  }

  function validateRuleMetadata(ruleFile: string, rule: RuleData) {
    const topSourceId = stringValue(rule.sourceId);
    const provenanceSourceId = stringValue(rule.provenance?.sourceId);
    const topCatalogYear = stringValue(rule.catalogYear);
    const provenanceCatalogYear = stringValue(rule.provenance?.catalogYear);
    const sourceFile = stringValue(rule.provenance?.sourceFile);

    if (!topSourceId || !provenanceSourceId) {
      sourceIdMismatches.push({
        ruleFile,
        field: "sourceId",
        expected: topSourceId || provenanceSourceId || "non-empty source ID",
        actual: topSourceId && provenanceSourceId ? `${topSourceId} / ${provenanceSourceId}` : "missing",
      });
      recommendedFixes.push(`Add matching top-level and provenance sourceId values to ${ruleFile}.`);
    } else if (topSourceId !== provenanceSourceId) {
      sourceIdMismatches.push({
        ruleFile,
        field: "sourceId",
        expected: topSourceId,
        actual: provenanceSourceId,
      });
      recommendedFixes.push(`Align the top-level and provenance sourceId values in ${ruleFile}.`);
    }

    if (!topCatalogYear || !provenanceCatalogYear || topCatalogYear !== provenanceCatalogYear) {
      catalogYearMismatches.push({
        ruleFile,
        field: "catalogYear",
        expected: topCatalogYear || "non-empty catalog year",
        actual: provenanceCatalogYear || "missing",
      });
      recommendedFixes.push(`Align the top-level and provenance catalogYear values in ${ruleFile}.`);
    }

    if (!sourceFile) {
      errors.push(`${ruleFile} provenance must include sourceFile.`);
      recommendedFixes.push(`Add a root-relative provenance sourceFile to ${ruleFile}.`);
    } else if (!existsSync(resolveProjectFile(sourceFile))) {
      missingFiles.push(sourceFile);
      recommendedFixes.push(`Restore ${sourceFile} or correct the provenance sourceFile in ${ruleFile}.`);
    }
  }

  function validatePublicRule(
    ruleFile: string,
    rule: RuleData,
    definition: (typeof publicRuleDefinitions)[number],
  ) {
    const sourceId = stringValue(rule.sourceId);
    const provenanceSourceId = stringValue(rule.provenance?.sourceId);
    const manifestEntry = manifestEntries.find((entry) => stringValue(entry.id) === sourceId);

    if (!manifestEntry) {
      sourceIdMismatches.push({
        ruleFile,
        field: "manifest.id",
        expected: sourceId || "rule source ID",
        actual: "missing from manifest",
      });
      recommendedFixes.push(`Add or correct the manifest entry for ${sourceId || ruleFile}.`);
      return;
    }

    const manifestId = stringValue(manifestEntry.id);
    if (sourceId !== manifestId || provenanceSourceId !== manifestId) {
      sourceIdMismatches.push({
        ruleFile,
        field: "manifest.id",
        expected: manifestId,
        actual: `${sourceId || "missing"} / ${provenanceSourceId || "missing"}`,
      });
      recommendedFixes.push(`Align rule provenance with manifest source ID ${manifestId}.`);
    }

    const ruleCatalogYear = stringValue(rule.catalogYear);
    const provenanceCatalogYear = stringValue(rule.provenance?.catalogYear);
    const manifestCatalogYear = stringValue(manifestEntry.catalogYear);
    if (
      !manifestCatalogYear ||
      ruleCatalogYear !== manifestCatalogYear ||
      provenanceCatalogYear !== manifestCatalogYear
    ) {
      catalogYearMismatches.push({
        ruleFile,
        field: "manifest.catalogYear",
        expected: manifestCatalogYear || "manifest catalog year",
        actual: `${ruleCatalogYear || "missing"} / ${provenanceCatalogYear || "missing"}`,
      });
      recommendedFixes.push(`Align ${ruleFile} and its manifest entry to the same catalog year.`);
    }

    const provenanceSourceFile = normalizePath(stringValue(rule.provenance?.sourceFile));
    const manifestFile = normalizePath(
      stringValue(manifestEntry.fileName)
        ? `sources/${stringValue(manifestEntry.fileName)}`
        : "",
    );
    if (!manifestFile || provenanceSourceFile !== manifestFile) {
      errors.push(`${ruleFile} sourceFile does not match its manifest fileName.`);
      recommendedFixes.push(`Align ${ruleFile} provenance sourceFile with its manifest fileName.`);
    }

    const manifestUrl = stringValue(manifestEntry.url);
    const provenanceUrl = stringValue(rule.provenance?.sourceUrl);
    if (!isAuburnBulletinUrl(manifestUrl) || !isAuburnBulletinUrl(provenanceUrl)) {
      errors.push(`${ruleFile} and its public manifest entry must include Auburn bulletin URLs.`);
      recommendedFixes.push(`Add the public Auburn bulletin URL to ${ruleFile} and its manifest entry.`);
    }

    if (!provenanceSourceFile || !existsSync(resolveProjectFile(provenanceSourceFile))) return;

    const sourceText = normalizeSourceText(
      readFileSync(resolveProjectFile(provenanceSourceFile), "utf8"),
    );
    const courses = rule[definition.courseField];
    const missingCourseCodes = Array.isArray(courses)
      ? courses
          .map((course) => stringValue(course.code))
          .filter((courseCode) => courseCode && !containsCourse(sourceText, courseCode))
      : [];
    const missingEvidence: string[] = [];

    if (!Array.isArray(courses)) {
      errors.push(`${ruleFile} must include ${definition.courseField}.`);
      recommendedFixes.push(`Restore ${definition.courseField} in ${ruleFile}.`);
    }

    if (definition.aiCertificate) {
      for (const courseCode of ["COMP 5600", "COMP 5630", "COMP 5130"]) {
        if (!containsCourse(sourceText, courseCode) && !missingCourseCodes.includes(courseCode)) {
          missingCourseCodes.push(courseCode);
        }
      }
      if (!/\b12(?: [A-Z]+){0,4} CREDIT HOURS?\b/.test(sourceText) && !/\bTOTAL 12\b/.test(sourceText)) {
        missingEvidence.push("12 credit hours");
      }
    }

    if (missingCourseCodes.length || missingEvidence.length) {
      driftFindings.push({
        ruleFile,
        sourceFile: provenanceSourceFile,
        missingCourseCodes,
        missingEvidence,
      });
      recommendedFixes.push(`Review ${ruleFile} against ${provenanceSourceFile}; update only after advisor-safe source verification.`);
    }
  }

  function finishResult(): SourceIntegrityResult {
    const passed =
      errors.length === 0 &&
      missingFiles.length === 0 &&
      catalogYearMismatches.length === 0 &&
      sourceIdMismatches.length === 0 &&
      driftFindings.length === 0;

    return {
      status: passed ? "pass" : "fail",
      passed,
      checkedAt,
      warnings: unique(warnings),
      errors: unique(errors),
      missingFiles: unique(missingFiles),
      catalogYearMismatches,
      sourceIdMismatches,
      driftFindings,
      recommendedFixes: unique(recommendedFixes),
    };
  }

  function resolveProjectFile(relativePath: string) {
    const normalized = normalizePath(relativePath);
    if (projectRoot) {
      return path.join(/*turbopackIgnore: true*/ projectRoot, normalized);
    }

    const [rootDirectory, ...segments] = normalized.split("/");
    if (rootDirectory === "sources") {
      return path.join(process.cwd(), "sources", ...segments);
    }
    if (rootDirectory === "rules") {
      return path.join(process.cwd(), "rules", ...segments);
    }
    throw new Error(`Unsupported project-relative source path: ${relativePath}`);
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function isAuburnBulletinUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "bulletin.auburn.edu";
  } catch {
    return false;
  }
}

function normalizeSourceText(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ")
    .replace(/&amp;/gi, " AND ")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

function containsCourse(sourceText: string, courseCode: string) {
  const normalized = courseCode
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
  return sourceText.includes(normalized);
}

function unique(values: string[]) {
  return [...new Set(values)];
}
