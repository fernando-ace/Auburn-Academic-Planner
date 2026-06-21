import type { PlanningTargetPathInput } from "./target-path.ts";

export type DegreeWorksProgramKey =
  | "software_engineering"
  | "computer_science"
  | "ai_certificate"
  | "degreeworks_only"
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
  targetPath = "auto",
}: {
  text: string;
  program?: string | null;
  major?: string | null;
  catalogYear?: string | null;
  targetPath?: PlanningTargetPathInput;
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

  if (targetPath !== "auto") {
    return {
      degree,
      program: normalizedProgram,
      major: normalizedMajor,
      catalogYear: normalizedCatalogYear,
      displayName: displayNameForTarget(targetPath, {
        degree,
        major: normalizedMajor,
        program: normalizedProgram,
      }),
      programKey: targetPath,
      confidence: targetPath === "degreeworks_only" ? "medium" : "high",
      source: "target_override",
    };
  }

  const displayName =
    [normalizedProgram, normalizedMajor].filter(Boolean).join(" ") ||
    degree ||
    displayNameForTarget(inferredKey, {
      degree,
      major: normalizedMajor,
      program: normalizedProgram,
    });

  return {
    degree,
    program: normalizedProgram,
    major: normalizedMajor,
    catalogYear: normalizedCatalogYear,
    displayName,
    programKey: inferredKey,
    confidence:
      normalizedProgram || normalizedMajor
        ? inferredKey === "unknown"
          ? "medium"
          : "high"
        : inferredKey === "unknown"
          ? "low"
          : "medium",
    source: normalizedProgram || normalizedMajor ? "worksheet_label" : "keyword_match",
  };
}

function inferProgramKey(text: string): DegreeWorksProgramKey {
  if (/\b(?:bswe|software engineering|software engr)\b/i.test(text)) {
    return "software_engineering";
  }

  if (/\b(?:csci|computer science)\b/i.test(text)) {
    return "computer_science";
  }

  if (/\b(?:ai engineering|artificial intelligence engineering)\b/i.test(text)) {
    return "ai_certificate";
  }

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

function displayNameForTarget(
  targetPath: DegreeWorksProgramKey,
  labels: { degree: string | null; major: string | null; program: string | null },
) {
  if (labels.program || labels.major || labels.degree) {
    return [labels.program, labels.major, labels.degree]
      .filter(Boolean)
      .join(" ");
  }

  switch (targetPath) {
    case "software_engineering":
      return "BSWE Software Engineering";
    case "computer_science":
      return "CSCI Computer Science";
    case "ai_certificate":
      return "AI Engineering certificate";
    case "degreeworks_only":
      return "Degree Works audit only";
    case "unknown":
      return "Unknown program";
  }
}
