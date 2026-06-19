import { AlertCircle, CheckCircle2 } from "lucide-react";

import type { DegreeWorksParserConfidence } from "@/lib/plan/degreeworks-analysis";
import type { DraftSemesterPlan } from "@/lib/plan/draft-semester-plan";
import type { GapReport, GapReportBestFitPath, GapReportStatus } from "@/lib/plan/gap-report";
import type { PlanningTargetPathInput } from "@/lib/plan/target-path";
import type { NextSemesterSuggestedCourse, NextSemesterSuggestions } from "../types";
import { ProvenanceDetails, ResultSection } from "./result-cards";

export function GapReportCard({
  gapReport,
  selectedTargetPath,
}: {
  gapReport: GapReport;
  selectedTargetPath?: PlanningTargetPathInput;
}) {
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
              Target path
            </p>
            <p className="mt-2 text-[14px] font-semibold leading-5 text-slate-800">
              {formatSelectedPlanningTarget(selectedTargetPath, gapReport.bestFitPath)}
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
        {gapReport.trustNotes ? (
          <ResultSection title="Trust notes">
            <div className="grid gap-3 lg:grid-cols-3">
              {([
                ["Source-backed checks", gapReport.trustNotes.sourceBacked],
                ["Local model checks", gapReport.trustNotes.localModel],
                [
                  "Advisor-review checks",
                  gapReport.trustNotes.advisorReviewRequired,
                ],
              ] as const).map(([title, items]) => (
                <div
                  className="rounded-md border border-slate-200 bg-slate-50 p-3"
                  key={title}
                >
                  <p className="text-[13px] font-semibold text-slate-900">{title}</p>
                  <ul className="mt-2 space-y-1 text-[12px] leading-5 text-slate-600">
                    {items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </ResultSection>
        ) : null}
        <GapReportList items={gapReport.nextActions} title="Next actions" />
        <GapReportList
          items={gapReport.advisorQuestions}
          title="Advisor questions"
        />
      </div>
    </section>
  );
}

export function NextSemesterSuggestionsCard({
  suggestions,
  selectedTargetPath,
}: {
  suggestions: NextSemesterSuggestions;
  selectedTargetPath?: PlanningTargetPathInput;
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
            <p className="font-semibold text-amber-800">
              Availability and prerequisite checks use a local conservative model. Verify with Auburn bulletin/advisor.
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[30rem]">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Target path
            </p>
            <p className="mt-2 text-[14px] font-semibold leading-5 text-slate-800">
              {formatSelectedPlanningTarget(selectedTargetPath, suggestions.targetPath)}
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
                      {typeof course.creditHours === "number" ? (
                        <p className="mt-1 text-[12px] font-semibold text-slate-500">
                          {course.creditHours} credits
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
                  {course.availabilityNotes?.[0] ? (
                    <p className="mt-2 text-[12px] leading-5 text-amber-800">
                      {course.availabilityNotes[0]}
                    </p>
                  ) : null}
                  {course.provenance?.map((provenance) => (
                    <div className="mt-2" key={`${course.code}-${provenance.sourceId}`}>
                      <ProvenanceDetails provenance={provenance} />
                    </div>
                  ))}
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

        <ResultSection title="Advisor milestones">
          {(suggestions.advisorMilestones?.length ?? 0) > 0 ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {suggestions.advisorMilestones?.map((milestone) => (
                <li
                  className="rounded-md border border-amber-200 bg-amber-50 p-3"
                  key={milestone.code}
                >
                  <p className="text-[14px] font-semibold text-amber-950">
                    {milestone.code}{milestone.title ? ` — ${milestone.title}` : ""}
                  </p>
                  <p className="mt-2 text-[13px] leading-5 text-amber-900">
                    {milestone.reason}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
              No zero-credit milestones were identified for this result.
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

export function DraftSemesterPlanCard({
  plan,
  selectedTargetPath,
}: {
  plan: DraftSemesterPlan;
  selectedTargetPath?: PlanningTargetPathInput;
}) {
  return (
    <section className="mb-5 rounded-md border border-[#dd550c]/30 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
            Multi-semester planning aid
          </p>
          <h2 className="mt-2 text-[22px] font-semibold leading-8 text-slate-950">
            Draft Semester Plan
          </h2>
          <div className="mt-2 max-w-3xl space-y-1 text-[14px] leading-6 text-slate-600">
            <p>This is a draft planning aid, not an official academic plan.</p>
            <p>
              Confirm course availability, prerequisites, substitutions,
              AP/transfer credit, and semester load with an advisor.
            </p>
            <p className="font-semibold text-amber-800">
              Availability and prerequisites are local conservative models; verify with Auburn bulletin/advisor.
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[30rem]">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Target path
            </p>
            <p className="mt-2 text-[14px] font-semibold leading-5 text-slate-800">
              {formatSelectedPlanningTarget(selectedTargetPath, plan.targetPath)}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Confidence
            </p>
            <span
              className={`mt-2 inline-flex rounded-sm border px-2.5 py-1 text-[13px] font-semibold ${getSuggestionConfidenceClassName(
                plan.confidence,
              )}`}
            >
              {plan.confidence}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <ResultSection title="Semester cards">
          {plan.semesters.length > 0 ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {plan.semesters.map((semester) => (
                <article
                  className="rounded-md border border-slate-200 bg-slate-50 p-4"
                  key={semester.label}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[16px] font-semibold leading-6 text-slate-950">
                      {semester.label}
                    </h3>
                    <span className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-[12px] font-semibold text-slate-600">
                      {semester.estimatedCredits} estimated credits
                    </span>
                  </div>
                  <ul className="mt-3 space-y-3">
                    {semester.plannedCourses.map((course) => (
                      <li
                        className="rounded-md border border-slate-200 bg-white p-3"
                        key={course.code}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[14px] font-semibold text-slate-950">
                            {course.code}
                            {course.title ? ` — ${course.title}` : ""}
                          </p>
                          {typeof course.creditHours === "number" ? (
                            <span className="text-[12px] font-semibold text-slate-500">
                              {course.creditHours} credits
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-[13px] leading-5 text-slate-700">
                          {course.reason}
                        </p>
                        {course.advisorVerificationRequired ? (
                          <p className="mt-2 text-[12px] font-medium text-[#9b3900]">
                            Advisor verification required
                          </p>
                        ) : null}
                        {course.availabilityNotes[0] ? (
                          <p className="mt-2 text-[12px] leading-5 text-amber-800">
                            {course.availabilityNotes[0]}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {semester.notes.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-[12px] leading-5 text-slate-600">
                      {semester.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
              No courses could be safely placed from the available
              deterministic data.
            </p>
          )}
        </ResultSection>

        <ResultSection title="Unplaced courses">
          {plan.unplacedCourses.length > 0 ? (
            <ul className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              {plan.unplacedCourses.map((course) => (
                <li className="text-[13px] leading-5 text-slate-700" key={course.code}>
                  <span className="font-semibold text-slate-950">{course.code}:</span>{" "}
                  {course.reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
              No exact modeled course was left unplaced.
            </p>
          )}
        </ResultSection>
        <GapReportList items={plan.advisorReviewItems} title="Advisor review items" />
        <GapReportList items={plan.notes} title="Draft plan notes" />
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

function formatSelectedPlanningTarget(
  selectedTargetPath: PlanningTargetPathInput | undefined,
  resolvedTargetPath: GapReportBestFitPath,
) {
  return selectedTargetPath === "auto"
    ? `Auto (inferred: ${formatGapBestFitPath(resolvedTargetPath)})`
    : formatGapBestFitPath(selectedTargetPath ?? resolvedTargetPath);
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
