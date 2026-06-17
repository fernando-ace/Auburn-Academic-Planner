"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileUp,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, MouseEvent, useMemo, useState } from "react";

import { parseCourseCodes } from "@/lib/courses/course-code-parser";
import { buildAdvisorMeetingSummary } from "@/lib/plan/advisor-meeting-summary";
import type {
  DegreeWorksDetectedSignals,
  DegreeWorksParserConfidence,
} from "@/lib/plan/degreeworks-analysis";
import type {
  DegreeWorksCourseStatus,
  DegreeWorksCourseStatusCounts,
  DegreeWorksCourseStatusRecord,
} from "@/lib/plan/degreeworks-course-status";
import type { GapReport, GapReportBestFitPath, GapReportStatus } from "@/lib/plan/gap-report";

type PlanCheckCourse = {
  code: string;
  title: string;
  creditHours: number;
  approvalStatus?: string;
};

type PlanCheckResult = {
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

type SoftwareEngineeringAlternativeCourseGroup = {
  name: string;
  minimumCoursesRequired: number;
  courses: PlanCheckCourse[];
  satisfiedCourses: PlanCheckCourse[];
  missingCourseOptions: PlanCheckCourse[];
  isSatisfied: boolean;
};

type AdvisorVerifiedRequirement = {
  name: string;
  creditHoursRequired: number;
};

type RequirementBlockStatus =
  | "satisfied"
  | "missing"
  | "partial"
  | "advisor_review"
  | "insufficient_data";

type RequirementBlockResult = {
  blockName: string;
  status: RequirementBlockStatus;
  satisfiedCourses: string[];
  missingCourses: string[];
  candidateCourses: string[];
  requiredCredits?: number;
  matchedCredits?: number;
  notes: string[];
};

type SoftwareEngineeringPlanCheckResult = {
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

type ComputerSciencePlanCheckResult = SoftwareEngineeringPlanCheckResult;

type DegreeWorksSemesterTerm = {
  label: string;
  index: number;
  courseCodes: string[];
};

type DegreeWorksSemesterAnalysis = {
  terms: DegreeWorksSemesterTerm[];
  unassignedCourseCodes: string[];
  warnings: string[];
  confidence: DegreeWorksParserConfidence;
};

type PrerequisiteIssue = {
  courseCode: string;
  termLabel?: string;
  missingPrerequisites: string[];
  severity: "warning" | "blocking" | "advisor_review";
  message: string;
};

type SoftwareEngineeringPrerequisiteCheck = {
  checkedCourseCount: number;
  prerequisiteIssues: PrerequisiteIssue[];
  advisorReviewItems: string[];
  semesterConfidence: DegreeWorksParserConfidence;
  isLikelySequenceValid: boolean | null;
  notes: string[];
};

type NextSemesterSuggestedCourse = {
  code: string;
  title?: string;
  reason: string;
  category:
    | "missing_required"
    | "certificate_requirement"
    | "prerequisite_foundation"
    | "advisor_review";
  priority: "high" | "medium" | "low";
  advisorVerificationRequired: boolean;
};

type NextSemesterNotYetRecommendedCourse = {
  code: string;
  reason: string;
};

type NextSemesterSuggestions = {
  targetPath:
    | "software_engineering"
    | "computer_science"
    | "ai_certificate"
    | "mixed_or_unclear";
  confidence: DegreeWorksParserConfidence;
  suggestedCourses: NextSemesterSuggestedCourse[];
  notYetRecommended: NextSemesterNotYetRecommendedCourse[];
  advisorQuestions: string[];
  notes: string[];
};

type CombinedDegreeWorksUploadResult = {
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

const planCheckEndpoint = "/api/plan/check-ai-certificate";
const planCheckUploadEndpoint = "/api/plan/check-ai-certificate/upload";
const combinedDegreeWorksUploadEndpoint =
  "/api/plan/analyze-degreeworks/upload";
const softwareEngineeringPlanCheckEndpoint =
  "/api/plan/check-software-engineering";
const softwareEngineeringPlanCheckUploadEndpoint =
  "/api/plan/check-software-engineering/upload";
const computerSciencePlanCheckEndpoint =
  "/api/plan/check-computer-science";
const computerSciencePlanCheckUploadEndpoint =
  "/api/plan/check-computer-science/upload";
const samplePasteText = `COMP 5130
COMP 5600
COMP 5630
COMP 5610`;

function BooleanPill({ value }: { value: boolean }) {
  return (
    <span
      className={`rounded-sm border px-2.5 py-1 text-[13px] font-semibold ${
        value
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-orange-200 bg-orange-50 text-orange-800"
      }`}
    >
      {value ? "Yes" : "No"}
    </span>
  );
}

function NullableBooleanPill({ value }: { value: boolean | null }) {
  if (value === null) {
    return (
      <span className="rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1 text-[13px] font-semibold text-slate-600">
        Not provided
      </span>
    );
  }

  return <BooleanPill value={value} />;
}

function hasAdvisorWarningSignals(detectedSignals?: DegreeWorksDetectedSignals) {
  if (!detectedSignals) {
    return false;
  }

  return (
    detectedSignals.hasApCreditSignal ||
    detectedSignals.hasTransferCreditSignal ||
    detectedSignals.hasSubstitutionSignal ||
    detectedSignals.hasExceptionSignal ||
    detectedSignals.hasInProgressSignal
  );
}

function getDetectedSignalLabels(detectedSignals?: DegreeWorksDetectedSignals) {
  if (!detectedSignals) {
    return [];
  }

  return [
    detectedSignals.hasApCreditSignal ? "AP/AICE/IB" : null,
    detectedSignals.hasTransferCreditSignal ? "Transfer credit" : null,
    detectedSignals.hasInProgressSignal ? "In progress" : null,
    detectedSignals.hasSubstitutionSignal ? "Substitution" : null,
    detectedSignals.hasExceptionSignal ? "Exception/waiver" : null,
    detectedSignals.hasInsufficientTextSignal ? "Insufficient text" : null,
  ].filter((label): label is string => Boolean(label));
}

function ParserNotes({
  detectedSignals,
  parserConfidence,
  parserWarnings = [],
}: {
  detectedSignals?: DegreeWorksDetectedSignals;
  parserConfidence?: DegreeWorksParserConfidence;
  parserWarnings?: string[];
}) {
  if (!parserConfidence && parserWarnings.length === 0 && !detectedSignals) {
    return null;
  }

  const signalLabels = getDetectedSignalLabels(detectedSignals);
  const shouldShowAdvisorCaveat = hasAdvisorWarningSignals(detectedSignals);

  return (
    <div className="rounded-md border border-[#dd550c]/25 bg-[#fff7f1] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] font-semibold text-slate-800">
          PDF parsing notes
        </p>
        {parserConfidence ? (
          <span className="rounded-sm border border-[#dd550c]/25 bg-white px-2 py-1 text-[12px] font-semibold uppercase text-[#9b3900]">
            Confidence: {parserConfidence}
          </span>
        ) : null}
      </div>

      {signalLabels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {signalLabels.map((signalLabel) => (
            <span
              className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-[12px] font-semibold text-slate-700"
              key={signalLabel}
            >
              {signalLabel}
            </span>
          ))}
        </div>
      ) : null}

      {parserWarnings.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {parserWarnings.map((warning) => (
            <li
              className="flex gap-2 text-[13px] leading-5 text-slate-700"
              key={warning}
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-[#b84300]"
                size={15}
              />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {shouldShowAdvisorCaveat ? (
        <p className="mt-3 text-[13px] leading-5 text-slate-700">
          The parser found possible AP, transfer, substitution, exception, or
          in-progress signals. Advisor verification is required before relying
          on this result.
        </p>
      ) : null}
    </div>
  );
}

function CourseList({
  courses,
  emptyText,
}: {
  courses: PlanCheckCourse[];
  emptyText: string;
}) {
  if (courses.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {courses.map((course) => (
        <li
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700"
          key={course.code}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-slate-950">{course.code}</span>
            <span className="text-slate-500">
              {course.creditHours} credits
            </span>
          </div>
          <p className="mt-1 text-slate-600">{course.title}</p>
          {course.approvalStatus ? (
            <p className="mt-1 text-[12px] font-medium text-[#9b3900]">
              Advisor verification candidate
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function AdvisorRequirementList({
  requirements,
}: {
  requirements: AdvisorVerifiedRequirement[];
}) {
  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {requirements.map((requirement) => (
        <li
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700"
          key={requirement.name}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-950">
              {requirement.name}
            </span>
            <span className="rounded-sm bg-slate-100 px-2 py-1 text-[12px] font-semibold text-slate-600">
              {requirement.creditHoursRequired} credits
            </span>
          </div>
          <p className="mt-1 text-slate-600">
            Requires advisor, Degree Works, transfer, substitution, or elective
            verification.
          </p>
        </li>
      ))}
    </ul>
  );
}

function RequirementBlockStatusPill({
  status,
}: {
  status: RequirementBlockStatus;
}) {
  const styleByStatus: Record<RequirementBlockStatus, string> = {
    satisfied: "border-emerald-200 bg-emerald-50 text-emerald-800",
    partial: "border-amber-200 bg-amber-50 text-amber-800",
    missing: "border-orange-200 bg-orange-50 text-orange-800",
    advisor_review: "border-[#dd550c]/25 bg-[#fff7f1] text-[#9b3900]",
    insufficient_data: "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <span
      className={`rounded-sm border px-2 py-1 text-[12px] font-semibold uppercase ${styleByStatus[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function RequirementBlockList({
  blocks,
}: {
  blocks: RequirementBlockResult[];
}) {
  if (blocks.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
        No structured requirement blocks were returned.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {blocks.map((block) => (
        <details
          className="rounded-md border border-slate-200 bg-slate-50 p-3"
          key={block.blockName}
        >
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[14px] font-semibold text-slate-950">
                  {block.blockName}
                </h3>
                {typeof block.requiredCredits === "number" ? (
                  <p className="mt-1 text-[13px] leading-5 text-slate-600">
                    {block.matchedCredits ?? 0} of {block.requiredCredits} modeled
                    credits
                  </p>
                ) : null}
              </div>
              <RequirementBlockStatusPill status={block.status} />
            </div>
          </summary>

          <div className="mt-3 grid gap-3 text-[13px] leading-5 text-slate-700">
            {block.satisfiedCourses.length > 0 ? (
              <p>
                <span className="font-semibold text-slate-900">
                  Satisfied:
                </span>{" "}
                {block.satisfiedCourses.join(", ")}
              </p>
            ) : null}
            {block.missingCourses.length > 0 ? (
              <p>
                <span className="font-semibold text-slate-900">Missing:</span>{" "}
                {block.missingCourses.join(", ")}
              </p>
            ) : null}
            {block.candidateCourses.length > 0 ? (
              <p>
                <span className="font-semibold text-slate-900">
                  Candidate courses:
                </span>{" "}
                {block.candidateCourses.join(", ")}
              </p>
            ) : null}
            {block.notes.length > 0 ? (
              <ul className="space-y-1">
                {block.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ResultCard({
  result,
  showUploadedPdfDetails = true,
}: {
  result: PlanCheckResult;
  showUploadedPdfDetails?: boolean;
}) {
  const hasUploadedPdfResult =
    showUploadedPdfDetails &&
    (typeof result.sourceFileName === "string" ||
      typeof result.parsedCourseCount === "number");

  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
            {hasUploadedPdfResult ? "Plan source" : "Plan description"}
          </p>
          <h2 className="mt-2 text-[21px] font-semibold leading-7 text-slate-950">
            {result.planDescription ?? "Uploaded Degree Works PDF"}
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[24rem]">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {hasUploadedPdfResult ? "Source file" : "Major"}
            </p>
            <p className="mt-1 text-[14px] font-semibold leading-5 text-slate-800">
              {hasUploadedPdfResult
                ? (result.sourceFileName ?? "Not provided")
                : (result.major ?? "Not provided")}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {hasUploadedPdfResult
                ? "Parsed course count"
                : "Total planned credits"}
            </p>
            <p className="mt-1 text-[14px] font-semibold leading-5 text-slate-800">
              {hasUploadedPdfResult
                ? (result.parsedCourseCount ?? 0)
                : (result.totalPlannedCredits ?? "Not provided")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5">
        {hasUploadedPdfResult ? (
          <ResultSection title="Parsed course codes">
            <ParsedCourseCodes
              courseCodes={result.parsedCourseCodes ?? []}
              parsedCourseCount={result.parsedCourseCount ?? 0}
            />
          </ResultSection>
        ) : null}

        {hasUploadedPdfResult && result.parserConfidence ? (
          <ResultSection title="PDF parsing notes">
            <ParserNotes
              detectedSignals={result.detectedSignals}
              parserConfidence={result.parserConfidence}
              parserWarnings={result.parserWarnings}
            />
          </ResultSection>
        ) : null}

        <ResultSection title="Required courses satisfied">
          <CourseList
            courses={result.requiredCoursesSatisfied}
            emptyText="No required courses were found in this plan."
          />
        </ResultSection>

        <ResultSection title="Required courses missing">
          <CourseList
            courses={result.requiredCoursesMissing}
            emptyText="No required courses are missing."
          />
        </ResultSection>

        <ResultSection title="Elective candidates found">
          <CourseList
            courses={result.electiveCandidatesFound}
            emptyText="No elective candidates were found."
          />
        </ResultSection>

        <ResultSection title="Completion review">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[14px] font-semibold text-slate-700">
                Likely complete
              </p>
              <BooleanPill value={result.isLikelyComplete} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[14px] font-semibold text-slate-700">
                Advisor verification required
              </p>
              <BooleanPill value={result.advisorVerificationRequired} />
            </div>
          </div>
        </ResultSection>

        <ResultSection title="Notes">
          <ul className="space-y-2 rounded-md border border-[#dd550c]/25 bg-[#fff7f1] p-3">
            {result.notes.map((note) => (
              <li
                className="flex gap-2 text-[13px] leading-5 text-slate-700"
                key={note}
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#b84300]"
                  size={16}
                />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </ResultSection>
      </div>
    </article>
  );
}

function DegreeProgressResultCard({
  degreeName,
  result,
  showUploadedPdfDetails = true,
}: {
  degreeName: string;
  result: SoftwareEngineeringPlanCheckResult | ComputerSciencePlanCheckResult;
  showUploadedPdfDetails?: boolean;
}) {
  const hasUploadedPdfResult =
    showUploadedPdfDetails &&
    (typeof result.sourceFileName === "string" ||
      typeof result.parsedCourseCount === "number");
  const notes = Array.from(
    new Set([
      hasUploadedPdfResult
        ? "This extracted PDF does not prove final degree completion."
        : "This extracted plan does not prove final degree completion.",
      "Advisor verification is required.",
      "AP, transfer, substitutions, hidden Degree Works sections, electives, prerequisites, and semester ordering may affect this result.",
      ...result.notes,
    ]),
  );

  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
            {hasUploadedPdfResult ? "Plan source" : "Plan source description"}
          </p>
          <h2 className="mt-2 text-[21px] font-semibold leading-7 text-slate-950">
            {result.planDescription ??
              result.sourceFileName ??
              "Uploaded Degree Works PDF"}
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-600">
            {hasUploadedPdfResult
              ? "This extracted plan does not prove final degree completion. AP, transfer, substitutions, hidden Degree Works sections, electives, prerequisites, and semester ordering may affect this result."
              : "This extracted plan does not prove final degree completion. AP, transfer, substitutions, hidden Degree Works sections, electives, prerequisites, and semester ordering may affect this result."}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[28rem]">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {hasUploadedPdfResult ? "Source file" : "Major"}
            </p>
            <p className="mt-1 text-[14px] font-semibold leading-5 text-slate-800">
              {hasUploadedPdfResult
                ? (result.sourceFileName ?? "Not provided")
                : (result.major ?? "Not provided")}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {hasUploadedPdfResult ? "Parsed course count" : "Program"}
            </p>
            <p className="mt-1 text-[14px] font-semibold leading-5 text-slate-800">
              {hasUploadedPdfResult
                ? (result.parsedCourseCount ?? 0)
                : (result.program ?? "Not provided")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5">
        {hasUploadedPdfResult ? (
          <ResultSection title="Parsed course codes">
            <ParsedCourseCodes
              courseCodes={result.parsedCourseCodes ?? []}
              parsedCourseCount={result.parsedCourseCount ?? 0}
            />
          </ResultSection>
        ) : null}

        {hasUploadedPdfResult && result.parserConfidence ? (
          <ResultSection title="PDF parsing notes">
            <ParserNotes
              detectedSignals={result.detectedSignals}
              parserConfidence={result.parserConfidence}
              parserWarnings={result.parserWarnings}
            />
          </ResultSection>
        ) : null}

        <ResultSection title="Credit totals">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Planned credits
              </p>
              <p className="mt-1 text-[18px] font-semibold leading-6 text-slate-950">
                {result.totalPlannedCredits ??
                  (hasUploadedPdfResult
                    ? "Not available from PDF extraction"
                    : "Not provided")}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Required credits
              </p>
              <p className="mt-1 text-[18px] font-semibold leading-6 text-slate-950">
                {result.totalHoursRequired}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[14px] font-semibold text-slate-700">
                Total credits pass
              </p>
              <NullableBooleanPill value={result.hasEnoughTotalCredits} />
            </div>
          </div>
        </ResultSection>

        <ResultSection title="Exact required courses satisfied">
          <CourseList
            courses={result.exactRequiredCoursesSatisfied}
            emptyText={`No exact required ${degreeName} courses were found in this plan.`}
          />
        </ResultSection>

        <ResultSection title="Exact required courses missing">
          <CourseList
            courses={result.exactRequiredCoursesMissing}
            emptyText={`No exact required ${degreeName} courses are missing from the extracted plan.`}
          />
        </ResultSection>

        <ResultSection title="Alternative course groups">
          <div className="grid gap-3">
            {result.alternativeCourseGroups.map((group) => (
              <section
                className="rounded-md border border-slate-200 bg-slate-50 p-3"
                key={group.name}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[14px] font-semibold text-slate-950">
                      {group.name}
                    </h3>
                    <p className="mt-1 text-[13px] leading-5 text-slate-600">
                      Requires {group.minimumCoursesRequired} course
                      {group.minimumCoursesRequired === 1 ? "" : "s"} from this
                      group.
                    </p>
                  </div>
                  <BooleanPill value={group.isSatisfied} />
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Satisfied options
                    </p>
                    <CourseList
                      courses={group.satisfiedCourses}
                      emptyText="No options from this group were found."
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Other options
                    </p>
                    <CourseList
                      courses={group.missingCourseOptions}
                      emptyText="No additional options remain."
                    />
                  </div>
                </div>
              </section>
            ))}
          </div>
        </ResultSection>

        <ResultSection title="Requirement Blocks">
          <RequirementBlockList blocks={result.requirementBlocks ?? []} />
        </ResultSection>

        <ResultSection title="Advisor-verified requirement blocks">
          <AdvisorRequirementList
            requirements={result.advisorVerifiedRequirements}
          />
        </ResultSection>

        <ResultSection title="Completion review">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[14px] font-semibold text-slate-700">
                Extracted plan likely proves completion
              </p>
              <BooleanPill value={result.isLikelyComplete} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[14px] font-semibold text-slate-700">
                Advisor verification required
              </p>
              <BooleanPill value={result.advisorVerificationRequired} />
            </div>
          </div>
        </ResultSection>

        <ResultSection title="Notes">
          <ul className="space-y-2 rounded-md border border-[#dd550c]/25 bg-[#fff7f1] p-3">
            {notes.map((note) => (
              <li
                className="flex gap-2 text-[13px] leading-5 text-slate-700"
                key={note}
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#b84300]"
                  size={16}
                />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </ResultSection>
      </div>
    </article>
  );
}

function ParsedCourseCodes({
  courseCodes,
  parsedCourseCount,
}: {
  courseCodes: string[];
  parsedCourseCount: number;
}) {
  if (courseCodes.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
        No course codes were parsed from this PDF.
      </p>
    );
  }

  const previewCodes = courseCodes.slice(0, 12);
  const hiddenCount = Math.max(0, parsedCourseCount - previewCodes.length);

  return (
    <details className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[13px] leading-5 text-slate-700">
      <summary className="cursor-pointer font-semibold text-slate-800">
        {parsedCourseCount} parsed courses
        {hiddenCount > 0 ? `, showing first ${previewCodes.length}` : ""}
      </summary>
      <div className="mt-3 flex flex-wrap gap-2">
        {courseCodes.map((courseCode) => (
          <span
            className="rounded-sm border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700"
            key={courseCode}
          >
            {courseCode}
          </span>
        ))}
      </div>
    </details>
  );
}

function CourseStatusSummary({
  counts,
}: {
  counts: DegreeWorksCourseStatusCounts;
}) {
  const statusItems: { status: DegreeWorksCourseStatus; label: string }[] = [
    { status: "completed", label: "Completed" },
    { status: "in_progress", label: "In progress" },
    { status: "planned", label: "Planned" },
    { status: "transfer_or_ap", label: "Transfer/AP" },
    { status: "substituted_or_waived", label: "Substituted/waived" },
    { status: "missing", label: "Missing" },
    { status: "unknown", label: "Unknown" },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {statusItems.map((item) => (
        <div
          className="rounded-md border border-slate-200 bg-slate-50 p-3"
          key={item.status}
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {item.label}
          </p>
          <p className="mt-1 text-[18px] font-semibold leading-6 text-slate-950">
            {counts[item.status]}
          </p>
        </div>
      ))}
    </div>
  );
}

function ParsedCourseStatuses({
  records,
}: {
  records: DegreeWorksCourseStatusRecord[];
}) {
  if (records.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
        No course statuses were parsed from this PDF.
      </p>
    );
  }

  return (
    <details className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[13px] leading-5 text-slate-700">
      <summary className="cursor-pointer font-semibold text-slate-800">
        {records.length} parsed course statuses
      </summary>
      <div className="mt-3 grid gap-2">
        {records.map((record) => (
          <div
            className="rounded-md border border-slate-200 bg-white p-3"
            key={`${record.code}-${record.status}-${record.termLabel ?? ""}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-950">
                {record.code}
              </span>
              <CourseStatusPill status={record.status} />
              <span className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] font-semibold text-slate-600">
                {record.confidence} confidence
              </span>
              {record.termLabel ? (
                <span className="text-[12px] text-slate-500">
                  {record.termLabel}
                </span>
              ) : null}
              {typeof record.credits === "number" ? (
                <span className="text-[12px] text-slate-500">
                  {record.credits} credits
                </span>
              ) : null}
            </div>
            {record.rawEvidence ? (
              <p className="mt-2 max-h-10 overflow-hidden text-[12px] leading-5 text-slate-500">
                {record.rawEvidence}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </details>
  );
}

function CourseStatusPill({ status }: { status: DegreeWorksCourseStatus }) {
  const styleByStatus: Record<DegreeWorksCourseStatus, string> = {
    completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
    in_progress: "border-sky-200 bg-sky-50 text-sky-800",
    planned: "border-blue-200 bg-blue-50 text-blue-800",
    transfer_or_ap: "border-violet-200 bg-violet-50 text-violet-800",
    substituted_or_waived: "border-amber-200 bg-amber-50 text-amber-800",
    missing: "border-rose-200 bg-rose-50 text-rose-800",
    unknown: "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <span
      className={`rounded-sm border px-2 py-1 text-[12px] font-semibold uppercase ${styleByStatus[status]}`}
    >
      {formatCourseStatusLabel(status)}
    </span>
  );
}

function SequenceValidityPill({ value }: { value: boolean | null }) {
  if (value === null) {
    return (
      <span className="rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1 text-[13px] font-semibold text-slate-600">
        Cannot determine
      </span>
    );
  }

  return <BooleanPill value={value} />;
}

function SemesterPrerequisiteCheck({
  semesterPlanAnalysis,
  prerequisiteCheck,
}: {
  semesterPlanAnalysis: DegreeWorksSemesterAnalysis;
  prerequisiteCheck: SoftwareEngineeringPrerequisiteCheck;
}) {
  const hasDetectedTerms = semesterPlanAnalysis.terms.length > 0;
  const sequenceStatus =
    prerequisiteCheck.isLikelySequenceValid === null
      ? "Cannot determine"
      : prerequisiteCheck.isLikelySequenceValid
        ? "No modeled warnings"
        : "Warnings found";

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Semester confidence
          </p>
          <p className="mt-1 text-[16px] font-semibold leading-6 text-slate-950">
            {semesterPlanAnalysis.confidence}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Checked courses
          </p>
          <p className="mt-1 text-[16px] font-semibold leading-6 text-slate-950">
            {prerequisiteCheck.checkedCourseCount}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Sequence validity
            </p>
            <p className="mt-1 text-[13px] leading-5 text-slate-600">
              {sequenceStatus}
            </p>
          </div>
          <SequenceValidityPill
            value={prerequisiteCheck.isLikelySequenceValid}
          />
        </div>
      </div>

      {semesterPlanAnalysis.confidence === "low" ? (
        <p className="rounded-md border border-orange-200 bg-orange-50 p-3 text-[13px] leading-5 text-orange-800">
          This PDF did not provide enough reliable term structure to validate
          course order.
        </p>
      ) : null}

      {hasDetectedTerms ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-[14px] font-semibold text-slate-800">
            Detected terms
          </p>
          <div className="mt-3 grid gap-2">
            {semesterPlanAnalysis.terms.map((term) => (
              <details
                className="rounded-md border border-slate-200 bg-white p-3 text-[13px] leading-5 text-slate-700"
                key={`${term.index}-${term.label}`}
              >
                <summary className="cursor-pointer font-semibold text-slate-800">
                  {term.label}: {term.courseCodes.length} courses
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {term.courseCodes.map((courseCode) => (
                    <span
                      className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-700"
                      key={`${term.label}-${courseCode}`}
                    >
                      {courseCode}
                    </span>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      ) : null}

      {prerequisiteCheck.prerequisiteIssues.length > 0 ? (
        <div className="rounded-md border border-[#dd550c]/25 bg-[#fff7f1] p-3">
          <p className="text-[14px] font-semibold text-slate-800">
            Prerequisite issues
          </p>
          <ul className="mt-3 space-y-2">
            {prerequisiteCheck.prerequisiteIssues.map((issue) => (
              <li
                className="flex gap-2 text-[13px] leading-5 text-slate-700"
                key={`${issue.courseCode}-${issue.message}`}
              >
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#b84300]"
                  size={15}
                />
                <span>
                  <span className="font-semibold text-slate-900">
                    {issue.courseCode}
                    {issue.termLabel ? ` (${issue.termLabel})` : ""}
                  </span>
                  : {issue.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
          No modeled prerequisite warnings were found.
        </p>
      )}

      {prerequisiteCheck.advisorReviewItems.length > 0 ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-[14px] font-semibold text-slate-800">
            Advisor review items
          </p>
          <ul className="mt-3 space-y-2">
            {prerequisiteCheck.advisorReviewItems.map((item) => (
              <li
                className="flex gap-2 text-[13px] leading-5 text-slate-700"
                key={item}
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#b84300]"
                  size={15}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {semesterPlanAnalysis.warnings.length > 0 ||
      prerequisiteCheck.notes.length > 0 ? (
        <ul className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
          {[...semesterPlanAnalysis.warnings, ...prerequisiteCheck.notes].map(
            (note) => (
              <li
                className="flex gap-2 text-[13px] leading-5 text-slate-700"
                key={note}
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#b84300]"
                  size={15}
                />
                <span>{note}</span>
              </li>
            ),
          )}
        </ul>
      ) : null}
    </div>
  );
}

function GapReportCard({ gapReport }: { gapReport: GapReport }) {
  return (
    <section className="mb-5 rounded-md border border-[#dd550c]/35 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
            Unified advising report
          </p>
          <h2 className="mt-2 text-[22px] font-semibold leading-8 text-slate-950">
            Gap Report and Next Actions
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-600">
            This is a planning summary, not an official degree audit. Use this
            to prepare for an academic advisor meeting.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[30rem]">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Overall status
            </p>
            <span
              className={`mt-2 inline-flex rounded-sm border px-2.5 py-1 text-[13px] font-semibold ${getGapStatusClassName(
                gapReport.overallStatus,
              )}`}
            >
              {formatGapStatus(gapReport.overallStatus)}
            </span>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Best fit path
            </p>
            <p className="mt-2 text-[14px] font-semibold leading-5 text-slate-800">
              {formatGapBestFitPath(gapReport.bestFitPath)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <GapReportList items={gapReport.summaryBullets} title="Summary" />
        <GapReportList
          emptyText="No satisfied highlights were identified."
          items={gapReport.satisfiedHighlights}
          title="Satisfied highlights"
        />

        <ResultSection title="Missing requirements">
          {gapReport.missingRequirements.length > 0 ? (
            <div className="grid gap-3">
              {gapReport.missingRequirements.map((requirement) => (
                <div
                  className="rounded-md border border-slate-200 bg-slate-50 p-3"
                  key={`${requirement.area}-${requirement.severity}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold text-slate-800">
                      {requirement.area}
                    </p>
                    <span className="rounded-sm border border-[#dd550c]/25 bg-white px-2 py-1 text-[12px] font-semibold uppercase text-[#9b3900]">
                      {requirement.severity.replace("_", " ")}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {requirement.items.map((item) => (
                      <li
                        className="flex gap-2 text-[13px] leading-5 text-slate-700"
                        key={item}
                      >
                        <AlertCircle
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-[#b84300]"
                          size={15}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
              No modeled missing requirements were found in the unified report.
            </p>
          )}
        </ResultSection>

        <GapReportList
          emptyText="No additional advisor review items were identified."
          items={gapReport.advisorReviewItems}
          title="Advisor review items"
        />
        <GapReportList items={gapReport.nextActions} title="Next actions" />
        <GapReportList
          items={gapReport.advisorQuestions}
          title="Advisor questions"
        />
      </div>
    </section>
  );
}

function NextSemesterSuggestionsCard({
  suggestions,
}: {
  suggestions: NextSemesterSuggestions;
}) {
  return (
    <section className="mb-5 rounded-md border border-[#03244d]/25 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
            Advisor planning
          </p>
          <h2 className="mt-2 text-[22px] font-semibold leading-8 text-slate-950">
            Next Semester Suggestions
          </h2>
          <div className="mt-2 max-w-3xl space-y-1 text-[14px] leading-6 text-slate-600">
            <p>
              These are planning suggestions to discuss with an academic
              advisor.
            </p>
            <p>This is not registration advice or an official schedule.</p>
            <p>
              Course availability, prerequisites, AP/transfer credit,
              substitutions, and advisor approval may change these suggestions.
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[30rem]">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Target path
            </p>
            <p className="mt-2 text-[14px] font-semibold leading-5 text-slate-800">
              {formatGapBestFitPath(suggestions.targetPath)}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Confidence
            </p>
            <span
              className={`mt-2 inline-flex rounded-sm border px-2.5 py-1 text-[13px] font-semibold ${getSuggestionConfidenceClassName(
                suggestions.confidence,
              )}`}
            >
              {suggestions.confidence}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <ResultSection title="Suggested courses to discuss">
          {suggestions.suggestedCourses.length > 0 ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {suggestions.suggestedCourses.map((course) => (
                <li
                  className="rounded-md border border-slate-200 bg-slate-50 p-3"
                  key={course.code}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[15px] font-semibold leading-5 text-slate-950">
                        {course.code}
                      </p>
                      {course.title ? (
                        <p className="mt-1 text-[13px] leading-5 text-slate-600">
                          {course.title}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-sm border border-[#dd550c]/25 bg-white px-2 py-1 text-[12px] font-semibold uppercase text-[#9b3900]">
                      {course.priority}
                    </span>
                  </div>
                  <p className="mt-3 text-[13px] leading-5 text-slate-700">
                    {course.reason}
                  </p>
                  <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {formatSuggestionCategory(course.category)}
                  </p>
                  {course.advisorVerificationRequired ? (
                    <p className="mt-2 text-[12px] font-medium text-[#9b3900]">
                      Advisor verification required
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
              No specific next-semester course suggestions were produced from
              the current deterministic rules.
            </p>
          )}
        </ResultSection>

        <ResultSection title="Not yet recommended">
          {suggestions.notYetRecommended.length > 0 ? (
            <ul className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              {suggestions.notYetRecommended.map((course) => (
                <li
                  className="flex gap-2 text-[13px] leading-5 text-slate-700"
                  key={course.code}
                >
                  <AlertCircle
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[#b84300]"
                    size={15}
                  />
                  <span>
                    <span className="font-semibold text-slate-950">
                      {course.code}:
                    </span>{" "}
                    {course.reason}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
              No modeled course was held back by missing prerequisites.
            </p>
          )}
        </ResultSection>

        <GapReportList
          items={suggestions.advisorQuestions}
          title="Advisor questions"
        />
        <GapReportList items={suggestions.notes} title="Notes" />
      </div>
    </section>
  );
}

function GapReportList({
  emptyText = "Nothing to show.",
  items,
  title,
}: {
  emptyText?: string;
  items: string[];
  title: string;
}) {
  return (
    <ResultSection title={title}>
      {items.length > 0 ? (
        <ul className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
          {items.map((item) => (
            <li
              className="flex gap-2 text-[13px] leading-5 text-slate-700"
              key={item}
            >
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-[#b84300]"
                size={15}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
          {emptyText}
        </p>
      )}
    </ResultSection>
  );
}

function formatGapStatus(status: GapReportStatus) {
  switch (status) {
    case "strong_progress":
      return "Strong progress";
    case "needs_review":
      return "Needs review";
    case "missing_requirements":
      return "Missing requirements";
    case "insufficient_data":
      return "Insufficient data";
  }
}

function getGapStatusClassName(status: GapReportStatus) {
  switch (status) {
    case "strong_progress":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "needs_review":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "missing_requirements":
      return "border-orange-200 bg-orange-50 text-orange-800";
    case "insufficient_data":
      return "border-slate-300 bg-slate-100 text-slate-700";
  }
}

function getSuggestionConfidenceClassName(
  confidence: DegreeWorksParserConfidence,
) {
  switch (confidence) {
    case "high":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "medium":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "low":
      return "border-slate-300 bg-slate-100 text-slate-700";
  }
}

function formatGapBestFitPath(path: GapReportBestFitPath) {
  switch (path) {
    case "ai_certificate":
      return "AI Engineering certificate";
    case "software_engineering":
      return "Software Engineering";
    case "computer_science":
      return "Computer Science";
    case "mixed_or_unclear":
      return "Mixed or unclear";
  }
}

function formatSuggestionCategory(
  category: NextSemesterSuggestedCourse["category"],
) {
  switch (category) {
    case "missing_required":
      return "Missing required";
    case "certificate_requirement":
      return "Certificate requirement";
    case "prerequisite_foundation":
      return "Prerequisite foundation";
    case "advisor_review":
      return "Advisor review";
  }
}

function formatCourseStatusLabel(status: DegreeWorksCourseStatus) {
  switch (status) {
    case "completed":
      return "completed";
    case "in_progress":
      return "in progress";
    case "planned":
      return "planned";
    case "transfer_or_ap":
      return "transfer/AP";
    case "substituted_or_waived":
      return "substituted/waived";
    case "missing":
      return "missing";
    case "unknown":
      return "unknown";
  }
}

function isMostlyUnknownCourseStatuses(counts: DegreeWorksCourseStatusCounts) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return total >= 10 && counts.unknown / total >= 0.5;
}

function CombinedDegreeWorksParsedDetails({
  result,
}: {
  result: CombinedDegreeWorksUploadResult;
}) {
  return (
    <section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
            Combined Degree Works PDF
          </p>
          <h2 className="mt-2 text-[20px] font-semibold leading-7 text-slate-950">
            Shared parsed details
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-600">
            This is not an official degree audit. Advisor verification is
            required.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:w-[34rem]">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Source file name
            </p>
            <p className="mt-1 break-words text-[14px] font-semibold leading-5 text-slate-800">
              {result.sourceFileName}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Parsed course count
            </p>
            <p className="mt-1 text-[18px] font-semibold leading-6 text-slate-950">
              {result.parsedCourseCount}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Total planned credits
            </p>
            <p className="mt-1 text-[18px] font-semibold leading-6 text-slate-950">
              {result.totalPlannedCredits ?? "Not provided"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <ResultSection title="Parsed courses summary">
          <ParsedCourseCodes
            courseCodes={result.parsedCourseCodes}
            parsedCourseCount={result.parsedCourseCount}
          />
        </ResultSection>

        <ResultSection title="Course status summary">
          <div className="grid gap-3">
            <CourseStatusSummary counts={result.courseStatusCounts} />
            {isMostlyUnknownCourseStatuses(result.courseStatusCounts) ? (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-[13px] leading-5 text-amber-900">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 shrink-0"
                  size={16}
                />
                <span>
                  Many courses did not have enough nearby Degree Works status
                  evidence. Treat unknown statuses as advisor-verification
                  items.
                </span>
              </div>
            ) : null}
            <ParsedCourseStatuses records={result.courseStatusRecords} />
          </div>
        </ResultSection>

        <ResultSection title="PDF parsing notes">
          <ParserNotes
            detectedSignals={result.detectedSignals}
            parserConfidence={result.parserConfidence}
            parserWarnings={result.parserWarnings}
          />
        </ResultSection>

        <ResultSection title="Semester and prerequisite check">
          <SemesterPrerequisiteCheck
            prerequisiteCheck={result.prerequisiteCheck}
            semesterPlanAnalysis={result.semesterPlanAnalysis}
          />
        </ResultSection>

        <ResultSection title="Advisor-safe notes">
          <ul className="space-y-2 rounded-md border border-[#dd550c]/25 bg-[#fff7f1] p-3">
            {[
              "This is not an official degree audit.",
              "Advisor verification is required.",
              "AP, transfer, substitutions, hidden Degree Works sections, electives, prerequisites, and semester ordering may require advisor review.",
              ...result.notes,
            ].map((note) => (
              <li
                className="flex gap-2 text-[13px] leading-5 text-slate-700"
                key={note}
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#b84300]"
                  size={16}
                />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </ResultSection>
      </div>
    </section>
  );
}

function AdvisorMeetingSummary({
  summary,
  copyStatus,
  onCopySummary,
}: {
  summary: string;
  copyStatus: string | null;
  onCopySummary: () => void;
}) {
  return (
    <section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[18px] font-semibold leading-7 text-slate-950">
            Advisor Meeting Summary
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-slate-600">
            This is a preparation summary, not an official degree audit.
            Advisor verification is required.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#03244d] px-3 py-2 text-[13px] font-semibold leading-5 text-white transition hover:bg-[#021b3a]"
          onClick={onCopySummary}
          type="button"
        >
          <ClipboardCheck aria-hidden="true" size={16} />
          Copy summary
        </button>
      </div>
      <textarea
        id="advisor-meeting-summary-text"
        className="mt-4 min-h-80 w-full resize-y rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-[12px] leading-5 text-slate-800 outline-none focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
        readOnly
        value={summary}
      />
      {copyStatus ? (
        <p className="mt-2 text-[13px] leading-5 text-slate-600">
          {copyStatus}
        </p>
      ) : null}
    </section>
  );
}

export default function PlanCheckPage() {
  const [enteredCourses, setEnteredCourses] = useState("");
  const [
    enteredSoftwareEngineeringCourses,
    setEnteredSoftwareEngineeringCourses,
  ] = useState("");
  const [
    enteredSoftwareEngineeringTotalCredits,
    setEnteredSoftwareEngineeringTotalCredits,
  ] = useState("");
  const [
    enteredComputerScienceCourses,
    setEnteredComputerScienceCourses,
  ] = useState("");
  const [
    enteredComputerScienceTotalCredits,
    setEnteredComputerScienceTotalCredits,
  ] = useState("");
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [selectedCombinedDegreeWorksPdfFile, setSelectedCombinedDegreeWorksPdfFile] =
    useState<File | null>(null);
  const [
    selectedSoftwareEngineeringPdfFile,
    setSelectedSoftwareEngineeringPdfFile,
  ] = useState<File | null>(null);
  const [
    selectedComputerSciencePdfFile,
    setSelectedComputerSciencePdfFile,
  ] = useState<File | null>(null);
  const [result, setResult] = useState<PlanCheckResult | null>(null);
  const [softwareEngineeringResult, setSoftwareEngineeringResult] =
    useState<SoftwareEngineeringPlanCheckResult | null>(null);
  const [computerScienceResult, setComputerScienceResult] =
    useState<ComputerSciencePlanCheckResult | null>(null);
  const [combinedDegreeWorksResult, setCombinedDegreeWorksResult] =
    useState<CombinedDegreeWorksUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [combinedDegreeWorksError, setCombinedDegreeWorksError] = useState<
    string | null
  >(null);
  const [softwareEngineeringError, setSoftwareEngineeringError] = useState<
    string | null
  >(null);
  const [computerScienceError, setComputerScienceError] = useState<
    string | null
  >(null);
  const [uploadValidationError, setUploadValidationError] = useState<
    string | null
  >(null);
  const [
    combinedDegreeWorksUploadValidationError,
    setCombinedDegreeWorksUploadValidationError,
  ] = useState<string | null>(null);
  const [
    softwareEngineeringUploadValidationError,
    setSoftwareEngineeringUploadValidationError,
  ] = useState<string | null>(null);
  const [
    computerScienceUploadValidationError,
    setComputerScienceUploadValidationError,
  ] = useState<string | null>(null);
  const [
    softwareEngineeringManualValidationError,
    setSoftwareEngineeringManualValidationError,
  ] = useState<string | null>(null);
  const [
    computerScienceManualValidationError,
    setComputerScienceManualValidationError,
  ] = useState<string | null>(null);
  const [advisorSummaryCopyStatus, setAdvisorSummaryCopyStatus] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCombinedDegreeWorksLoading, setIsCombinedDegreeWorksLoading] =
    useState(false);
  const [isSoftwareEngineeringLoading, setIsSoftwareEngineeringLoading] =
    useState(false);
  const [isComputerScienceLoading, setIsComputerScienceLoading] =
    useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Checking entered courses against Auburn certificate rules...",
  );
  const [softwareEngineeringLoadingMessage, setSoftwareEngineeringLoadingMessage] =
    useState("Checking the sample Degree Works plan against Software Engineering degree rules...");
  const [computerScienceLoadingMessage, setComputerScienceLoadingMessage] =
    useState("Checking the sample Degree Works plan against Computer Science degree rules...");

  const parsedCourseCodes = useMemo(
    () => parseCourseCodes(enteredCourses),
    [enteredCourses],
  );
  const parsedSoftwareEngineeringCourseCodes = useMemo(
    () => parseCourseCodes(enteredSoftwareEngineeringCourses),
    [enteredSoftwareEngineeringCourses],
  );
  const parsedComputerScienceCourseCodes = useMemo(
    () => parseCourseCodes(enteredComputerScienceCourses),
    [enteredComputerScienceCourses],
  );
  const advisorMeetingSummary = useMemo(
    () =>
      buildAdvisorMeetingSummary({
        aiResult: result,
        softwareEngineeringResult,
        computerScienceResult,
        prerequisiteCheck: combinedDegreeWorksResult?.prerequisiteCheck ?? null,
        gapReport: combinedDegreeWorksResult?.gapReport ?? null,
        nextSemesterSuggestions:
          combinedDegreeWorksResult?.nextSemesterSuggestions ?? null,
      }),
    [
      combinedDegreeWorksResult?.gapReport,
      combinedDegreeWorksResult?.nextSemesterSuggestions,
      combinedDegreeWorksResult?.prerequisiteCheck,
      computerScienceResult,
      result,
      softwareEngineeringResult,
    ],
  );

  async function runPlanCheck({
    endpoint = planCheckEndpoint,
    request = {},
    message = "Checking entered courses against Auburn certificate rules...",
  }: {
    endpoint?: string;
    request?: RequestInit;
    message?: string;
  } = {}) {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setCombinedDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setLoadingMessage(message);

    try {
      const response = await fetch(endpoint, request);
      const payload = (await response.json()) as Partial<PlanCheckResult> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "The plan check could not run.");
      }

      setResult(payload as PlanCheckResult);
    } catch (fetchError) {
      setResult(null);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "The plan check could not run.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function runCombinedDegreeWorksUploadPlanCheck(file: File) {
    if (isCombinedDegreeWorksLoading) {
      return;
    }

    setIsCombinedDegreeWorksLoading(true);
    setCombinedDegreeWorksError(null);
    setError(null);
    setSoftwareEngineeringError(null);
    setComputerScienceError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(combinedDegreeWorksUploadEndpoint, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | CombinedDegreeWorksUploadResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The combined Degree Works PDF analysis could not run.",
        );
      }

      const combinedPayload = payload as CombinedDegreeWorksUploadResult;
      const sharedPlanFields = {
        planDescription: "Combined Degree Works PDF analysis",
        sourceFileName: combinedPayload.sourceFileName,
        parsedCourseCodes: combinedPayload.parsedCourseCodes,
        parsedCourseCount: combinedPayload.parsedCourseCount,
        detectedSignals: combinedPayload.detectedSignals,
        courseStatusRecords: combinedPayload.courseStatusRecords,
        courseStatusCounts: combinedPayload.courseStatusCounts,
        parserWarnings: combinedPayload.parserWarnings,
        parserConfidence: combinedPayload.parserConfidence,
      };

      setCombinedDegreeWorksResult(combinedPayload);
      setResult({
        ...combinedPayload.aiCertificateCheck,
        ...sharedPlanFields,
        totalPlannedCredits: combinedPayload.totalPlannedCredits,
      });
      setSoftwareEngineeringResult({
        ...combinedPayload.softwareEngineeringCheck,
        ...sharedPlanFields,
        program: "BSWE Software Engineering",
        totalPlannedCredits: combinedPayload.totalPlannedCredits,
      });
      setComputerScienceResult({
        ...combinedPayload.computerScienceCheck,
        ...sharedPlanFields,
        major: "Computer Science",
        program: "CSCI Computer Science",
        totalPlannedCredits: combinedPayload.totalPlannedCredits,
      });
    } catch (fetchError) {
      setCombinedDegreeWorksResult(null);
      setResult(null);
      setSoftwareEngineeringResult(null);
      setComputerScienceResult(null);
      setCombinedDegreeWorksError(
        fetchError instanceof Error
          ? fetchError.message
          : "The combined Degree Works PDF analysis could not run.",
      );
    } finally {
      setIsCombinedDegreeWorksLoading(false);
    }
  }

  async function runSoftwareEngineeringPlanCheck() {
    if (isSoftwareEngineeringLoading) {
      return;
    }

    setIsSoftwareEngineeringLoading(true);
    setSoftwareEngineeringError(null);
    setCombinedDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setSoftwareEngineeringLoadingMessage(
      "Checking the sample Degree Works plan against Software Engineering degree rules...",
    );

    try {
      const response = await fetch(softwareEngineeringPlanCheckEndpoint);
      const payload = (await response.json()) as
        | SoftwareEngineeringPlanCheckResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The Software Engineering degree check could not run.",
        );
      }

      setSoftwareEngineeringResult(payload as SoftwareEngineeringPlanCheckResult);
    } catch (fetchError) {
      setSoftwareEngineeringResult(null);
      setSoftwareEngineeringError(
        fetchError instanceof Error
          ? fetchError.message
          : "The Software Engineering degree check could not run.",
      );
    } finally {
      setIsSoftwareEngineeringLoading(false);
    }
  }

  async function runSoftwareEngineeringManualPlanCheck({
    courseCodes,
    totalPlannedCredits,
  }: {
    courseCodes: string[];
    totalPlannedCredits: number | null;
  }) {
    if (isSoftwareEngineeringLoading) {
      return;
    }

    setIsSoftwareEngineeringLoading(true);
    setSoftwareEngineeringError(null);
    setCombinedDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setSoftwareEngineeringLoadingMessage(
      "Checking pasted plan against Software Engineering degree rules...",
    );

    try {
      const response = await fetch(softwareEngineeringPlanCheckEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCodes,
          planDescription: "Pasted Software Engineering plan",
          major: "Software Engineering",
          totalPlannedCredits,
        }),
      });
      const payload = (await response.json()) as
        | SoftwareEngineeringPlanCheckResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The Software Engineering pasted plan check could not run.",
        );
      }

      setSoftwareEngineeringResult(payload as SoftwareEngineeringPlanCheckResult);
    } catch (fetchError) {
      setSoftwareEngineeringResult(null);
      setSoftwareEngineeringError(
        fetchError instanceof Error
          ? fetchError.message
          : "The Software Engineering pasted plan check could not run.",
      );
    } finally {
      setIsSoftwareEngineeringLoading(false);
    }
  }

  async function runSoftwareEngineeringUploadPlanCheck(file: File) {
    if (isSoftwareEngineeringLoading) {
      return;
    }

    setIsSoftwareEngineeringLoading(true);
    setSoftwareEngineeringError(null);
    setCombinedDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setSoftwareEngineeringLoadingMessage(
      "Checking uploaded Degree Works PDF against Software Engineering degree rules...",
    );

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(softwareEngineeringPlanCheckUploadEndpoint, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | SoftwareEngineeringPlanCheckResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The Software Engineering PDF check could not run.",
        );
      }

      setSoftwareEngineeringResult(payload as SoftwareEngineeringPlanCheckResult);
    } catch (fetchError) {
      setSoftwareEngineeringResult(null);
      setSoftwareEngineeringError(
        fetchError instanceof Error
          ? fetchError.message
          : "The Software Engineering PDF check could not run.",
      );
    } finally {
      setIsSoftwareEngineeringLoading(false);
    }
  }

  async function runComputerSciencePlanCheck() {
    if (isComputerScienceLoading) {
      return;
    }

    setIsComputerScienceLoading(true);
    setComputerScienceError(null);
    setCombinedDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setComputerScienceLoadingMessage(
      "Checking the sample Degree Works plan against Computer Science degree rules...",
    );

    try {
      const response = await fetch(computerSciencePlanCheckEndpoint);
      const payload = (await response.json()) as
        | ComputerSciencePlanCheckResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The Computer Science degree check could not run.",
        );
      }

      setComputerScienceResult(payload as ComputerSciencePlanCheckResult);
    } catch (fetchError) {
      setComputerScienceResult(null);
      setComputerScienceError(
        fetchError instanceof Error
          ? fetchError.message
          : "The Computer Science degree check could not run.",
      );
    } finally {
      setIsComputerScienceLoading(false);
    }
  }

  async function runComputerScienceManualPlanCheck({
    courseCodes,
    totalPlannedCredits,
  }: {
    courseCodes: string[];
    totalPlannedCredits: number | null;
  }) {
    if (isComputerScienceLoading) {
      return;
    }

    setIsComputerScienceLoading(true);
    setComputerScienceError(null);
    setCombinedDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setComputerScienceLoadingMessage(
      "Checking pasted plan against Computer Science degree rules...",
    );

    try {
      const response = await fetch(computerSciencePlanCheckEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCodes,
          planDescription: "Pasted Computer Science plan",
          major: "Computer Science",
          totalPlannedCredits,
        }),
      });
      const payload = (await response.json()) as
        | ComputerSciencePlanCheckResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The Computer Science pasted plan check could not run.",
        );
      }

      setComputerScienceResult(payload as ComputerSciencePlanCheckResult);
    } catch (fetchError) {
      setComputerScienceResult(null);
      setComputerScienceError(
        fetchError instanceof Error
          ? fetchError.message
          : "The Computer Science pasted plan check could not run.",
      );
    } finally {
      setIsComputerScienceLoading(false);
    }
  }

  async function runComputerScienceUploadPlanCheck(file: File) {
    if (isComputerScienceLoading) {
      return;
    }

    setIsComputerScienceLoading(true);
    setComputerScienceError(null);
    setCombinedDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setComputerScienceLoadingMessage(
      "Checking uploaded Degree Works PDF against Computer Science degree rules...",
    );

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(computerSciencePlanCheckUploadEndpoint, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | ComputerSciencePlanCheckResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The Computer Science PDF check could not run.",
        );
      }

      setComputerScienceResult(payload as ComputerSciencePlanCheckResult);
    } catch (fetchError) {
      setComputerScienceResult(null);
      setComputerScienceError(
        fetchError instanceof Error
          ? fetchError.message
          : "The Computer Science PDF check could not run.",
      );
    } finally {
      setIsComputerScienceLoading(false);
    }
  }

  function checkEnteredCourses(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (parsedCourseCodes.length === 0) {
      setResult(null);
      setError("Paste at least one planned course code before checking.");
      return;
    }

    void runPlanCheck({
      request: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCodes: parsedCourseCodes,
          planDescription: "Custom entered plan",
          major: "Software Engineering",
          totalPlannedCredits: null,
        }),
      },
      message: "Checking entered courses against Auburn certificate rules...",
    });
  }

  function checkSamplePlan(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    void runPlanCheck({
      message: "Checking the sample Degree Works plan...",
    });
  }

  function checkSoftwareEngineeringSamplePlan(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    void runSoftwareEngineeringPlanCheck();
  }

  function checkSoftwareEngineeringEnteredCourses(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    setSoftwareEngineeringManualValidationError(null);

    if (parsedSoftwareEngineeringCourseCodes.length === 0) {
      setSoftwareEngineeringResult(null);
      setSoftwareEngineeringManualValidationError(
        "Paste at least one Software Engineering course code before checking.",
      );
      return;
    }

    const totalCredits = enteredSoftwareEngineeringTotalCredits.trim();
    let totalPlannedCredits: number | null = null;

    if (totalCredits.length > 0) {
      const parsedTotalPlannedCredits = Number(totalCredits);

      if (
        !Number.isFinite(parsedTotalPlannedCredits) ||
        parsedTotalPlannedCredits < 0
      ) {
        setSoftwareEngineeringResult(null);
        setSoftwareEngineeringManualValidationError(
          "Enter total planned credits as a non-negative number, or leave it blank.",
        );
        return;
      }

      totalPlannedCredits = parsedTotalPlannedCredits;
    }

    void runSoftwareEngineeringManualPlanCheck({
      courseCodes: parsedSoftwareEngineeringCourseCodes,
      totalPlannedCredits,
    });
  }

  function checkComputerScienceSamplePlan(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    void runComputerSciencePlanCheck();
  }

  function checkComputerScienceEnteredCourses(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    setComputerScienceManualValidationError(null);

    if (parsedComputerScienceCourseCodes.length === 0) {
      setComputerScienceResult(null);
      setComputerScienceManualValidationError(
        "Paste at least one Computer Science course code before checking.",
      );
      return;
    }

    const totalCredits = enteredComputerScienceTotalCredits.trim();
    let totalPlannedCredits: number | null = null;

    if (totalCredits.length > 0) {
      const parsedTotalPlannedCredits = Number(totalCredits);

      if (
        !Number.isFinite(parsedTotalPlannedCredits) ||
        parsedTotalPlannedCredits < 0
      ) {
        setComputerScienceResult(null);
        setComputerScienceManualValidationError(
          "Enter total planned credits as a non-negative number, or leave it blank.",
        );
        return;
      }

      totalPlannedCredits = parsedTotalPlannedCredits;
    }

    void runComputerScienceManualPlanCheck({
      courseCodes: parsedComputerScienceCourseCodes,
      totalPlannedCredits,
    });
  }

  function handleCombinedDegreeWorksPdfFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;
    setSelectedCombinedDegreeWorksPdfFile(file);
    setCombinedDegreeWorksUploadValidationError(null);

    if (!file) {
      return;
    }

    if (!isPdfFile(file)) {
      setSelectedCombinedDegreeWorksPdfFile(null);
      setCombinedDegreeWorksUploadValidationError(
        "Choose a PDF file before running the combined Degree Works analysis.",
      );
      event.target.value = "";
    }
  }

  function handlePdfFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedPdfFile(file);
    setUploadValidationError(null);

    if (!file) {
      return;
    }

    if (!isPdfFile(file)) {
      setSelectedPdfFile(null);
      setUploadValidationError("Choose a PDF file before running the check.");
      event.target.value = "";
    }
  }

  function handleSoftwareEngineeringPdfFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;
    setSelectedSoftwareEngineeringPdfFile(file);
    setSoftwareEngineeringUploadValidationError(null);

    if (!file) {
      return;
    }

    if (!isPdfFile(file)) {
      setSelectedSoftwareEngineeringPdfFile(null);
      setSoftwareEngineeringUploadValidationError(
        "Choose a PDF file before running the Software Engineering check.",
      );
      event.target.value = "";
    }
  }

  function handleComputerSciencePdfFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;
    setSelectedComputerSciencePdfFile(file);
    setComputerScienceUploadValidationError(null);

    if (!file) {
      return;
    }

    if (!isPdfFile(file)) {
      setSelectedComputerSciencePdfFile(null);
      setComputerScienceUploadValidationError(
        "Choose a PDF file before running the Computer Science check.",
      );
      event.target.value = "";
    }
  }

  function checkUploadedPdf(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setUploadValidationError(null);

    if (!selectedPdfFile) {
      setResult(null);
      setUploadValidationError("Choose a Degree Works PDF before checking.");
      return;
    }

    if (!isPdfFile(selectedPdfFile)) {
      setResult(null);
      setUploadValidationError("Choose a PDF file before running the check.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedPdfFile);

    void runPlanCheck({
      endpoint: planCheckUploadEndpoint,
      request: {
        method: "POST",
        body: formData,
      },
      message: "Checking uploaded Degree Works PDF...",
    });
  }

  function checkCombinedDegreeWorksUploadedPdf(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    setCombinedDegreeWorksUploadValidationError(null);

    if (!selectedCombinedDegreeWorksPdfFile) {
      setCombinedDegreeWorksResult(null);
      setCombinedDegreeWorksUploadValidationError(
        "Choose a Degree Works PDF before running the combined analysis.",
      );
      return;
    }

    if (!isPdfFile(selectedCombinedDegreeWorksPdfFile)) {
      setCombinedDegreeWorksResult(null);
      setCombinedDegreeWorksUploadValidationError(
        "Choose a PDF file before running the combined Degree Works analysis.",
      );
      return;
    }

    void runCombinedDegreeWorksUploadPlanCheck(
      selectedCombinedDegreeWorksPdfFile,
    );
  }

  function checkSoftwareEngineeringUploadedPdf(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    setSoftwareEngineeringUploadValidationError(null);

    if (!selectedSoftwareEngineeringPdfFile) {
      setSoftwareEngineeringResult(null);
      setSoftwareEngineeringUploadValidationError(
        "Choose a Degree Works PDF before checking Software Engineering progress.",
      );
      return;
    }

    if (!isPdfFile(selectedSoftwareEngineeringPdfFile)) {
      setSoftwareEngineeringResult(null);
      setSoftwareEngineeringUploadValidationError(
        "Choose a PDF file before running the Software Engineering check.",
      );
      return;
    }

    void runSoftwareEngineeringUploadPlanCheck(
      selectedSoftwareEngineeringPdfFile,
    );
  }

  function checkComputerScienceUploadedPdf(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    setComputerScienceUploadValidationError(null);

    if (!selectedComputerSciencePdfFile) {
      setComputerScienceResult(null);
      setComputerScienceUploadValidationError(
        "Choose a Degree Works PDF before checking Computer Science progress.",
      );
      return;
    }

    if (!isPdfFile(selectedComputerSciencePdfFile)) {
      setComputerScienceResult(null);
      setComputerScienceUploadValidationError(
        "Choose a PDF file before running the Computer Science check.",
      );
      return;
    }

    void runComputerScienceUploadPlanCheck(selectedComputerSciencePdfFile);
  }

  function copyAdvisorMeetingSummary() {
    if (!advisorMeetingSummary) {
      return;
    }

    const selectVisibleSummary = () => {
      const textarea = document.getElementById(
        "advisor-meeting-summary-text",
      );

      if (textarea instanceof HTMLTextAreaElement) {
        textarea.focus();
        textarea.select();
      }
    };

    const copyWithFallback = () => {
      const textarea = document.createElement("textarea");
      textarea.value = advisorMeetingSummary;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();

      try {
        return document.execCommand("copy");
      } finally {
        document.body.removeChild(textarea);
      }
    };

    if (!navigator.clipboard?.writeText) {
      if (copyWithFallback()) {
        setAdvisorSummaryCopyStatus("Summary copied.");
      } else {
        selectVisibleSummary();
        setAdvisorSummaryCopyStatus(
          "Summary selected. Press Ctrl+C to copy it.",
        );
      }
      return;
    }

    void navigator.clipboard
      .writeText(advisorMeetingSummary)
      .then(() => setAdvisorSummaryCopyStatus("Summary copied."))
      .catch(() => {
        if (copyWithFallback()) {
          setAdvisorSummaryCopyStatus("Summary copied.");
        } else {
          selectVisibleSummary();
          setAdvisorSummaryCopyStatus(
            "Summary selected. Press Ctrl+C to copy it.",
          );
        }
      });
  }

  function isPdfFile(file: File) {
    return (
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );
  }

  return (
    <main className="min-h-dvh bg-slate-100 text-slate-950">
      <header className="bg-[#03244d] px-4 py-4 text-white shadow-sm sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-[#03244d]">
              <ClipboardCheck aria-hidden="true" size={21} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-semibold leading-6 sm:text-[20px]">
                AI Certificate Plan Check
              </h1>
              <p className="hidden text-[13px] text-white/75 sm:block">
                Deterministic Auburn requirement review
              </p>
            </div>
          </div>
          <Link
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-white/20 px-3 text-[13px] font-semibold text-white transition hover:bg-white/10"
            href="/chat"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Back to Chat
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 lg:pt-7">
        <div className="rounded-md border border-[#dd550c]/30 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <FileUp
                  aria-hidden="true"
                  className="text-[#dd550c]"
                  size={20}
                />
                <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
                  Combined PDF analysis
                </p>
              </div>
              <h2 className="mt-2 text-[24px] font-semibold leading-8 text-slate-950">
                Analyze Degree Works PDF
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-slate-600">
                Upload one Degree Works PDF to run both the AI Engineering
                certificate check, Software Engineering degree progress check,
                and Computer Science degree progress check from the same parsed
                courses and credit total.
              </p>
              <p className="mt-2 text-[13px] leading-5 text-slate-500">
                This is not an official degree audit. Advisor verification is
                required. AP, transfer, substitutions, hidden Degree Works
                sections, electives, prerequisites, and semester ordering may
                require advisor review.
              </p>
            </div>

            <div className="w-full rounded-md border border-slate-200 bg-slate-50 p-3 lg:w-[24rem]">
              <label
                className="text-[13px] font-semibold leading-5 text-slate-700"
                htmlFor="combined-degreeworks-pdf"
              >
                Degree Works PDF
              </label>
              <input
                accept="application/pdf"
                className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 file:mr-3 file:rounded-sm file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:border-[#dd550c] focus:outline-none focus:ring-4 focus:ring-[#dd550c]/15"
                disabled={isCombinedDegreeWorksLoading}
                id="combined-degreeworks-pdf"
                onChange={handleCombinedDegreeWorksPdfFileChange}
                type="file"
              />
              {selectedCombinedDegreeWorksPdfFile ? (
                <p className="mt-2 text-[12px] leading-5 text-slate-500">
                  Selected: {selectedCombinedDegreeWorksPdfFile.name}
                </p>
              ) : null}
              {combinedDegreeWorksUploadValidationError ? (
                <p className="mt-2 text-[13px] leading-5 text-orange-700">
                  {combinedDegreeWorksUploadValidationError}
                </p>
              ) : null}
              <button
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#dd550c] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#b84300] disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isCombinedDegreeWorksLoading}
                onClick={checkCombinedDegreeWorksUploadedPdf}
                type="button"
              >
                {isCombinedDegreeWorksLoading ? (
                  <Loader2
                    aria-hidden="true"
                    className="animate-spin"
                    size={17}
                  />
                ) : null}
                Analyze Degree Works PDF
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:py-7">
        <div className="grid gap-5">
          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-[22px] font-semibold leading-8 text-slate-950">
            AI Certificate Plan Check
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-slate-600">
            Checks entered courses against Auburn&apos;s AI Engineering
            certificate requirements using the local deterministic requirement
            rules.
          </p>

          <div className="mt-5">
            <label
              className="text-[13px] font-semibold leading-5 text-slate-700"
              htmlFor="planned-courses"
            >
              Paste planned courses
            </label>
            <textarea
              className="mt-2 min-h-56 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-[14px] leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
              disabled={isLoading}
              id="planned-courses"
              onChange={(event) => setEnteredCourses(event.target.value)}
              placeholder={samplePasteText}
              value={enteredCourses}
            />
            <p className="mt-2 text-[13px] leading-5 text-slate-500">
              Users can paste comma-separated courses, newline courses, or
              Degree Works-style text.
            </p>
            <p className="mt-1 text-[12px] leading-5 text-slate-500">
              Parsed courses:{" "}
              {parsedCourseCodes.length > 0
                ? parsedCourseCodes.join(", ")
                : "none yet"}
            </p>
          </div>

          <div className="mt-5 grid gap-2">
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#03244d] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#021b3a] disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isLoading}
              onClick={checkEnteredCourses}
              type="button"
            >
              {isLoading ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : null}
              Check entered courses
            </button>
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-[14px] font-semibold leading-5 text-slate-700 transition hover:border-[#dd550c] hover:text-[#03244d] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              disabled={isLoading}
              onClick={checkSamplePlan}
              type="button"
            >
              {isLoading ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : null}
              Check sample Degree Works plan
            </button>
          </div>

          <section className="mt-6 border-t border-slate-200 pt-5">
            <div className="flex items-center gap-2">
              <FileUp aria-hidden="true" className="text-[#dd550c]" size={18} />
              <h2 className="text-[16px] font-semibold leading-6 text-slate-950">
                Upload Degree Works PDF
              </h2>
            </div>
            <div className="mt-3">
              <label
                className="text-[13px] font-semibold leading-5 text-slate-700"
                htmlFor="degreeworks-pdf"
              >
                Degree Works PDF
              </label>
              <input
                accept="application/pdf"
                className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 file:mr-3 file:rounded-sm file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:border-[#dd550c] focus:outline-none focus:ring-4 focus:ring-[#dd550c]/15"
                disabled={isLoading}
                id="degreeworks-pdf"
                onChange={handlePdfFileChange}
                type="file"
              />
              {selectedPdfFile ? (
                <p className="mt-2 text-[12px] leading-5 text-slate-500">
                  Selected: {selectedPdfFile.name}
                </p>
              ) : null}
              {uploadValidationError ? (
                <p className="mt-2 text-[13px] leading-5 text-orange-700">
                  {uploadValidationError}
                </p>
              ) : null}
            </div>
            <button
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#dd550c] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#b84300] disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isLoading}
              onClick={checkUploadedPdf}
              type="button"
            >
              {isLoading ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : null}
              Check uploaded PDF
            </button>
          </section>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-[22px] font-semibold leading-8 text-slate-950">
              Software Engineering Degree Progress
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              Checks the sample Degree Works plan against local Software
              Engineering degree rules. This extracted plan does not prove
              completion of every Software Engineering requirement.
            </p>
            <p className="mt-2 text-[13px] leading-5 text-slate-500">
              AP, transfer, substitutions, Degree Works hidden sections, and
              advisor-approved electives may not be captured by the simple
              parser yet.
            </p>

            <div className="mt-5">
              <label
                className="text-[13px] font-semibold leading-5 text-slate-700"
                htmlFor="software-engineering-planned-courses"
              >
                Paste Software Engineering plan courses
              </label>
              <textarea
                className="mt-2 min-h-56 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-[14px] leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
                disabled={isSoftwareEngineeringLoading}
                id="software-engineering-planned-courses"
                onChange={(event) =>
                  setEnteredSoftwareEngineeringCourses(event.target.value)
                }
                placeholder={`COMP 1210\nCOMP 2210\nCOMP 2710\nPHIL 1020`}
                value={enteredSoftwareEngineeringCourses}
              />
              <p className="mt-2 text-[13px] leading-5 text-slate-500">
                Paste comma-separated courses, newline courses, or messy Degree
                Works-style text. This check is deterministic and still needs
                advisor review.
              </p>
              <p className="mt-1 text-[12px] leading-5 text-slate-500">
                Parsed courses:{" "}
                {parsedSoftwareEngineeringCourseCodes.length > 0
                  ? parsedSoftwareEngineeringCourseCodes.join(", ")
                  : "none yet"}
              </p>
            </div>

            <div className="mt-4">
              <label
                className="text-[13px] font-semibold leading-5 text-slate-700"
                htmlFor="software-engineering-total-planned-credits"
              >
                Total planned credits
              </label>
              <input
                className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[14px] leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
                disabled={isSoftwareEngineeringLoading}
                id="software-engineering-total-planned-credits"
                inputMode="decimal"
                min="0"
                onChange={(event) =>
                  setEnteredSoftwareEngineeringTotalCredits(event.target.value)
                }
                placeholder="Optional, e.g. 122"
                type="number"
                value={enteredSoftwareEngineeringTotalCredits}
              />
              <p className="mt-2 text-[13px] leading-5 text-slate-500">
                Leave blank when Degree Works, AP, transfer, substitution, or
                elective credits still need advisor confirmation.
              </p>
              {softwareEngineeringManualValidationError ? (
                <p className="mt-2 text-[13px] leading-5 text-orange-700">
                  {softwareEngineeringManualValidationError}
                </p>
              ) : null}
            </div>

            <button
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#03244d] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#021b3a] disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isSoftwareEngineeringLoading}
              onClick={checkSoftwareEngineeringEnteredCourses}
              type="button"
            >
              {isSoftwareEngineeringLoading ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : null}
              Check pasted Software Engineering plan
            </button>

            <button
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-[14px] font-semibold leading-5 text-slate-700 transition hover:border-[#dd550c] hover:text-[#03244d] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              disabled={isSoftwareEngineeringLoading}
              onClick={checkSoftwareEngineeringSamplePlan}
              type="button"
            >
              {isSoftwareEngineeringLoading ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : null}
              Check sample Degree Works plan
            </button>

            <section className="mt-6 border-t border-slate-200 pt-5">
              <div className="flex items-center gap-2">
                <FileUp
                  aria-hidden="true"
                  className="text-[#dd550c]"
                  size={18}
                />
                <h2 className="text-[16px] font-semibold leading-6 text-slate-950">
                  Upload Degree Works PDF
                </h2>
              </div>
              <div className="mt-3">
                <label
                  className="text-[13px] font-semibold leading-5 text-slate-700"
                  htmlFor="software-engineering-degreeworks-pdf"
                >
                  Software Engineering Degree Works PDF
                </label>
                <input
                  accept="application/pdf"
                  className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 file:mr-3 file:rounded-sm file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:border-[#dd550c] focus:outline-none focus:ring-4 focus:ring-[#dd550c]/15"
                  disabled={isSoftwareEngineeringLoading}
                  id="software-engineering-degreeworks-pdf"
                  onChange={handleSoftwareEngineeringPdfFileChange}
                  type="file"
                />
                {selectedSoftwareEngineeringPdfFile ? (
                  <p className="mt-2 text-[12px] leading-5 text-slate-500">
                    Selected: {selectedSoftwareEngineeringPdfFile.name}
                  </p>
                ) : null}
                {softwareEngineeringUploadValidationError ? (
                  <p className="mt-2 text-[13px] leading-5 text-orange-700">
                    {softwareEngineeringUploadValidationError}
                  </p>
                ) : null}
              </div>
              <button
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#dd550c] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#b84300] disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isSoftwareEngineeringLoading}
                onClick={checkSoftwareEngineeringUploadedPdf}
                type="button"
              >
                {isSoftwareEngineeringLoading ? (
                  <Loader2
                    aria-hidden="true"
                    className="animate-spin"
                    size={17}
                  />
                ) : null}
                Check uploaded PDF
              </button>
            </section>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-[22px] font-semibold leading-8 text-slate-950">
              Computer Science Degree Progress
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              Checks the sample Degree Works plan against local Computer
              Science degree rules. This extracted plan does not prove final
              degree completion.
            </p>
            <p className="mt-2 text-[13px] leading-5 text-slate-500">
              Advisor verification is required. AP, transfer, substitutions,
              hidden Degree Works sections, electives, prerequisites, and
              semester ordering may affect this result.
            </p>

            <div className="mt-5">
              <label
                className="text-[13px] font-semibold leading-5 text-slate-700"
                htmlFor="computer-science-planned-courses"
              >
                Paste Computer Science plan courses
              </label>
              <textarea
                className="mt-2 min-h-56 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-[14px] leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
                disabled={isComputerScienceLoading}
                id="computer-science-planned-courses"
                onChange={(event) =>
                  setEnteredComputerScienceCourses(event.target.value)
                }
                placeholder={`COMP 1210\nCOMP 2210\nCOMP 4200\nPHIL 1020`}
                value={enteredComputerScienceCourses}
              />
              <p className="mt-2 text-[13px] leading-5 text-slate-500">
                Paste comma-separated courses, newline courses, or messy Degree
                Works-style text. This check is deterministic and still needs
                advisor review.
              </p>
              <p className="mt-1 text-[12px] leading-5 text-slate-500">
                Parsed courses:{" "}
                {parsedComputerScienceCourseCodes.length > 0
                  ? parsedComputerScienceCourseCodes.join(", ")
                  : "none yet"}
              </p>
            </div>

            <div className="mt-4">
              <label
                className="text-[13px] font-semibold leading-5 text-slate-700"
                htmlFor="computer-science-total-planned-credits"
              >
                Total planned credits
              </label>
              <input
                className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[14px] leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
                disabled={isComputerScienceLoading}
                id="computer-science-total-planned-credits"
                inputMode="decimal"
                min="0"
                onChange={(event) =>
                  setEnteredComputerScienceTotalCredits(event.target.value)
                }
                placeholder="Optional, e.g. 122"
                type="number"
                value={enteredComputerScienceTotalCredits}
              />
              <p className="mt-2 text-[13px] leading-5 text-slate-500">
                Leave blank when Degree Works, AP, transfer, substitution, or
                elective credits still need advisor confirmation.
              </p>
              {computerScienceManualValidationError ? (
                <p className="mt-2 text-[13px] leading-5 text-orange-700">
                  {computerScienceManualValidationError}
                </p>
              ) : null}
            </div>

            <button
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#03244d] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#021b3a] disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isComputerScienceLoading}
              onClick={checkComputerScienceEnteredCourses}
              type="button"
            >
              {isComputerScienceLoading ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : null}
              Check pasted Computer Science plan
            </button>

            <button
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-[14px] font-semibold leading-5 text-slate-700 transition hover:border-[#dd550c] hover:text-[#03244d] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              disabled={isComputerScienceLoading}
              onClick={checkComputerScienceSamplePlan}
              type="button"
            >
              {isComputerScienceLoading ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : null}
              Check sample Degree Works plan
            </button>

            <section className="mt-6 border-t border-slate-200 pt-5">
              <div className="flex items-center gap-2">
                <FileUp
                  aria-hidden="true"
                  className="text-[#dd550c]"
                  size={18}
                />
                <h2 className="text-[16px] font-semibold leading-6 text-slate-950">
                  Upload Degree Works PDF
                </h2>
              </div>
              <div className="mt-3">
                <label
                  className="text-[13px] font-semibold leading-5 text-slate-700"
                  htmlFor="computer-science-degreeworks-pdf"
                >
                  Computer Science Degree Works PDF
                </label>
                <input
                  accept="application/pdf"
                  className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 file:mr-3 file:rounded-sm file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:border-[#dd550c] focus:outline-none focus:ring-4 focus:ring-[#dd550c]/15"
                  disabled={isComputerScienceLoading}
                  id="computer-science-degreeworks-pdf"
                  onChange={handleComputerSciencePdfFileChange}
                  type="file"
                />
                {selectedComputerSciencePdfFile ? (
                  <p className="mt-2 text-[12px] leading-5 text-slate-500">
                    Selected: {selectedComputerSciencePdfFile.name}
                  </p>
                ) : null}
                {computerScienceUploadValidationError ? (
                  <p className="mt-2 text-[13px] leading-5 text-orange-700">
                    {computerScienceUploadValidationError}
                  </p>
                ) : null}
              </div>
              <button
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#dd550c] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#b84300] disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isComputerScienceLoading}
                onClick={checkComputerScienceUploadedPdf}
                type="button"
              >
                {isComputerScienceLoading ? (
                  <Loader2
                    aria-hidden="true"
                    className="animate-spin"
                    size={17}
                  />
                ) : null}
                Check uploaded PDF
              </button>
            </section>
          </section>
        </div>

        <section className="min-w-0">
          {advisorMeetingSummary ? (
            <AdvisorMeetingSummary
              copyStatus={advisorSummaryCopyStatus}
              onCopySummary={copyAdvisorMeetingSummary}
              summary={advisorMeetingSummary}
            />
          ) : null}

          {combinedDegreeWorksError ? (
            <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-4">
              <div className="flex gap-3">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-orange-700"
                  size={18}
                />
                <p className="text-[14px] leading-6 text-orange-800">
                  {combinedDegreeWorksError}
                </p>
              </div>
            </div>
          ) : null}

          {isCombinedDegreeWorksLoading ? (
            <div className="mb-4 flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4 text-[14px] text-slate-600 shadow-sm">
              <Loader2
                aria-hidden="true"
                className="animate-spin text-[#dd550c]"
                size={19}
              />
              Analyzing Degree Works PDF against deterministic checks...
            </div>
          ) : null}

          {combinedDegreeWorksResult ? (
            <>
              <GapReportCard gapReport={combinedDegreeWorksResult.gapReport} />
              <NextSemesterSuggestionsCard
                suggestions={combinedDegreeWorksResult.nextSemesterSuggestions}
              />
              <CombinedDegreeWorksParsedDetails
                result={combinedDegreeWorksResult}
              />
            </>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-4">
              <div className="flex gap-3">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-orange-700"
                  size={18}
                />
                <p className="text-[14px] leading-6 text-orange-800">
                  {error}
                </p>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <div className="mb-4 flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4 text-[14px] text-slate-600 shadow-sm">
              <Loader2
                aria-hidden="true"
                className="animate-spin text-[#dd550c]"
                size={19}
              />
              {loadingMessage}
            </div>
          ) : null}

          {combinedDegreeWorksResult && result ? (
            <h2 className="mb-3 text-[18px] font-semibold leading-7 text-slate-950">
              AI Engineering certificate result
            </h2>
          ) : null}

          {result ? (
            <ResultCard
              result={result}
              showUploadedPdfDetails={!combinedDegreeWorksResult}
            />
          ) : (
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-[14px] leading-6 text-slate-500 shadow-sm">
              Upload one Degree Works PDF, paste planned courses, or run the
              sample Degree Works plan to see required courses satisfied,
              missing requirements, elective candidates, completion status,
              advisor verification, and notes.
            </div>
          )}

          <div className="mt-5">
            {softwareEngineeringError ? (
              <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-4">
                <div className="flex gap-3">
                  <AlertCircle
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-orange-700"
                    size={18}
                  />
                  <p className="text-[14px] leading-6 text-orange-800">
                    {softwareEngineeringError}
                  </p>
                </div>
              </div>
            ) : null}

            {isSoftwareEngineeringLoading ? (
              <div className="mb-4 flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4 text-[14px] text-slate-600 shadow-sm">
                <Loader2
                  aria-hidden="true"
                  className="animate-spin text-[#dd550c]"
                  size={19}
                />
                {softwareEngineeringLoadingMessage}
              </div>
            ) : null}

            {combinedDegreeWorksResult && softwareEngineeringResult ? (
              <h2 className="mb-3 text-[18px] font-semibold leading-7 text-slate-950">
                Software Engineering degree progress result
              </h2>
            ) : null}

            {softwareEngineeringResult ? (
              <DegreeProgressResultCard
                degreeName="Software Engineering"
                result={softwareEngineeringResult}
                showUploadedPdfDetails={!combinedDegreeWorksResult}
              />
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-[14px] leading-6 text-slate-500 shadow-sm">
                Run the Software Engineering sample check to review credit
                totals, exact required courses, alternative course groups,
                advisor-verified blocks, notes, and whether the extracted plan
                proves likely completion.
              </div>
            )}
          </div>

          <div className="mt-5">
            {computerScienceError ? (
              <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-4">
                <div className="flex gap-3">
                  <AlertCircle
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-orange-700"
                    size={18}
                  />
                  <p className="text-[14px] leading-6 text-orange-800">
                    {computerScienceError}
                  </p>
                </div>
              </div>
            ) : null}

            {isComputerScienceLoading ? (
              <div className="mb-4 flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4 text-[14px] text-slate-600 shadow-sm">
                <Loader2
                  aria-hidden="true"
                  className="animate-spin text-[#dd550c]"
                  size={19}
                />
                {computerScienceLoadingMessage}
              </div>
            ) : null}

            {combinedDegreeWorksResult && computerScienceResult ? (
              <h2 className="mb-3 text-[18px] font-semibold leading-7 text-slate-950">
                Computer Science degree progress result
              </h2>
            ) : null}

            {computerScienceResult ? (
              <DegreeProgressResultCard
                degreeName="Computer Science"
                result={computerScienceResult}
                showUploadedPdfDetails={!combinedDegreeWorksResult}
              />
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-[14px] leading-6 text-slate-500 shadow-sm">
                Run the Computer Science sample check to review credit totals,
                exact required courses, alternative course groups,
                advisor-verified blocks, notes, and whether the extracted plan
                proves likely completion.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
