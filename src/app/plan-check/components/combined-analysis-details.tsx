import { AlertCircle, CheckCircle2 } from "lucide-react";

import type { DegreeWorksCourseStatus, DegreeWorksCourseStatusCounts, DegreeWorksCourseStatusRecord } from "@/lib/plan/degreeworks-course-status";
import type { CombinedDegreeWorksUploadResult, DegreeWorksSemesterAnalysis, SoftwareEngineeringPrerequisiteCheck } from "../types";
import { BooleanPill, ParserNotes, ProvenanceDetails, ResultSection } from "./result-cards";

export function ParsedCourseCodes({
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

export function CourseStatusSummary({
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

export function ParsedCourseStatuses({
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

export function SemesterPrerequisiteCheck({
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
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
        <p className="text-[13px] font-semibold text-amber-900">
          Local conservative model
        </p>
        <p className="mt-1 text-[12px] leading-5 text-amber-800">
          Verify with Auburn bulletin/advisor before relying on prerequisite eligibility.
        </p>
        <div className="mt-2">
          <ProvenanceDetails provenance={prerequisiteCheck.provenance} />
        </div>
      </div>
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

export function CombinedDegreeWorksParsedDetails({
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
