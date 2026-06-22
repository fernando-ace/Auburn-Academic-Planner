export const ACADEMIC_SOURCE_SEED_PATH = "sources/auburn/academic-source-seeds.json";

export const academicSourceTypes = [
  "bulletin_major",
  "bulletin_minor",
  "certificate",
  "course_catalog",
  "core_curriculum",
  "registrar",
  "advising",
  "transfer_credit",
  "ap_credit",
] as const;

export const academicSourceStatuses = [
  "rag_only",
  "excluded",
] as const;

export type AcademicSourceType = (typeof academicSourceTypes)[number];
export type AcademicSourceStatus = (typeof academicSourceStatuses)[number];

export type AcademicSourceSeed = {
  id: string;
  title: string;
  url: string;
  type: AcademicSourceType;
  college: string | null;
  department: string | null;
  catalogYear: string | null;
  status: AcademicSourceStatus;
  lastChecked: string;
  notes: string;
};

export type SourceScopeClassification =
  | "eligible_academic_source"
  | "rag_only"
  | "excluded";

export type SeedValidationResult = {
  passed: boolean;
  errors: string[];
};

const typeSet = new Set<string>(academicSourceTypes);
const statusSet = new Set<string>(academicSourceStatuses);
const academicBulletinPathPatterns = [
  /^\/undergraduate\/majors\/?$/i,
  /^\/undergraduate\/[^?#]*\/majors\/?$/i,
  /^\/undergraduate\/[^?#]*_major\/?$/i,
  /^\/undergraduate\/[^?#]*_major\/index\.html$/i,
  /^\/undergraduate\/[^?#]*_minor\/?$/i,
  /^\/undergraduate\/[^?#]*_ucrt\/?$/i,
  /^\/undergraduate\/[^?#]*department[^?#]*\/?$/i,
  /^\/coursesofinstruction(?:\/|$)/i,
  /^\/policies\/academic\/[^?#]+\/?$/i,
];

const excludedPathPatterns = [
  /\/news(?:\/|$)/i,
  /\/archive(?:d)?(?:\/|$)/i,
  /\/people(?:\/|$)/i,
  /\/person(?:\/|$)/i,
  /\/staff(?:\/|$)/i,
  /\/faculty(?:\/|$)/i,
  /\/student(?:s)?(?:\/|$)/i,
  /\/instagram(?:\/|$)/i,
  /\/visit(?:\/|$)/i,
  /\/apply(?:\/|$)/i,
  /\/giving(?:\/|$)/i,
];

export function classifyAcademicSource(
  sourceOrUrl: AcademicSourceSeed | string,
  seeds: AcademicSourceSeed[] = [],
): SourceScopeClassification {
  const source =
    typeof sourceOrUrl === "string" ? undefined : sourceOrUrl;
  const rawUrl = typeof sourceOrUrl === "string" ? sourceOrUrl : sourceOrUrl.url;
  const seed = source ?? seeds.find((entry) => entry.url === rawUrl);

  if (seed?.status === "excluded") {
    return "excluded";
  }

  if (seed?.status === "rag_only") {
    return "rag_only";
  }

  const url = parseUrl(rawUrl);
  if (!url) {
    return "excluded";
  }

  if (isExcludedUrl(url)) {
    return "excluded";
  }

  if (isAcademicBulletinUrl(url)) {
    return "eligible_academic_source";
  }

  if (isCuratedNonBulletinAcademicSource(url, seeds)) {
    return "rag_only";
  }

  return "excluded";
}

export function validateAcademicSourceSeeds(
  entries: unknown,
): SeedValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(entries)) {
    return {
      passed: false,
      errors: ["Academic source seeds must be a top-level array."],
    };
  }

  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();

  entries.forEach((entry, index) => {
    const label = `seeds[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${label} must be an object.`);
      return;
    }

    const seed = entry as Partial<Record<keyof AcademicSourceSeed, unknown>>;
    const id = requireString(seed.id, `${label}.id`, errors);
    requireString(seed.title, `${label}.title`, errors);
    const url = requireString(seed.url, `${label}.url`, errors);
    const type = requireString(seed.type, `${label}.type`, errors);
    const status = requireString(seed.status, `${label}.status`, errors);
    requireNullableString(seed.college, `${label}.college`, errors);
    requireNullableString(seed.department, `${label}.department`, errors);
    requireNullableString(seed.catalogYear, `${label}.catalogYear`, errors);
    requireString(seed.lastChecked, `${label}.lastChecked`, errors);
    requireString(seed.notes, `${label}.notes`, errors);

    if (id) {
      if (seenIds.has(id)) {
        errors.push(`${label}.id duplicates ${id}.`);
      }
      seenIds.add(id);
    }

    if (url) {
      if (seenUrls.has(url)) {
        errors.push(`${label}.url duplicates ${url}.`);
      }
      seenUrls.add(url);

      if (!parseUrl(url)) {
        errors.push(`${label}.url must be an absolute URL.`);
      }
    }

    if (type && !typeSet.has(type)) {
      errors.push(`${label}.type must be one of: ${academicSourceTypes.join(", ")}.`);
    }

    if (status && !statusSet.has(status)) {
      errors.push(`${label}.status must be one of: ${academicSourceStatuses.join(", ")}.`);
    }

    if (
      typeof seed.lastChecked === "string" &&
      !/^\d{4}-\d{2}-\d{2}$/.test(seed.lastChecked.trim())
    ) {
      errors.push(`${label}.lastChecked must use YYYY-MM-DD.`);
    }

  });

  return {
    passed: errors.length === 0,
    errors: unique(errors),
  };
}

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function isAcademicBulletinUrl(url: URL) {
  return (
    url.protocol === "https:" &&
    url.hostname === "bulletin.auburn.edu" &&
    academicBulletinPathPatterns.some((pattern) => pattern.test(url.pathname))
  );
}

function isCuratedNonBulletinAcademicSource(
  url: URL,
  seeds: AcademicSourceSeed[],
) {
  return seeds.some((seed) => {
    if (seed.status === "excluded") {
      return false;
    }
    const seedUrl = parseUrl(seed.url);
    return seedUrl?.href === url.href && seed.status === "rag_only";
  });
}

function isExcludedUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();

  if (hostname === "auburntigers.com" || hostname.endsWith(".auburntigers.com")) {
    return true;
  }

  if (!hostname.endsWith("auburn.edu")) {
    return true;
  }

  if (pathname.endsWith(".pdf") && !url.hostname.endsWith("bulletin.auburn.edu")) {
    return true;
  }

  return excludedPathPatterns.some((pattern) => pattern.test(pathname));
}

function requireString(value: unknown, label: string, errors: string[]) {
  const text = stringValue(value);
  if (!text) {
    errors.push(`${label} is required.`);
  }
  return text;
}

function requireNullableString(value: unknown, label: string, errors: string[]) {
  if (value !== null && typeof value !== "string") {
    errors.push(`${label} must be a string or null.`);
  }
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
