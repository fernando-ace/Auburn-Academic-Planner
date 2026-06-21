import type {
  DegreeWorksAnalysis,
  DegreeWorksDetectedSignals,
  DegreeWorksParserConfidence,
} from "@/lib/plan/degreeworks-analysis";
import type {
  CurrentDegreeAuditAnalysis,
} from "@/lib/plan/current-degree-audit-analysis";
import type {
  CurrentStateGapReport,
  CurrentStateNextSteps,
} from "@/lib/plan/current-state-next-steps";
import type {
  DegreeWorksDocumentType,
  DegreeWorksDocumentTypeDetection,
} from "@/lib/plan/degreeworks-document-type";
import type { DegreeWorksDetectedProgram } from "@/lib/plan/degreeworks-program";
import type { DegreeWorksSemesterExtraction } from "@/lib/plan/degreeworks-semesters";
import type { DegreeWorksStillNeededItem } from "@/lib/plan/degreeworks-still-needed";
import type { DegreeWorksCourseStatusCounts, DegreeWorksCourseStatusRecord } from "@/lib/plan/degreeworks-course-status";
import type { PlannedPathCoverage } from "@/lib/plan/planned-path-coverage";

export type DegreeWorksNativeTarget = "degreeworks_native";

export type CombinedDegreeWorksUploadResult = {
  documentType?: "planned_path";
  selectedTargetPath: DegreeWorksNativeTarget;
  sourceFileName: string;
  plannedPathCoverage?: PlannedPathCoverage;
  parsedCourseCount: number;
  parsedCourseCodes: string[];
  totalPlannedCredits: number | null;
  detectedSignals: DegreeWorksDetectedSignals;
  detectedRequirementBlockLabels: DegreeWorksAnalysis["detectedRequirementBlockLabels"];
  courseStatusRecords: DegreeWorksCourseStatusRecord[];
  courseStatusCounts: DegreeWorksCourseStatusCounts;
  parserWarnings: string[];
  parserConfidence: DegreeWorksParserConfidence;
  semesterPlanAnalysis: DegreeWorksSemesterExtraction;
  notes: string[];
};

export type CurrentDegreeWorksUploadResult = {
  selectedTargetPath: DegreeWorksNativeTarget;
  sourceFileName: string;
  documentType: DegreeWorksDocumentType;
  documentTypeDetection: DegreeWorksDocumentTypeDetection;
  detectedProgram: DegreeWorksDetectedProgram;
  degreeWorksNativeAnalysis: {
    detectedProgram: DegreeWorksDetectedProgram;
    creditsRequired?: number | null;
    creditsApplied?: number | null;
    creditsNeeded?: number | null;
    degreeStatus?: "complete" | "incomplete" | "unknown";
    incompleteBlocks: CurrentDegreeAuditAnalysis["requirementBlocks"];
    stillNeededItems: DegreeWorksStillNeededItem[];
    currentStateSuggestions: CurrentStateNextSteps | null;
    advisorQuestions: string[];
    advisorMeetingSummary: string;
  };
  currentProgressAnalysis: CurrentDegreeAuditAnalysis;
  currentStateGapReport: CurrentStateGapReport;
  currentStateNextSteps: CurrentStateNextSteps;
  advisorMeetingSummary: string;
  parserDiagnostics: {
    parserWarnings: string[];
    parserConfidence: DegreeWorksParserConfidence;
  };
  notes: string[];
};
