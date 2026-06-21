import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import { CollapsibleDetails } from "@/components/ui-primitives";
import type {
  CurrentDegreeAuditCourseStatus,
  CurrentDegreeAuditCourseStatusRecord,
} from "@/lib/plan/current-degree-audit-analysis";
import type { ExternalCreditRecord } from "@/lib/plan/degreeworks-external-credit";
import {
  buildExternalCreditAwareBucketItems,
  findExternalCreditRecordForCode,
} from "@/lib/plan/external-credit-display";
import type { CurrentDegreeWorksUploadResult } from "../types";
import { ResultSection } from "./result-cards";

export function CurrentProgressResultDetails({
  advisorSummarySlot,
  result,
}: {
  advisorSummarySlot?: ReactNode;
  result: CurrentDegreeWorksUploadResult;
}) {
  const analysis = result.currentProgressAnalysis;
  const nextSteps = result.currentStateNextSteps;
  const gapReport = result.currentStateGapReport;
  const attentionIncompleteBlocks = gapReport.incompleteBlocks.slice(0, 3);
  const attentionStillNeededItems = analysis.stillNeededItems.slice(0, 5);
  const attentionVerificationItems = nextSteps.verificationItems.slice(0, 4);
  const hasExternalCreditWarning =
    analysis.externalCreditRecords.length > 0 ||
    analysis.nonDegreeApplicableCourseCodes.length > 0;
  const visibleSuggestions = nextSteps.suggestedCourses.slice(0, 6);

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
              Current Progress
            </p>
            <h2 className="mt-2 text-[22px] font-semibold leading-8 text-slate-950">
              Current Progress Summary
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-600">
              Status-aware current standing from a Degree Works Worksheet audit.
              This is not an official degree audit; advisor verification is
              required.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:w-[30rem]">
            <Metric label="Detected program" value={analysis.detectedProgram.displayName} />
            <Metric label="Degree status" value={analysis.degreeStatus ?? "unknown"} />
            <Metric label="Credits applied" value={analysis.creditsApplied ?? "Unknown"} />
            <Metric label="Credits needed" value={analysis.creditsNeeded ?? "Unknown"} />
            <Metric label="Audit confidence" value={analysis.confidence} />
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <ResultSection title="Current Progress Summary">
            <ul className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              {gapReport.summaryBullets.map((bullet) => (
                <li className="flex gap-2 text-[13px] leading-5 text-slate-700" key={bullet}>
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-[#2f7d32]" size={15} />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </ResultSection>

          <ResultSection title="What needs attention">
            <div className="grid gap-3">
              {attentionIncompleteBlocks.length > 0 ? (
                <AttentionGroup title="Top incomplete blocks">
                  {attentionIncompleteBlocks.map((block) => (
                    <li className="text-[13px] leading-5 text-slate-700" key={block.name}>
                      <span className="font-semibold text-slate-950">{block.name}</span>
                      {block.stillNeededText[0] ? `: ${block.stillNeededText[0]}` : ""}
                    </li>
                  ))}
                </AttentionGroup>
              ) : null}

              {attentionStillNeededItems.length > 0 ? (
                <AttentionGroup title="Top still-needed requirements">
                  {attentionStillNeededItems.map((item) => (
                    <li className="text-[13px] leading-5 text-slate-700" key={`${item.blockName}-${item.requirementLabel}-${item.neededText}`}>
                      <span className="font-semibold text-slate-950">{item.requirementLabel}</span>
                      <span className="text-slate-500"> ({formatRequirementType(item.requirementType)})</span>: {item.neededText}
                    </li>
                  ))}
                </AttentionGroup>
              ) : null}

              {attentionVerificationItems.length > 0 ? (
                <AttentionGroup title="Preregistered or current courses to verify">
                  {attentionVerificationItems.map((item) => (
                    <li className="text-[13px] leading-5 text-slate-700" key={`${item.code}-${item.status}`}>
                      {item.reason}
                    </li>
                  ))}
                </AttentionGroup>
              ) : null}

              {hasExternalCreditWarning ? (
                <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-[13px] leading-5 text-amber-900">
                  <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={15} />
                  <span>
                    AP/transfer or Fall Through evidence was detected. Confirm applicability in Degree Works and with an advisor before relying on it.
                  </span>
                </div>
              ) : null}

              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] leading-5 text-slate-500">
                Showing the highest-priority items here. View all details in the collapsed evidence section below.
              </p>
            </div>
          </ResultSection>

          <ResultSection title="What to discuss taking next">
            <div className="grid gap-3">
              {visibleSuggestions.length > 0 ? (
                <div className="grid gap-2">
                  {visibleSuggestions.map((course) => (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={`${course.code}-${course.source}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950">{course.code}</span>
                        <span className="rounded-sm border border-[#dd550c]/25 bg-[#fff7f1] px-2 py-1 text-[12px] font-semibold uppercase text-[#9b3900]">
                          {course.priority}
                        </span>
                        <span className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-[12px] font-semibold text-slate-600">
                          {formatSuggestionSource(course.source)}
                        </span>
                      </div>
                      <p className="mt-2 text-[13px] leading-5 text-slate-700">{course.reason}</p>
                      <p className="mt-2 text-[12px] leading-5 text-slate-500">
                        Advisor caveat: verify term availability, prerequisites, substitutions, and fit for the official audit before registering.
                      </p>
                      {course.availabilityNotes?.length ? (
                        <p className="mt-2 text-[12px] leading-5 text-slate-500">{course.availabilityNotes[0]}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
                  No new course suggestions were produced. Review verification
                  items and advisor questions.
                </p>
              )}

              {nextSteps.advisorMilestones.length > 0 ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[14px] font-semibold text-slate-800">
                    Advisor milestones
                  </p>
                  <ul className="mt-3 space-y-2">
                    {nextSteps.advisorMilestones.map((item) => (
                      <li className="flex gap-2 text-[13px] leading-5 text-slate-700" key={`${item.label}-${item.reason}`}>
                        <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-[#b84300]" size={15} />
                        <span>{item.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {nextSteps.notYetRecommended.length > 0 ? (
                <CollapsibleDetails
                  description="Courses held out because they appear completed, preregistered, in progress, or blocked by modeled prerequisites."
                  title="Not suggested as new courses"
                >
                  <ul className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
                    {nextSteps.notYetRecommended.map((item) => (
                      <li className="text-[13px] leading-5 text-slate-700" key={`${item.code}-${item.reason}`}>
                        <span className="font-semibold text-slate-950">{item.code}</span>: {item.reason}
                      </li>
                    ))}
                  </ul>
                </CollapsibleDetails>
              ) : null}
            </div>
          </ResultSection>
        </div>
      </section>

      {advisorSummarySlot}

      <CollapsibleDetails
        description="Status counts, raw records, AP/transfer evidence, parser diagnostics, local coverage metadata, and full still-needed evidence."
        title="Details and evidence"
      >
        <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <div className="grid gap-4">
            <ResultSection title="Detailed course evidence">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <CourseCodeBucket
                  codes={analysis.completedCourseCodes}
                  externalCreditRecords={analysis.externalCreditRecords}
                  title="Completed"
                />
                <CourseCodeBucket
                  codes={analysis.preregisteredCourseCodes}
                  externalCreditRecords={analysis.externalCreditRecords}
                  title="Preregistered"
                />
                <CourseCodeBucket
                  codes={analysis.inProgressCourseCodes}
                  externalCreditRecords={analysis.externalCreditRecords}
                  title="In progress"
                />
                <ExternalCreditBucket records={analysis.externalCreditRecords} />
                <CourseCodeBucket
                  codes={analysis.nonDegreeApplicableCourseCodes}
                  externalCreditRecords={analysis.externalCreditRecords}
                  linkedCourseVerb="associated with"
                  title="Fall Through/non-degree"
                />
                <CourseCodeBucket
                  codes={analysis.stillNeededCourseCodes}
                  externalCreditRecords={analysis.externalCreditRecords}
                  title="Still needed"
                />
              </div>
            </ResultSection>

            <ResultSection title="Incomplete blocks">
              {gapReport.incompleteBlocks.length > 0 ? (
                <div className="grid gap-2">
                  {gapReport.incompleteBlocks.map((block) => (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={block.name}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950">{block.name}</span>
                        <span className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-[12px] font-semibold uppercase text-slate-600">
                          {block.status}
                        </span>
                      </div>
                      {block.stillNeededText.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {block.stillNeededText.map((item) => (
                            <li className="text-[13px] leading-5 text-slate-700" key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
                  No incomplete worksheet blocks were parsed.
                </p>
              )}
            </ResultSection>

            <ResultSection title="Structured still-needed items">
              {analysis.stillNeededItems.length > 0 ? (
                <div className="grid gap-2">
                  {analysis.stillNeededItems.map((item) => (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={`${item.blockName}-${item.requirementLabel}-${item.neededText}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950">{item.requirementLabel}</span>
                        <span className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-[12px] font-semibold uppercase text-slate-600">
                          {formatRequirementType(item.requirementType)}
                        </span>
                        <span className="text-[12px] text-slate-500">{item.confidence} confidence</span>
                        {typeof item.creditAmount === "number" ? (
                          <span className="text-[12px] text-slate-500">{item.creditAmount} credit/class amount</span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-[13px] leading-5 text-slate-700">{item.neededText}</p>
                      {item.courseOptions.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.courseOptions.map((code) => (
                            <span className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-[12px] font-semibold text-slate-700" key={code}>{code}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
                  No structured Still needed items were parsed.
                </p>
              )}
            </ResultSection>

            <ResultSection title="Parsed worksheet course statuses">
              <ParsedCurrentCourseStatuses
                externalCreditRecords={analysis.externalCreditRecords}
                records={analysis.courseStatusRecords}
              />
            </ResultSection>

            <ResultSection title="External credit evidence">
              <ExternalCreditEvidence records={analysis.externalCreditRecords} />
            </ResultSection>

            <ResultSection title="Parser diagnostics and notes">
              <ul className="space-y-2 rounded-md border border-[#dd550c]/25 bg-[#fff7f1] p-3">
                {[...analysis.parserWarnings, ...result.notes].map((note) => (
                  <li className="flex gap-2 text-[13px] leading-5 text-slate-700" key={note}>
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-[#b84300]" size={15} />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </ResultSection>

            <ResultSection title="Local rule evidence">
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-600">
                Current local deterministic models are available for selected programs, but the Planning Hub uses Degree Works-native analysis for all readable Auburn audits. Rule coverage details remain in Rule Audit and are not primary student-facing planning modes.
              </p>
            </ResultSection>
          </div>
        </section>
      </CollapsibleDetails>
    </div>
  );
}

function AttentionGroup({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-[14px] font-semibold text-slate-800">{title}</p>
      <ul className="mt-2 space-y-2">{children}</ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-[16px] font-semibold leading-6 text-slate-950">{value}</p>
    </div>
  );
}

function CourseCodeBucket({
  title,
  codes,
  externalCreditRecords,
  linkedCourseVerb = "satisfies",
}: {
  title: string;
  codes: string[];
  externalCreditRecords: ExternalCreditRecord[];
  linkedCourseVerb?: "associated with" | "satisfies";
}) {
  const items = buildExternalCreditAwareBucketItems({
    codes,
    externalCreditRecords,
    linkedCourseVerb,
  });

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</p>
      <p className="mt-1 text-[18px] font-semibold leading-6 text-slate-950">{items.length}</p>
      {items.length > 0 ? (
        <div className="mt-2 grid gap-1.5">
          {items.slice(0, 8).map((item) => (
            item.sourceRecord ? (
              <div className="rounded-sm border border-slate-200 bg-white px-2 py-1.5" key={item.key}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <SourceTypeBadge record={item.sourceRecord} />
                  <span className="text-[12px] font-semibold leading-5 text-slate-800">{item.primaryLabel}</span>
                </div>
                {item.secondaryText ? (
                  <p className="mt-0.5 text-[12px] leading-5 text-slate-500">{item.secondaryText}</p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5" key={item.key}>
                <span className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-[12px] font-semibold text-slate-700">{item.primaryLabel}</span>
              </div>
            )
          ))}
          {items.length > 8 ? <span className="text-[12px] text-slate-500">+{items.length - 8} more</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function ExternalCreditBucket({ records }: { records: ExternalCreditRecord[] }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">AP/transfer satisfied</p>
      <p className="mt-1 text-[18px] font-semibold leading-6 text-slate-950">{records.length}</p>
      {records.length > 0 ? (
        <div className="mt-2 grid gap-1.5">
          {records.slice(0, 5).map((record) => (
            <div className="rounded-sm border border-slate-200 bg-white px-2 py-1.5" key={`${record.sourceCode}-${record.satisfiesCourseCode ?? record.displayName}`}>
              <div className="flex flex-wrap items-center gap-1.5">
                <SourceTypeBadge record={record} />
                <span className="text-[12px] font-semibold leading-5 text-slate-800">{record.displayName}</span>
              </div>
              {record.satisfiesCourseCode ? (
                <p className="mt-0.5 text-[12px] leading-5 text-slate-500">
                  satisfies {record.satisfiesCourseCode}
                </p>
              ) : null}
            </div>
          ))}
          {records.length > 5 ? <span className="text-[12px] text-slate-500">+{records.length - 5} more</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function ExternalCreditEvidence({ records }: { records: ExternalCreditRecord[] }) {
  if (records.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
        No AP or transfer credit records were parsed from Satisfied by evidence.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {records.map((record) => (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3" key={`${record.sourceCode}-${record.satisfiesCourseCode ?? record.displayName}`}>
          <div className="flex flex-wrap items-center gap-2">
            <SourceTypeBadge record={record} />
            <span className="font-semibold text-slate-950">{record.displayName}</span>
            <span className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-[12px] font-semibold text-slate-600">
              {record.confidence} confidence
            </span>
          </div>
          <div className="mt-2 grid gap-1 text-[12px] leading-5 text-slate-600">
            {record.satisfiesCourseCode ? (
              <p>
                Auburn equivalent: <span className="font-semibold text-slate-800">{record.satisfiesCourseCode}</span>
                {record.satisfiesCourseTitle ? ` ${record.satisfiesCourseTitle}` : ""}
              </p>
            ) : (
              <p>Auburn equivalent was not confidently linked.</p>
            )}
            {record.institution ? <p>Institution: {record.institution}</p> : null}
            <CollapsibleDetails
              description="Raw Degree Works source code and Satisfied by evidence."
              title="Raw source details"
            >
              <div className="rounded-md border border-slate-200 bg-white p-3 text-[12px] leading-5 text-slate-600">
                <p><span className="font-semibold text-slate-800">Source code:</span> {record.sourceCode}</p>
                <p className="mt-1 break-words"><span className="font-semibold text-slate-800">Evidence:</span> {record.rawEvidence}</p>
              </div>
            </CollapsibleDetails>
          </div>
        </div>
      ))}
    </div>
  );
}

function SourceTypeBadge({ record }: { record: ExternalCreditRecord }) {
  const label =
    record.sourceType === "advanced_placement"
      ? "AP"
      : record.sourceType === "transfer"
        ? "Transfer"
        : "Other";
  const styles =
    record.sourceType === "advanced_placement"
      ? "border-violet-200 bg-violet-50 text-violet-800"
      : record.sourceType === "transfer"
        ? "border-sky-200 bg-sky-50 text-sky-800"
        : "border-slate-200 bg-white text-slate-600";

  return (
    <span className={`rounded-sm border px-2 py-1 text-[11px] font-semibold uppercase ${styles}`}>
      {label}
    </span>
  );
}

function ParsedCurrentCourseStatuses({
  records,
  externalCreditRecords,
}: {
  records: CurrentDegreeAuditCourseStatusRecord[];
  externalCreditRecords: ExternalCreditRecord[];
}) {
  if (records.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
        No worksheet course statuses were parsed.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {records.map((record) => (
        <ParsedCurrentCourseStatusCard
          externalCreditRecords={externalCreditRecords}
          key={`${record.code}-${record.status}`}
          record={record}
        />
      ))}
    </div>
  );
}

function ParsedCurrentCourseStatusCard({
  record,
  externalCreditRecords,
}: {
  record: CurrentDegreeAuditCourseStatusRecord;
  externalCreditRecords: ExternalCreditRecord[];
}) {
  const externalCredit = findExternalCreditRecordForCode(
    externalCreditRecords,
    record.code,
  );

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {externalCredit ? (
          <SourceTypeBadge record={externalCredit} />
        ) : null}
        <span className="font-semibold text-slate-950">
          {externalCredit?.displayName ?? record.code}
        </span>
        <CurrentStatusPill status={record.status} />
        <span className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-[12px] font-semibold text-slate-600">
          {record.confidence} confidence
        </span>
        {record.termLabel ? <span className="text-[12px] text-slate-500">{record.termLabel}</span> : null}
        {record.credits ? <span className="text-[12px] text-slate-500">{record.credits} credits</span> : null}
      </div>
      {externalCredit?.satisfiesCourseCode ? (
        <p className="mt-2 text-[12px] leading-5 text-slate-500">
          associated with {externalCredit.satisfiesCourseCode}
        </p>
      ) : null}
      {record.rawEvidence ? (
        <p className="mt-2 max-h-10 overflow-hidden text-[12px] leading-5 text-slate-500">{record.rawEvidence}</p>
      ) : null}
    </div>
  );
}

function CurrentStatusPill({ status }: { status: CurrentDegreeAuditCourseStatus }) {
  const styles: Record<CurrentDegreeAuditCourseStatus, string> = {
    completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
    preregistered: "border-sky-200 bg-sky-50 text-sky-800",
    in_progress: "border-blue-200 bg-blue-50 text-blue-800",
    transfer_or_ap: "border-violet-200 bg-violet-50 text-violet-800",
    non_degree_applicable: "border-amber-200 bg-amber-50 text-amber-800",
    still_needed: "border-rose-200 bg-rose-50 text-rose-800",
    unknown: "border-slate-200 bg-white text-slate-600",
  };

  return (
    <span className={`rounded-sm border px-2 py-1 text-[12px] font-semibold uppercase ${styles[status]}`}>
      {formatCurrentStatus(status)}
    </span>
  );
}

function formatCurrentStatus(status: CurrentDegreeAuditCourseStatus) {
  switch (status) {
    case "completed":
      return "completed";
    case "preregistered":
      return "preregistered";
    case "in_progress":
      return "in progress";
    case "transfer_or_ap":
      return "AP/transfer";
    case "non_degree_applicable":
      return "Fall Through";
    case "still_needed":
      return "still needed";
    case "unknown":
      return "unknown";
  }
}

function formatSuggestionSource(source: string) {
  switch (source) {
    case "still_needed":
      return "Still needed";
    case "still_needed_options":
      return "Still needed options";
    case "incomplete_block":
      return "Incomplete block";
    case "deterministic_gap":
      return "Local rule gap";
    default:
      return source;
  }
}

function formatRequirementType(type: string) {
  switch (type) {
    case "specific_course":
      return "Exact course";
    case "course_options":
      return "Options";
    case "credit_hours_from_list":
      return "Credit-hour list";
    case "block_reference":
      return "Block reference";
    case "graduation_milestone":
      return "Milestone";
    case "advisor_review":
      return "Advisor review";
    default:
      return type.replaceAll("_", " ");
  }
}
