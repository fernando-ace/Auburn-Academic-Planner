import type { DegreeWorksDetectedSignals, DegreeWorksParserConfidence } from "@/lib/plan/degreeworks-analysis";
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
import type { DegreeWorksCourseStatusCounts, DegreeWorksCourseStatusRecord } from "@/lib/plan/degreeworks-course-status";
import type { DraftSemesterPlan } from "@/lib/plan/draft-semester-plan";
import type { DegreeWorksSemesterExtraction } from "@/lib/plan/degreeworks-semesters";
import type { GapReport } from "@/lib/plan/gap-report";
import type {
  NextSemesterSuggestedCourse as SharedNextSemesterSuggestedCourse,
  NextSemesterSuggestions as SharedNextSemesterSuggestions,
} from "@/lib/plan/next-semester-suggestions";
import type { PlanningTargetPathInput } from "@/lib/plan/target-path";
import type {
  RequirementBlockResult as SharedRequirementBlockResult,
  RequirementBlockStatus as SharedRequirementBlockStatus,
} from "@/lib/rules/requirement-blocks";
import type { RuleProvenance } from "@/lib/rules/rule-provenance";
import type { SoftwareEngineeringPrerequisiteCheckResult } from "@/lib/rules/software-engineering-prerequisites";

export type PlanCheckCourse = {
  code: string;
  title: string;
  creditHours: number;
  approvalStatus?: string;
};

export type PlanCheckResult = {
  provenance?: RuleProvenance;
  planDescription?: string;
  major?: string;
  totalPlannedCredits?: number | null;
  sourceFileName?: string;
  parsedCourseCodes?: string[];
  parsedCourseCount?: number;
  detectedSignals?: DegreeWorksDetectedSignals;
  courseStatusRecords?: DegreeWorksCourseStatusRecord[];
  courseStatusCounts?: DegreeWorksCourseStatusCounts;
  parserWarnings?: string[];
  parserConfidence?: DegreeWorksParserConfidence;
  requiredCoursesSatisfied: PlanCheckCourse[];
  requiredCoursesMissing: PlanCheckCourse[];
  electiveCandidatesFound: PlanCheckCourse[];
  isLikelyComplete: boolean;
  advisorVerificationRequired: boolean;
  notes: string[];
};

export type SoftwareEngineeringAlternativeCourseGroup = {
  name: string;
  minimumCoursesRequired: number;
  courses: PlanCheckCourse[];
  satisfiedCourses: PlanCheckCourse[];
  missingCourseOptions: PlanCheckCourse[];
  isSatisfied: boolean;
  provenance: RuleProvenance;
};

export type AdvisorVerifiedRequirement = {
  name: string;
  creditHoursRequired: number;
};

export type RequirementBlockStatus = SharedRequirementBlockStatus;
export type RequirementBlockResult = SharedRequirementBlockResult;

export type SoftwareEngineeringPlanCheckResult = {
  provenance?: RuleProvenance;
  planDescription?: string;
  major?: string;
  program?: string;
  sourceFileName?: string;
  parsedCourseCodes?: string[];
  parsedCourseCount?: number;
  detectedSignals?: DegreeWorksDetectedSignals;
  courseStatusRecords?: DegreeWorksCourseStatusRecord[];
  courseStatusCounts?: DegreeWorksCourseStatusCounts;
  parserWarnings?: string[];
  parserConfidence?: DegreeWorksParserConfidence;
  totalPlannedCredits: number | null;
  exactRequiredCoursesSatisfied: PlanCheckCourse[];
  exactRequiredCoursesMissing: PlanCheckCourse[];
  alternativeCourseGroups: SoftwareEngineeringAlternativeCourseGroup[];
  advisorVerifiedRequirements: AdvisorVerifiedRequirement[];
  requirementBlocks: RequirementBlockResult[];
  totalHoursRequired: number;
  hasEnoughTotalCredits: boolean | null;
  isLikelyComplete: boolean;
  advisorVerificationRequired: boolean;
  notes: string[];
};

export type ComputerSciencePlanCheckResult = SoftwareEngineeringPlanCheckResult;

export type DegreeWorksSemesterAnalysis = DegreeWorksSemesterExtraction;
export type SoftwareEngineeringPrerequisiteCheck =
  SoftwareEngineeringPrerequisiteCheckResult;
export type NextSemesterSuggestedCourse = SharedNextSemesterSuggestedCourse;
export type NextSemesterSuggestions = SharedNextSemesterSuggestions;

export type CombinedDegreeWorksUploadResult = {
  documentType?: "planned_path";
  selectedTargetPath: PlanningTargetPathInput;
  sourceFileName: string;
  parsedCourseCount: number;
  parsedCourseCodes: string[];
  totalPlannedCredits: number | null;
  detectedSignals: DegreeWorksDetectedSignals;
  courseStatusRecords: DegreeWorksCourseStatusRecord[];
  courseStatusCounts: DegreeWorksCourseStatusCounts;
  parserWarnings: string[];
  parserConfidence: DegreeWorksParserConfidence;
  semesterPlanAnalysis: DegreeWorksSemesterAnalysis;
  prerequisiteCheck: SoftwareEngineeringPrerequisiteCheck;
  gapReport: GapReport;
  nextSemesterSuggestions: NextSemesterSuggestions;
  draftSemesterPlan: DraftSemesterPlan;
  aiCertificateCheck: Omit<
    PlanCheckResult,
    | "planDescription"
    | "major"
    | "totalPlannedCredits"
    | "sourceFileName"
    | "parsedCourseCodes"
    | "parsedCourseCount"
  >;
  softwareEngineeringCheck: Omit<
    SoftwareEngineeringPlanCheckResult,
    | "planDescription"
    | "major"
    | "program"
    | "sourceFileName"
    | "parsedCourseCodes"
    | "parsedCourseCount"
  >;
  computerScienceCheck: Omit<
    ComputerSciencePlanCheckResult,
    | "planDescription"
    | "major"
    | "program"
    | "sourceFileName"
    | "parsedCourseCodes"
    | "parsedCourseCount"
  >;
  notes: string[];
};

export type CurrentDegreeWorksUploadResult = {
  selectedTargetPath: PlanningTargetPathInput;
  sourceFileName: string;
  documentType: DegreeWorksDocumentType;
  documentTypeDetection: DegreeWorksDocumentTypeDetection;
  currentProgressAnalysis: CurrentDegreeAuditAnalysis;
  currentStateGapReport: CurrentStateGapReport;
  currentStateNextSteps: CurrentStateNextSteps;
  advisorMeetingSummary: string;
  parserDiagnostics: {
    parserWarnings: string[];
    parserConfidence: DegreeWorksParserConfidence;
  };
  aiCertificateCheck?: PlanCheckResult;
  softwareEngineeringCheck?: SoftwareEngineeringPlanCheckResult;
  computerScienceCheck?: ComputerSciencePlanCheckResult;
  notes: string[];
};
