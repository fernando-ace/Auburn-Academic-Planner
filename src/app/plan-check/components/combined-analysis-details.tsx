import { AlertCircle, CheckCircle2 } from "lucide-react";

import { CollapsibleDetails } from "@/components/ui-primitives";
import type {
  DegreeWorksCourseStatus,
  DegreeWorksCourseStatusCounts,
  DegreeWorksCourseStatusRecord,
} from "@/lib/plan/degreeworks-course-status";
import type { CombinedDegreeWorksUploadResult } from "../types";
import { ParserNotes, ResultSection } from "./result-cards";

export function PlannedPathOverviewCard({
  result,
}: {
  result: CombinedDegreeWorksUploadResult;
}) {
  return (
    <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
            Planned Path
          </p>
          <h2 className="mt-2 text-[22px] font-semibold leading-8 text-slate-950">
            Planned path overview
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-600">
            Degree Works plan review for a future path. This is not an official
            degree audit; advisor verification is required.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[32rem]">
          <CoverageMetric label="Mode" value="Degree Works-native" />
          <CoverageMetric label="Planned credits" value={result.totalPlannedCredits ?? "Not provided"} />
          <CoverageMetric label="Parser confidence" value={result.parserConfidence} />
          <CoverageMetric label="Coverage status" value={formatCoverageStatus(result)} />
        </div>
      </div>
    </section>
  );
}

export function CombinedDegreeWorksParsedDetails({
  result,
}: {
  result: CombinedDegreeWorksUploadResult;
}) {
  return (
    <CollapsibleDetails
      description="Parsed courses, course statuses, parser confidence, warnings, detected terms, and advisor-safe notes."
      title="Detailed evidence"
    >
      <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
              Degree Works PDF
            </p>
            <h2 className="mt-2 text-[20px] font-semibold leading-7 text-slate-950">
              Parsed details
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-600">
              This evidence comes from the uploaded PDF text. Advisor
              verification is required.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:w-[34rem]">
            <CoverageMetric label="Source file" value={result.sourceFileName} />
            <CoverageMetric label="Parsed courses" value={result.parsedCourseCount} />
            <CoverageMetric label="Planned credits" value={result.totalPlannedCredits ?? "Not provided"} />
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <ResultSection title="Detailed course evidence">
            <ParsedCourseCodes
              courseCodes={result.parsedCourseCodes}
              parsedCourseCount={result.parsedCourseCount}
            />
          </ResultSection>

          <ResultSection title="Parsed Degree Works text evidence">
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

          <ResultSection title="Detected plan terms">
            {result.semesterPlanAnalysis.terms.length > 0 ? (
              <div className="grid gap-2">
                {result.semesterPlanAnalysis.terms.map((term) => (
                  <details
                    className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[13px] leading-5 text-slate-700"
                    key={`${term.index}-${term.label}`}
                  >
                    <summary className="cursor-pointer font-semibold text-slate-800">
                      {term.label}: {term.courseCodes.length} courses
                    </summary>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {term.courseCodes.map((courseCode) => (
                        <span
                          className="rounded-sm border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700"
                          key={`${term.label}-${courseCode}`}
                        >
                          {courseCode}
                        </span>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
                No reliable term structure was detected from this PDF.
              </p>
            )}
          </ResultSection>

          <ResultSection title="Parser diagnostics">
            <ParserNotes
              detectedSignals={result.detectedSignals}
              parserConfidence={result.parserConfidence}
              parserWarnings={result.parserWarnings}
            />
          </ResultSection>

          <ResultSection title="Advisor-safe notes">
            <ul className="space-y-2 rounded-md border border-[#dd550c]/25 bg-[#fff7f1] p-3">
              {[
                "This is not an official degree audit.",
                "Advisor verification is required.",
                "AP, transfer, substitutions, hidden Degree Works sections, electives, and semester ordering may require advisor review.",
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
    </CollapsibleDetails>
  );
}

export function PlannedPathCoverageCard({
  result,
}: {
  result: CombinedDegreeWorksUploadResult;
}) {
  const coverage = result.plannedPathCoverage;

  if (!coverage) return null;

  return (
    <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
            Plan coverage
          </p>
          <h2 className="mt-2 text-[20px] font-semibold leading-7 text-slate-950">
            Plan coverage
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-600">
            Matches planned courses against Degree Works Still needed items
            from Current Progress.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-4 lg:w-[36rem]">
          <CoverageMetric label="Covered" value={coverage.coveredStillNeededItems.length} />
          <CoverageMetric label="Partial" value={coverage.partiallyCoveredStillNeededItems.length} />
          <CoverageMetric label="Uncovered" value={coverage.uncoveredStillNeededItems.length} />
          <CoverageMetric label="Advisor review" value={coverage.advisorReviewItems.length} />
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-600">
          Covered, partial, uncovered, and advisor-review counts are summarized
          here. Expand the coverage evidence to inspect exact Degree Works
          matches and unmatched planned courses.
        </p>

        <CollapsibleDetails
          description="Exact coverage matches, partial matches, uncovered items, unmatched planned courses, and coverage notes."
          title="Detailed coverage evidence"
        >
          <div className="grid gap-4">
            <CoverageList
              emptyText="No exact Still needed items were fully covered by planned-path courses."
              items={coverage.coveredStillNeededItems}
              title="Covered Still needed items"
            />
            <CoverageList
              emptyText="No partially covered Still needed items were found."
              items={coverage.partiallyCoveredStillNeededItems}
              title="Partially covered Still needed items"
            />
            <CoverageList
              emptyText="No uncovered exact or option Still needed items were found."
              items={coverage.uncoveredStillNeededItems}
              title="Uncovered Still needed items"
            />

            {coverage.plannedButUnmatchedCourses.length > 0 ? (
              <ResultSection title="Planned but unmatched courses">
                <div className="flex flex-wrap gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                  {coverage.plannedButUnmatchedCourses.slice(0, 20).map((code) => (
                    <span className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-[12px] font-semibold text-slate-700" key={code}>
                      {code}
                    </span>
                  ))}
                </div>
              </ResultSection>
            ) : null}

            {coverage.advisorReviewItems.length > 0 || coverage.notes.length > 0 ? (
              <ResultSection title="Coverage notes">
                <ul className="space-y-2 rounded-md border border-[#dd550c]/25 bg-[#fff7f1] p-3">
                  {[...coverage.advisorReviewItems, ...coverage.notes].map((note) => (
                    <li className="flex gap-2 text-[13px] leading-5 text-slate-700" key={note}>
                      <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-[#b84300]" size={15} />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </ResultSection>
            ) : null}
          </div>
        </CollapsibleDetails>
      </div>
    </section>
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
      {status.replaceAll("_", " ")}
    </span>
  );
}

function CoverageMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-[18px] font-semibold leading-6 text-slate-950">
        {value}
      </p>
    </div>
  );
}

function CoverageList({
  emptyText,
  items,
  title,
}: {
  emptyText: string;
  items: NonNullable<CombinedDegreeWorksUploadResult["plannedPathCoverage"]>["coveredStillNeededItems"];
  title: string;
}) {
  return (
    <ResultSection title={title}>
      {items.length > 0 ? (
        <div className="grid gap-2">
          {items.map((item) => (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={`${item.blockName}-${item.requirementLabel}-${item.reason}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-950">{item.requirementLabel}</span>
                {item.matchedCourses.map((code) => (
                  <span className="rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-1 text-[12px] font-semibold text-emerald-800" key={code}>
                    {code}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[13px] leading-5 text-slate-700">{item.reason}</p>
              <p className="mt-1 text-[12px] leading-5 text-slate-500">{item.neededText}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
          {emptyText}
        </p>
      )}
    </ResultSection>
  );
}

function formatCoverageStatus(result: CombinedDegreeWorksUploadResult) {
  const coverage = result.plannedPathCoverage;

  if (!coverage) return "No current-progress comparison";
  if (coverage.uncoveredStillNeededItems.length > 0) return "Uncovered items need review";
  if (coverage.partiallyCoveredStillNeededItems.length > 0) return "Partially covered items need review";
  return "No uncovered exact items";
}

function isMostlyUnknownCourseStatuses(counts: DegreeWorksCourseStatusCounts) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return total >= 10 && counts.unknown / total >= 0.5;
}
