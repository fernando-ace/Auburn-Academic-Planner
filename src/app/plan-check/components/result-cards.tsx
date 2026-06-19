import { AlertCircle, CheckCircle2 } from "lucide-react";

import type { DegreeWorksDetectedSignals, DegreeWorksParserConfidence } from "@/lib/plan/degreeworks-analysis";
import type { RuleConfidence, RuleProvenance } from "@/lib/rules/rule-provenance";
import type { AdvisorVerifiedRequirement, ComputerSciencePlanCheckResult, PlanCheckCourse, PlanCheckResult, RequirementBlockResult, RequirementBlockStatus, SoftwareEngineeringPlanCheckResult } from "../types";
import { ParsedCourseCodes } from "./combined-analysis-details";

export function BooleanPill({ value }: { value: boolean }) {
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

export function ParserNotes({
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

function ProvenanceConfidencePill({
  confidence,
}: {
  confidence: RuleConfidence;
}) {
  const labels: Record<RuleConfidence, string> = {
    source_backed: "Source-backed",
    local_model: "Local conservative model",
    advisor_review_required: "Advisor review required",
  };
  const styles: Record<RuleConfidence, string> = {
    source_backed: "border-emerald-200 bg-emerald-50 text-emerald-800",
    local_model: "border-amber-200 bg-amber-50 text-amber-800",
    advisor_review_required:
      "border-[#dd550c]/25 bg-[#fff7f1] text-[#9b3900]",
  };

  return (
    <span
      className={`rounded-sm border px-2 py-1 text-[12px] font-semibold ${styles[confidence]}`}
    >
      {labels[confidence]}
    </span>
  );
}

export function ProvenanceDetails({
  provenance,
}: {
  provenance?: RuleProvenance;
}) {
  if (!provenance) {
    return null;
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-slate-700">
          Catalog {provenance.catalogYear}
        </span>
        <ProvenanceConfidencePill confidence={provenance.confidence} />
      </div>
      <p className="mt-2 text-[13px] font-semibold text-slate-900">
        {provenance.sourceTitle}
      </p>
      <details className="mt-2 text-[12px] leading-5 text-slate-600">
        <summary className="cursor-pointer font-semibold text-[#9b3900]">
          View source details
        </summary>
        <div className="mt-2 space-y-1">
          <p>Source ID: {provenance.sourceId}</p>
          <p>Evidence: {provenance.evidenceLabel}</p>
          {provenance.sourceFile ? <p>Local source: {provenance.sourceFile}</p> : null}
          {provenance.sourceUrl ? (
            <a
              className="inline-flex font-semibold text-[#9b3900] underline"
              href={provenance.sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open Auburn source
            </a>
          ) : null}
          {provenance.notes.map((note) => <p key={note}>{note}</p>)}
        </div>
      </details>
    </div>
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
              <ProvenanceConfidencePill
                confidence={block.provenance.confidence}
              />
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
            <ProvenanceDetails provenance={block.provenance} />
          </div>
        </details>
      ))}
    </div>
  );
}

export function ResultSection({
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

export function ResultCard({
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
          <div className="mt-3 max-w-xl">
            <ProvenanceDetails provenance={result.provenance} />
          </div>
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

export function DegreeProgressResultCard({
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
          <div className="mt-3 max-w-xl">
            <ProvenanceDetails provenance={result.provenance} />
          </div>
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
