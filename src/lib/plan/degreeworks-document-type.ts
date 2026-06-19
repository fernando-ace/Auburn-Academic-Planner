export type DegreeWorksDocumentType =
  | "worksheet_audit"
  | "planned_path"
  | "unknown";

export type DegreeWorksDocumentTypeDetection = {
  documentType: DegreeWorksDocumentType;
  worksheetScore: number;
  plannedPathScore: number;
  matchedWorksheetSignals: string[];
  matchedPlannedPathSignals: string[];
};

const worksheetSignals: { label: string; pattern: RegExp; weight: number }[] = [
  { label: "Audit date", pattern: /\bAudit\s+date\b/i, weight: 3 },
  { label: "Credits applied", pattern: /\bCredits\s+applied\b/i, weight: 3 },
  { label: "Credits required", pattern: /\bCredits\s+required\b/i, weight: 3 },
  { label: "Unmet conditions", pattern: /\bUnmet\s+conditions\b/i, weight: 3 },
  { label: "Still needed", pattern: /\bStill\s+needed\b/i, weight: 3 },
  { label: "Preregistered", pattern: /\bPreregistered\b/i, weight: 2 },
  { label: "Fall Through", pattern: /\bFall\s+Through\b/i, weight: 2 },
  {
    label: "Blocks included in this block",
    pattern: /\bBlocks\s+included\s+in\s+this\s+block\b/i,
    weight: 2,
  },
  { label: "Complete", pattern: /\bComplete\b/i, weight: 1 },
  { label: "Incomplete", pattern: /\bIncomplete\b/i, weight: 2 },
  { label: "Satisfied by", pattern: /\bSatisfied\s+by\b/i, weight: 2 },
];

const plannedPathSignals: { label: string; pattern: RegExp; weight: number }[] = [
  { label: "Plan Description", pattern: /\bPlan\s+Description\b/i, weight: 4 },
  {
    label: "Total planned credits",
    pattern: /\bTotal\s+planned\s+credits\b/i,
    weight: 4,
  },
  {
    label: "Term-column plan layout",
    pattern:
      /\b(?:Fall|Spring|Summer)\s+20\d{2}\b[\s\S]{0,500}\b(?:Fall|Spring|Summer)\s+20\d{2}\b/i,
    weight: 2,
  },
  { label: "Planned", pattern: /\bPlanned\b/i, weight: 1 },
];

const minimumScore = 5;
const decisiveMargin = 2;

export function detectDegreeWorksDocumentType(
  text: string,
): DegreeWorksDocumentTypeDetection {
  const worksheetMatches = scoreSignals(text, worksheetSignals);
  const plannedPathMatches = scoreSignals(text, plannedPathSignals);
  let documentType: DegreeWorksDocumentType = "unknown";

  if (
    worksheetMatches.score >= minimumScore &&
    worksheetMatches.score >= plannedPathMatches.score + decisiveMargin
  ) {
    documentType = "worksheet_audit";
  } else if (
    plannedPathMatches.score >= minimumScore &&
    plannedPathMatches.score >= worksheetMatches.score + decisiveMargin
  ) {
    documentType = "planned_path";
  }

  return {
    documentType,
    worksheetScore: worksheetMatches.score,
    plannedPathScore: plannedPathMatches.score,
    matchedWorksheetSignals: worksheetMatches.labels,
    matchedPlannedPathSignals: plannedPathMatches.labels,
  };
}

function scoreSignals(
  text: string,
  signals: { label: string; pattern: RegExp; weight: number }[],
) {
  return signals.reduce(
    (result, signal) => {
      if (!signal.pattern.test(text)) {
        return result;
      }

      return {
        score: result.score + signal.weight,
        labels: [...result.labels, signal.label],
      };
    },
    { score: 0, labels: [] as string[] },
  );
}
