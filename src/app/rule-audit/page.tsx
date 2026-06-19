import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import {
  buildRuleCoverageAudit,
  type RuleCoverageProgram,
  type RuleCoverageStatus,
  type RuleCoverageSupportingModel,
} from "@/lib/rules/rule-coverage-audit";

export const metadata: Metadata = {
  title: "Rule Coverage Audit | Auburn Academic Planner",
  description:
    "A deterministic transparency audit of the Auburn Academic Planner's local program rules and limitations.",
};

const statusDetails: Record<
  RuleCoverageStatus,
  { label: string; className: string }
> = {
  source_backed: {
    label: "Source-backed",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  local_model: {
    label: "Local model",
    className: "border-sky-200 bg-sky-50 text-sky-800",
  },
  advisor_review_required: {
    label: "Advisor review required",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
};

export default function RuleAuditPage() {
  const audit = buildRuleCoverageAudit();
  const totalExactRules = audit.programs.reduce(
    (sum, program) => sum + program.totalExactRules,
    0,
  );
  const advisorReviewBlocks = audit.programs.reduce(
    (sum, program) =>
      sum + program.coverageSummary.advisorReviewBlockCount,
    0,
  );

  return (
    <main className="min-h-dvh bg-slate-100 text-slate-950">
      <header className="bg-[#03244d] px-4 py-4 text-white shadow-sm sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-[#03244d]">
              <ShieldCheck aria-hidden="true" size={21} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-semibold leading-6 sm:text-[20px]">
                Rule Coverage and Trust Audit
              </h1>
              <p className="hidden text-[13px] text-white/75 sm:block">
                Deterministic model transparency
              </p>
            </div>
          </div>
          <nav className="flex shrink-0 items-center gap-2" aria-label="Audit navigation">
            <Link
              className="hidden h-10 items-center gap-2 rounded-md border border-white/20 px-3 text-[13px] font-semibold text-white transition hover:bg-white/10 sm:inline-flex"
              href="/chat"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Chat
            </Link>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-md border border-white/20 px-3 text-[13px] font-semibold text-white transition hover:bg-white/10"
              href="/plan-check"
            >
              Plan Check
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-6 sm:px-7 sm:py-8">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                See exactly where the planner can—and cannot—be trusted.
              </h2>
              <p className="mt-3 text-[15px] leading-7 text-slate-600">
                This page audits the local deterministic rule model. It
                separates exact source-backed requirements from conservative
                local models and blocks that still need human verification.
              </p>
            </div>
            <div className="mt-6 grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-3">
              <SummaryMetric
                label="Programs audited"
                value={String(audit.programs.length)}
                detail={`Catalog ${audit.catalogYear}`}
              />
              <SummaryMetric
                label="Exact course rules"
                value={String(totalExactRules)}
                detail="Counted separately from review-only blocks"
              />
              <SummaryMetric
                label="Advisor-review blocks"
                value={String(advisorReviewBlocks)}
                detail="Not treated as fully verified"
              />
            </div>
          </div>
          <div className="grid gap-3 bg-[#fff7f1] px-5 py-4 text-[13px] leading-5 text-[#8a3600] sm:grid-cols-3 sm:px-7">
            <p className="flex gap-2">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
              Exact-course coverage measures checked-in deterministic rules.
            </p>
            <p className="flex gap-2">
              <TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
              Advisor-review-only blocks are not treated as fully verified.
            </p>
            <p className="flex gap-2">
              <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
              This is a transparency tool, not an official Auburn audit.
            </p>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="program-coverage-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="program-coverage-heading" className="text-xl font-semibold text-slate-950">
                Program coverage
              </h2>
              <p className="mt-1 text-[14px] leading-6 text-slate-600">
                Counts are per program and may overlap where supporting rules are shared.
              </p>
            </div>
            <p className="text-[12px] text-slate-500">
              Generated {formatTimestamp(audit.generatedAt)}
            </p>
          </div>
          <div className="space-y-5">
            {audit.programs.map((program) => (
              <ProgramCoverageCard key={program.programKey} program={program} />
            ))}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="supporting-models-heading">
          <div className="mb-4">
            <h2 id="supporting-models-heading" className="text-xl font-semibold text-slate-950">
              Supporting models
            </h2>
            <p className="mt-1 text-[14px] leading-6 text-slate-600">
              These constraints support planning, but do not establish official eligibility or live availability.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {audit.supportingModels.map((model) => (
              <SupportingModelCard key={model.modelKey} model={model} />
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <AuditList
            icon={<TriangleAlert aria-hidden="true" size={19} />}
            title="Global limitations"
            items={audit.globalLimitations}
            tone="warning"
          />
          <AuditList
            icon={<Wrench aria-hidden="true" size={19} />}
            title="Recommended next improvements"
            items={audit.recommendedNextImprovements}
            tone="default"
          />
        </section>
      </div>
    </main>
  );
}

function SummaryMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-white px-4 py-4 sm:px-5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-[#03244d]">{value}</p>
      <p className="mt-1 text-[12px] leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function ProgramCoverageCard({ program }: { program: RuleCoverageProgram }) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-5 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#eef4fa] text-[#03244d]">
              <BookOpenCheck aria-hidden="true" size={18} />
            </div>
            <div>
              <h3 className="text-[18px] font-semibold leading-6 text-slate-950">
                {program.programName}
              </h3>
              <p className="mt-1 text-[12px] text-slate-500">{program.sourceId}</p>
              {program.sourceUrl ? (
                <a
                  className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#b84300] hover:underline"
                  href={program.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  View rule source
                  <ExternalLink aria-hidden="true" size={13} />
                </a>
              ) : null}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
          <CompactMetric label="Exact rules" value={program.totalExactRules} />
          <CompactMetric label="Source-backed" value={program.sourceBackedRules} />
          <CompactMetric label="Local model" value={program.localModelRules} />
          <CompactMetric label="Advisor review" value={program.advisorReviewRules} />
        </div>
      </div>

      <div className="grid gap-6 px-5 py-5 sm:px-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-[14px] font-semibold text-slate-950">Requirement blocks</h4>
            <p className="text-[12px] font-semibold text-emerald-700">
              {program.coverageSummary.deterministicExactCourseCoverage}% exact-course coverage
            </p>
          </div>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full min-w-[650px] border-collapse text-left text-[13px]">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.06em] text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-semibold">Block</th>
                  <th className="px-3 py-3 font-semibold">Trust status</th>
                  <th className="px-3 py-3 font-semibold">Modeled / required</th>
                  <th className="px-3 py-3 font-semibold">Audit note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {program.requirementBlocks.map((block) => (
                  <tr key={block.name} className="align-top">
                    <td className="px-3 py-3 font-medium text-slate-900">{block.name}</td>
                    <td className="px-3 py-3"><StatusLabel status={block.status} /></td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      {block.modeledCredits ?? "—"} / {block.requiredCredits ?? "—"} credits
                    </td>
                    <td className="max-w-md px-3 py-3 leading-5 text-slate-600">
                      {block.notes[0] ?? "No additional local note."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h4 className="text-[14px] font-semibold text-slate-950">Known limitations</h4>
          <ul className="mt-3 space-y-3 text-[13px] leading-5 text-slate-600">
            {program.limitations.map((limitation) => (
              <li className="flex gap-2" key={limitation}>
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {limitation}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function CompactMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-xl font-semibold text-[#03244d]">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium leading-4 text-slate-500">{label}</p>
    </div>
  );
}

function StatusLabel({ status }: { status: RuleCoverageStatus }) {
  const detail = statusDetails[status];
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${detail.className}`}>
      {detail.label}
    </span>
  );
}

function SupportingModelCard({ model }: { model: RuleCoverageSupportingModel }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-semibold leading-6 text-slate-950">{model.modelName}</h3>
          <p className="mt-1 text-[12px] text-slate-500">{model.sourceId}</p>
        </div>
        <StatusLabel status={model.status} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <CompactMetric label="Total rules" value={model.totalRules} />
        <CompactMetric label="Local model" value={model.ruleCounts.localModel} />
        <CompactMetric label="Advisor review" value={model.ruleCounts.advisorReviewRequired} />
      </div>
      <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
        Applies to
      </p>
      <p className="mt-1 text-[13px] leading-5 text-slate-700">
        {model.appliesTo.map(formatProgramKey).join(", ")}
      </p>
      <ul className="mt-4 space-y-2 text-[13px] leading-5 text-slate-600">
        {model.limitations.map((limitation) => (
          <li className="flex gap-2" key={limitation}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
            {limitation}
          </li>
        ))}
      </ul>
    </article>
  );
}

function AuditList({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tone: "warning" | "default";
}) {
  return (
    <section className={`rounded-lg border p-5 shadow-sm sm:p-6 ${tone === "warning" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <h2 className={`flex items-center gap-2 text-[17px] font-semibold ${tone === "warning" ? "text-amber-950" : "text-slate-950"}`}>
        {icon}
        {title}
      </h2>
      <ol className="mt-4 space-y-3 text-[13px] leading-5 text-slate-700">
        {items.map((item, index) => (
          <li className="flex gap-3" key={item}>
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current/20 text-[11px] font-semibold">
              {index + 1}
            </span>
            <span className="pt-0.5">{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function formatProgramKey(programKey: RuleCoverageProgram["programKey"]) {
  if (programKey === "ai_certificate") return "AI Engineering certificate";
  if (programKey === "software_engineering") return "Software Engineering";
  return "Computer Science";
}

function formatTimestamp(timestamp: string) {
  return timestamp.replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}
