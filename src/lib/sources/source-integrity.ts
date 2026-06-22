import {
  CURATED_ACADEMIC_SOURCE_MANIFEST_PATH,
  EXPECTED_CURATED_ACADEMIC_SOURCE_COUNT,
  validateCuratedAcademicSources,
} from "./curated-academic-sources.ts";
import {
  ACADEMIC_SOURCE_SEED_PATH,
  validateAcademicSourceSeeds,
  type AcademicSourceSeed,
} from "./source-scope.ts";

export type SourceIntegrityResult = {
  status: "pass" | "fail";
  passed: boolean;
  checkedAt: string;
  warnings: string[];
  errors: string[];
  missingFiles: string[];
  catalogYearMismatches: [];
  sourceIdMismatches: [];
  driftFindings: [];
  recommendedFixes: string[];
};

export type SourceIntegrityOptions = {
  reader: SourceIntegrityReader;
  checkedAt?: Date | string;
};

export type SourceIntegrityReader = {
  hasFile(relativePath: string): boolean;
  readText(relativePath: string): string | undefined;
};

export function checkSourceIntegrity(
  options: SourceIntegrityOptions,
): SourceIntegrityResult {
  const { reader } = options;
  const checkedAt = new Date(options.checkedAt ?? new Date()).toISOString();
  const warnings: string[] = [];
  const errors: string[] = [];
  const missingFiles: string[] = [];
  const recommendedFixes: string[] = [];

  const seedData = readJson(ACADEMIC_SOURCE_SEED_PATH);
  const curatedManifest = readJson(CURATED_ACADEMIC_SOURCE_MANIFEST_PATH);

  if (Array.isArray(seedData)) {
    const seedValidation = validateAcademicSourceSeeds(seedData);
    errors.push(...seedValidation.errors);
  } else if (seedData !== undefined) {
    errors.push(`${ACADEMIC_SOURCE_SEED_PATH} must contain a top-level array.`);
  }

  if (Array.isArray(seedData) && curatedManifest !== undefined) {
    const curatedValidation = validateCuratedAcademicSources(
      curatedManifest,
      seedData as AcademicSourceSeed[],
      reader,
    );
    errors.push(...curatedValidation.errors);
    warnings.push(...curatedValidation.warnings);
  }

  if (
    Array.isArray(curatedManifest) &&
    curatedManifest.length !== EXPECTED_CURATED_ACADEMIC_SOURCE_COUNT
  ) {
    errors.push(
      `${CURATED_ACADEMIC_SOURCE_MANIFEST_PATH} must list exactly ${EXPECTED_CURATED_ACADEMIC_SOURCE_COUNT} curated sources.`,
    );
  }

  return finishResult();

  function readJson(relativePath: string): unknown {
    const text = reader.readText(relativePath);
    if (text === undefined) {
      missingFiles.push(relativePath);
      recommendedFixes.push(`Restore ${relativePath}.`);
      return undefined;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown JSON error";
      errors.push(`${relativePath} is not parseable JSON: ${detail}`);
      recommendedFixes.push(`Fix ${relativePath} so it is valid JSON.`);
      return undefined;
    }
  }

  function finishResult(): SourceIntegrityResult {
    const passed = errors.length === 0 && missingFiles.length === 0;

    return {
      status: passed ? "pass" : "fail",
      passed,
      checkedAt,
      warnings: unique(warnings),
      errors: unique(errors),
      missingFiles: unique(missingFiles),
      catalogYearMismatches: [],
      sourceIdMismatches: [],
      driftFindings: [],
      recommendedFixes: unique(recommendedFixes),
    };
  }
}

function unique(values: string[]) {
  return [...new Set(values)];
}
