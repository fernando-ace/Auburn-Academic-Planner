import type { DegreeWorksDetectedProgram } from "./degreeworks-program.ts";
import type { PlanningTargetPathInput } from "./target-path.ts";

export type DegreeWorksAvailableEnrichment =
  | "software_engineering_catalog"
  | "computer_science_catalog"
  | "ai_certificate"
  | "prerequisite_model";

export function getAvailableDegreeWorksEnrichments({
  detectedProgram,
  targetPath,
}: {
  detectedProgram: DegreeWorksDetectedProgram;
  targetPath: PlanningTargetPathInput;
}): DegreeWorksAvailableEnrichment[] {
  if (targetPath === "degreeworks_only") {
    return [];
  }

  const candidates =
    targetPath === "auto"
      ? [detectedProgram.programKey]
      : [targetPath, detectedProgram.programKey];
  const enrichments: DegreeWorksAvailableEnrichment[] = [];

  if (candidates.includes("software_engineering")) {
    enrichments.push("software_engineering_catalog", "prerequisite_model");
  }

  if (candidates.includes("computer_science")) {
    enrichments.push("computer_science_catalog");
  }

  if (candidates.includes("ai_certificate")) {
    enrichments.push("ai_certificate");
  }

  return Array.from(new Set(enrichments));
}

export function formatAvailableEnrichment(enrichment: DegreeWorksAvailableEnrichment) {
  switch (enrichment) {
    case "software_engineering_catalog":
      return "Software Engineering catalog checks";
    case "computer_science_catalog":
      return "Computer Science catalog checks";
    case "ai_certificate":
      return "AI Engineering certificate checks";
    case "prerequisite_model":
      return "Prerequisite model";
  }
}
