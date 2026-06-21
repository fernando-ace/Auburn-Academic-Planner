export type DegreeWorksProgramKey =
  | "detected"
  | "unknown";

export type DegreeWorksDetectedProgram = {
  degree: string | null;
  program: string | null;
  major: string | null;
  catalogYear: string | null;
  displayName: string;
  programKey: DegreeWorksProgramKey;
  confidence: "high" | "medium" | "low";
  source: "worksheet_label" | "keyword_match" | "target_override" | "unknown";
};

export function detectDegreeWorksProgram({
  text,
  program,
  major,
  catalogYear,
}: {
  text: string;
  program?: string | null;
  major?: string | null;
  catalogYear?: string | null;
}): DegreeWorksDetectedProgram {
  const normalizedProgram = cleanLabel(program);
  const normalizedMajor = cleanLabel(major);
  const normalizedCatalogYear = cleanLabel(catalogYear);
  const degree = extractDegree(text);
  const joined = [normalizedProgram, normalizedMajor, degree, text.slice(0, 1200)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const inferredKey = inferProgramKey(joined);

  const detectedLabel = [normalizedProgram, normalizedMajor]
    .filter(Boolean)
    .join(" ")
    .trim();
  const displayName =
    detectedLabel || degree || "Unknown program";

  return {
    degree,
    program: normalizedProgram,
    major: normalizedMajor,
    catalogYear: normalizedCatalogYear,
    displayName,
    programKey: inferredKey === "unknown" ? "unknown" : "detected",
    confidence:
      normalizedProgram || normalizedMajor
        ? "high"
        : inferredKey === "unknown"
          ? "low"
          : "high",
    source: normalizedProgram || normalizedMajor ? "worksheet_label" : "keyword_match",
  };
}

function inferProgramKey(text: string): DegreeWorksProgramKey {
  void text;
  return "unknown";
}

function extractDegree(text: string) {
  const match =
    /\bDegree\s*:?\s*([A-Za-z][A-Za-z0-9 ./&-]{1,80})/i.exec(text) ??
    /\b(?:Bachelor|Master|B[.]?S[.]?|BBA|BA)\b[ A-Za-z./&-]{0,80}/i.exec(text);

  return cleanLabel(match?.[1] ?? match?.[0]);
}

function cleanLabel(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || null;
}
