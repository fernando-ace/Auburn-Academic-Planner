import type { CurrentDegreeAuditAnalysis } from "./current-degree-audit-analysis.ts";

export function parseCurrentProgressAnalysisInput(value: unknown) {
  if (typeof value === "string") {
    if (value.trim().length === 0) {
      return null;
    }

    try {
      return parseCurrentProgressAnalysisInput(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const parsed = value as Partial<CurrentDegreeAuditAnalysis>;
  if (
    parsed.documentType !== "worksheet_audit" ||
    !Array.isArray(parsed.stillNeededItems) ||
    !Array.isArray(parsed.completedCourseCodes) ||
    !Array.isArray(parsed.preregisteredCourseCodes)
  ) {
    return null;
  }

  return parsed as CurrentDegreeAuditAnalysis;
}
