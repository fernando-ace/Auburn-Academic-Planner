import { createHash } from "node:crypto";

import type { AcademicSourceSeed } from "./source-scope.ts";

export const AUBURN_MAJOR_INDEX_SOURCE_PATH =
  "sources/auburn/curated/auburn-undergraduate-majors-index.html";
export const GENERATED_MAJOR_SOURCE_SEEDS_PATH =
  "sources/auburn/generated-major-source-seeds.json";
export const MAJOR_ACADEMIC_SOURCE_DIR = "sources/auburn/majors";
export const MAJOR_ACADEMIC_SOURCE_MANIFEST_PATH =
  "sources/auburn/majors/manifest.json";

const bulletinMajorBaseUrl = "https://bulletin.auburn.edu/undergraduate/majors/";
const ragOnlyNotes =
  "Generated from the official Auburn Bulletin Undergraduate Majors index for RAG-only chat grounding. This source must not be used as a deterministic degree-audit rule source.";

export type GeneratedMajorSourceSeed = AcademicSourceSeed & {
  generatedAt: string;
  sourceIndexFile: string;
};

export type MajorSourceDiscoveryReport = {
  rawLinkCount: number;
  discoveredCount: number;
  duplicateCount: number;
  skippedCount: number;
  warningCount: number;
  warnings: string[];
  sources: GeneratedMajorSourceSeed[];
};

export type MajorAcademicSourceManifestEntry = {
  id: string;
  title: string;
  url: string;
  type: "bulletin_major";
  status: "rag_only";
  college: string | null;
  department: string | null;
  catalogYear: string | null;
  seedGeneratedAt: string;
  fetchedAt: string;
  fileName: string;
  contentType: string;
  notes: string;
};

export type MajorAcademicSourceFetchPlan = {
  seed: GeneratedMajorSourceSeed;
  fileName: string;
  outputPath: string;
  contentType: string;
};

export type MajorAcademicSourceValidationReader = {
  hasFile(relativePath: string): boolean;
  readText(relativePath: string): string | undefined;
};

export type MajorAcademicSourceValidationResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
};

type CandidateLink = {
  href: string;
  title: string;
  college: string | null;
};

export function discoverAuburnMajorSourcesFromIndex({
  generatedAt,
  html,
}: {
  generatedAt: string;
  html: string;
}): MajorSourceDiscoveryReport {
  const catalogYear = extractCatalogYear(html);
  const candidates = extractMajorLinkCandidates(html);
  const byUrl = new Map<string, CandidateLink>();
  const warnings: string[] = [];
  let skippedCount = 0;

  for (const candidate of candidates) {
    const normalizedUrl = normalizeMajorUrl(candidate.href);
    if (!normalizedUrl) {
      skippedCount += 1;
      continue;
    }

    if (!byUrl.has(normalizedUrl)) {
      byUrl.set(normalizedUrl, candidate);
      continue;
    }

    const existing = byUrl.get(normalizedUrl);
    if (existing && isBetterTitle(candidate.title, existing.title)) {
      byUrl.set(normalizedUrl, candidate);
    }
  }

  const sources = Array.from(byUrl.entries())
    .map(([url, candidate]) => ({
      candidate,
      idBase: buildMajorSourceIdBase(url),
      url,
    }))
    .sort((left, right) => left.url.localeCompare(right.url));
  const idCounts = countBy(sources.map((source) => source.idBase));

  const generatedSources = sources.map(({ candidate, idBase, url }) => {
    const title = cleanMajorTitle(candidate.title) || titleFromUrl(url);
    if (title === titleFromUrl(url)) {
      warnings.push(`Used URL-derived title for ${url}.`);
    }

    return {
      id: idCounts.get(idBase) === 1 ? idBase : `${idBase}-${shortHash(url)}`,
      title,
      url,
      type: "bulletin_major" as const,
      college: candidate.college,
      department: inferDepartmentFromUrl(url),
      catalogYear,
      status: "rag_only" as const,
      lastChecked: generatedAt.slice(0, 10),
      generatedAt,
      sourceIndexFile: AUBURN_MAJOR_INDEX_SOURCE_PATH,
      notes: ragOnlyNotes,
    };
  });

  return {
    rawLinkCount: candidates.length,
    discoveredCount: generatedSources.length,
    duplicateCount: candidates.length - generatedSources.length - skippedCount,
    skippedCount,
    warningCount: warnings.length,
    warnings: unique(warnings),
    sources: generatedSources,
  };
}

export function formatMajorSourceDiscoveryDryRun(
  report: MajorSourceDiscoveryReport,
) {
  const lines = [
    "Auburn Bulletin undergraduate major source discovery",
    `Raw candidate links: ${report.rawLinkCount}`,
    `Discovered major pages: ${report.discoveredCount}`,
    `Duplicate links removed: ${report.duplicateCount}`,
    `Skipped links: ${report.skippedCount}`,
    `Warnings: ${report.warningCount}`,
    "Sample discovered sources:",
  ];

  for (const source of report.sources.slice(0, 12)) {
    lines.push(
      `- ${source.id} | ${source.title} | ${source.url} | status=${source.status}`,
    );
  }

  if (report.warnings.length > 0) {
    lines.push("Warning details:");
    for (const warning of report.warnings) lines.push(`- ${warning}`);
  }

  return lines.join("\n");
}

export function planMajorAcademicSourceFetches(
  seeds: GeneratedMajorSourceSeed[],
): MajorAcademicSourceFetchPlan[] {
  return seeds.map((seed) => ({
    seed,
    fileName: `auburn/majors/${safeMajorSourceFileBase(seed.id)}.html`,
    outputPath: `${MAJOR_ACADEMIC_SOURCE_DIR}/${safeMajorSourceFileBase(seed.id)}.html`,
    contentType: "text/html",
  }));
}

export function formatMajorAcademicSourceFetchDryRun(
  plans: MajorAcademicSourceFetchPlan[],
) {
  const lines = [
    "Auburn Bulletin undergraduate major fetch plan",
    `Discovered RAG-only major sources: ${plans.length}`,
  ];

  for (const [index, plan] of plans.slice(0, 30).entries()) {
    lines.push(
      `Source ${String(index + 1).padStart(3, "0")}/${String(plans.length).padStart(3, "0")}: id=${plan.seed.id} | url=${plan.seed.url} | outputPath=${plan.outputPath}`,
    );
  }

  if (plans.length > 30) {
    lines.push(`... ${plans.length - 30} more source(s) omitted from preview.`);
  }

  return lines.join("\n");
}

export function buildMajorAcademicSourceManifest(
  plans: MajorAcademicSourceFetchPlan[],
  fetchedAt: string,
): MajorAcademicSourceManifestEntry[] {
  return plans.map((plan) => ({
    id: plan.seed.id,
    title: plan.seed.title,
    url: plan.seed.url,
    type: "bulletin_major",
    status: "rag_only",
    college: plan.seed.college,
    department: plan.seed.department,
    catalogYear: plan.seed.catalogYear,
    seedGeneratedAt: plan.seed.generatedAt,
    fetchedAt,
    fileName: plan.fileName,
    contentType: plan.contentType,
    notes: plan.seed.notes,
  }));
}

export function validateMajorAcademicSources({
  manifest,
  reader,
  seeds,
}: {
  manifest: unknown;
  reader: MajorAcademicSourceValidationReader;
  seeds: GeneratedMajorSourceSeed[];
}): MajorAcademicSourceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(seeds)) {
    errors.push(`${GENERATED_MAJOR_SOURCE_SEEDS_PATH} must contain a top-level array.`);
    return { passed: false, errors, warnings };
  }

  const seedById = new Map(seeds.map((seed) => [seed.id, seed]));
  const seenIds = new Set<string>();

  for (const [index, seed] of seeds.entries()) {
    const label = `majorSeeds[${index}]`;
    if (seed.type !== "bulletin_major") errors.push(`${label}.type must be bulletin_major.`);
    if (seed.status !== "rag_only") errors.push(`${label}.status must be rag_only.`);
    if (!normalizeMajorUrl(seed.url)) {
      errors.push(`${label}.url must be an official Auburn Bulletin undergraduate major URL.`);
    }
    if (!seed.notes.toLowerCase().includes("rag-only")) {
      errors.push(`${label}.notes must state that the source is RAG-only.`);
    }
  }

  if (manifest === undefined) {
    return {
      passed: errors.length === 0,
      errors: unique(errors),
      warnings,
    };
  }

  if (!Array.isArray(manifest)) {
    errors.push(`${MAJOR_ACADEMIC_SOURCE_MANIFEST_PATH} must contain a top-level array.`);
    return { passed: false, errors: unique(errors), warnings };
  }

  if (manifest.length !== seeds.length) {
    errors.push(
      `${MAJOR_ACADEMIC_SOURCE_MANIFEST_PATH} must list exactly ${seeds.length} generated major sources; found ${manifest.length}.`,
    );
  }

  manifest.forEach((entry, index) => {
    const label = `majors[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${label} must be an object.`);
      return;
    }

    const id = stringValue(entry.id);
    if (!id) {
      errors.push(`${label}.id is required.`);
      return;
    }

    if (seenIds.has(id)) errors.push(`${label}.id duplicates ${id}.`);
    seenIds.add(id);

    const seed = seedById.get(id);
    if (!seed) {
      errors.push(`${label}.id ${id} is not present in generated major seeds.`);
      return;
    }

    compareString(entry.title, seed.title, `${label}.title`, errors);
    compareString(entry.url, seed.url, `${label}.url`, errors);
    compareString(entry.type, "bulletin_major", `${label}.type`, errors);
    compareString(entry.status, "rag_only", `${label}.status`, errors);
    compareNullableString(entry.college, seed.college, `${label}.college`, errors);
    compareNullableString(entry.department, seed.department, `${label}.department`, errors);
    compareNullableString(entry.catalogYear, seed.catalogYear, `${label}.catalogYear`, errors);
    compareString(entry.seedGeneratedAt, seed.generatedAt, `${label}.seedGeneratedAt`, errors);
    compareString(entry.contentType, "text/html", `${label}.contentType`, errors);

    const expectedFileName = `auburn/majors/${safeMajorSourceFileBase(seed.id)}.html`;
    compareString(entry.fileName, expectedFileName, `${label}.fileName`, errors);

    const fetchedAt = stringValue(entry.fetchedAt);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fetchedAt)) {
      errors.push(`${label}.fetchedAt must use YYYY-MM-DD.`);
    }

    const fileName = stringValue(entry.fileName);
    if (!isMajorFileName(fileName)) {
      errors.push(`${label}.fileName must stay under auburn/majors/.`);
      return;
    }

    const relativePath = `sources/${fileName}`;
    if (!reader.hasFile(relativePath)) {
      errors.push(`${relativePath} is listed in major manifest but does not exist.`);
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

export function normalizeMajorUrl(rawHref: string) {
  let url: URL;
  try {
    url = new URL(rawHref.trim(), bulletinMajorBaseUrl);
  } catch {
    return null;
  }

  url.hash = "";
  url.search = "";
  url.protocol = "https:";

  if (url.hostname !== "bulletin.auburn.edu") return null;
  if (!url.pathname.startsWith("/undergraduate/")) return null;
  if (/\/(?:archivedbulletins|policies|minors|ugcertificates)(?:\/|$)/i.test(url.pathname)) {
    return null;
  }
  if (!/(?:_major\/?$|_major\/index\.html$)/i.test(url.pathname)) return null;

  if (url.pathname.endsWith("/index.html")) {
    url.pathname = url.pathname.slice(0, -"index.html".length);
  }
  if (!url.pathname.endsWith("/")) url.pathname = `${url.pathname}/`;

  return url.href;
}

export function safeMajorSourceFileBase(sourceId: string) {
  const normalized = sourceId.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`Invalid major source id for file name: ${sourceId}`);
  }
  return normalized;
}

function extractMajorLinkCandidates(html: string): CandidateLink[] {
  const textContainer = html.match(/<div id="textcontainer"[\s\S]*?<\/div><!--end #textcontainer -->/i)?.[0] ?? html;
  const candidates: CandidateLink[] = [];
  let currentCollege: string | null = null;
  const tokenPattern = /<h2\b[^>]*>([\s\S]*?)<\/h2>|<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of textContainer.matchAll(tokenPattern)) {
    if (match[1] !== undefined) {
      const heading = cleanText(match[1]);
      if (/college|school|university/i.test(heading)) currentCollege = heading;
      continue;
    }

    const href = decodeHtmlEntities(match[2] ?? "").trim();
    const title = cleanMajorTitle(match[3] ?? "");
    candidates.push({ href, title, college: currentCollege });
  }

  return candidates;
}

function cleanMajorTitle(value: string) {
  return cleanText(value)
    .replace(/\s+[–-]\s+(?:B[A-Z]+|BS|BA|BFA|BARCH|BIND|BIARCH|BLA)\b.*$/i, "")
    .replace(/\s+\b(?:BS|BA|BFA|BARCH|BIND|BIARCH|BLA|BBSE|BSBA|BCHE|BCE|BCPE|BCS|BEE|BISE|BME|BMTLE|BSWE)\b\s*$/i, "")
    .replace(/\s*[-–—]\s*$/, "")
    .replace(/^[-–—]+$/, "")
    .trim();
}

function cleanText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/â€“/g, "-")
    .replace(/â€”/g, "-")
    .replace(/â€‹/g, "")
    .replace(/Â/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
    apos: "'",
    ndash: "-",
    mdash: "-",
    "#39": "'",
    "#8203": "",
  };

  return value.replace(/&([a-z0-9#]+);/gi, (entity, name: string) => {
    const lower = name.toLowerCase();
    if (named[lower] !== undefined) return named[lower];
    if (lower.startsWith("#x")) {
      const code = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }
    if (lower.startsWith("#")) {
      const code = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }
    return " ";
  });
}

function buildMajorSourceIdBase(url: string) {
  const normalized = new URL(url);
  const segments = normalized.pathname.split("/").filter(Boolean);
  const last = segments.at(-1) ?? "major";
  return `auburn-major-${slugify(last.replace(/_major$/i, ""))}`;
}

function titleFromUrl(url: string) {
  const normalized = new URL(url);
  const segment = normalized.pathname.split("/").filter(Boolean).at(-1) ?? "major";
  return segment
    .replace(/_major$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inferDepartmentFromUrl(url: string) {
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  if (segments.length < 4) return null;
  const department = segments.at(-2);
  if (!department || /college|school/i.test(department)) return null;
  return department.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function extractCatalogYear(html: string) {
  return /\b(20\d{2}\s*[-–]\s*20\d{2})\b/.exec(cleanText(html))?.[1].replace(/\s*[–]\s*/g, "-") ?? null;
}

function isBetterTitle(candidate: string, existing: string) {
  const candidateTitle = cleanMajorTitle(candidate);
  const existingTitle = cleanMajorTitle(existing);
  return candidateTitle.length > existingTitle.length;
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "major";
}

function shortHash(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
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

function isMajorFileName(fileName: string) {
  const normalized = fileName.replace(/\\/g, "/");
  return (
    normalized.startsWith("auburn/majors/") &&
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
