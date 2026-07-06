import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  PencilLine,
} from "lucide-react";
import type {
  ChangeEventHandler,
  MouseEventHandler,
  TextareaHTMLAttributes,
} from "react";
import type { GeneratedPathPreferences } from "@/lib/plan/generated-planned-path";

export type PlanCheckStep =
  | "current_progress"
  | "planned_path"
  | "advisor_summary";
export type PlanCheckWorkflowMode = Exclude<PlanCheckStep, "advisor_summary">;
export type PlannedPathInputMode = "pdf" | "manual";

const primaryButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#b84300] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white shadow-sm transition hover:bg-[#8f3200] disabled:cursor-not-allowed disabled:bg-slate-300";
const secondaryButtonClass =
  "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-[13px] font-semibold leading-5 text-slate-700 transition hover:border-[#dd550c] hover:text-[#03244d] disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400";

export function DegreeWorksWorkflowUploadSection({
  activeStep,
  advisorSummaryAvailable = false,
  analyzedFileSummary,
  generatedPathPreferences,
  hasCurrentProgressResult = false,
  hasPlannedPathResult = false,
  isLoading,
  onAnalyze,
  onClearAnalysis,
  onFileChange,
  onGeneratedPathPreferencesChange,
  onManualPlannedCoursesChange,
  onPlannedPathInputModeChange,
  onRegenerateGeneratedPath,
  onStepChange,
  plannedPathInputMode,
  manualPlannedCoursesText,
  selectedFile,
  validationError,
}: {
  activeStep: PlanCheckStep;
  advisorSummaryAvailable?: boolean;
  analyzedFileSummary?: {
    workflowType: string;
    fileName: string;
    detectedProgram?: string | null;
    creditsSummary?: string | null;
  };
  generatedPathPreferences: GeneratedPathPreferences;
  isLoading: boolean;
  hasCurrentProgressResult?: boolean;
  hasPlannedPathResult?: boolean;
  onAnalyze: MouseEventHandler<HTMLButtonElement>;
  onClearAnalysis?: MouseEventHandler<HTMLButtonElement>;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onGeneratedPathPreferencesChange: (preferences: GeneratedPathPreferences) => void;
  onManualPlannedCoursesChange: TextareaHTMLAttributes<HTMLTextAreaElement>["onChange"];
  onPlannedPathInputModeChange: (mode: PlannedPathInputMode) => void;
  onRegenerateGeneratedPath?: MouseEventHandler<HTMLButtonElement>;
  onStepChange: (step: PlanCheckStep) => void;
  plannedPathInputMode: PlannedPathInputMode;
  manualPlannedCoursesText: string;
  selectedFile: File | null;
  validationError: string | null;
}) {
  const currentProgressExportSteps = [
    "Open Auburn Degree Works.",
    "Stay on `Worksheets`.",
    "Use the print icon in the top-right toolbar.",
    "Save or download the generated PDF.",
    "Upload that saved PDF to Current Progress.",
  ];
  const plannedPathExportSteps = [
    "Open Auburn Degree Works.",
    "Go to `Plans`.",
    "Open the plan you want to check.",
    "Use the plan print, export, or download option if it is available.",
    "Save the plan as a PDF, then upload it here.",
    "If PDF export is confusing, choose `Paste courses` instead.",
  ];
  const isCurrentProgress = activeStep === "current_progress";
  const isPlannedPath = activeStep === "planned_path";
  const isAdvisorSummary = activeStep === "advisor_summary";
  const isManualPlannedPath = isPlannedPath && plannedPathInputMode === "manual";
  const hasAnyResult = hasCurrentProgressResult || hasPlannedPathResult;
  const exportSteps = isCurrentProgress
    ? currentProgressExportSteps
    : plannedPathExportSteps;
  const heading = isCurrentProgress
    ? "Step 1: Current Progress"
    : isPlannedPath
      ? "Step 2: Planned Path"
      : "Step 3: Advisor Summary";
  const description = isCurrentProgress
    ? "Upload your Degree Works Worksheet audit first. The planner will generate a draft path from your Current Progress evidence."
    : isPlannedPath
      ? hasCurrentProgressResult
        ? "Optional: upload a plan PDF or paste planned courses to compare your own path against Current Progress evidence."
        : "Optional: upload a plan PDF or paste planned courses to validate a future path. Current Progress generates the more useful draft path."
      : "Use the copyable summary below to prepare for an advisor conversation. It is not an official degree audit.";

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:pt-5">
      <div className="overflow-hidden rounded-xl border border-[#dd550c]/30 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="h-1 bg-[#dd550c]" />
        <div className={`grid gap-5 p-4 sm:p-5 ${hasAnyResult ? "lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-5" : "lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-8 lg:p-6"}`}>
          <div className="max-w-3xl lg:py-1">
            <div className="flex items-center gap-2">
              <FileUp aria-hidden="true" className="text-[#dd550c]" size={20} />
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">Degree Works workflows</p>
            </div>
            <h2 className="mt-2 text-[24px] font-semibold leading-8 text-slate-950">
              {heading}
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              {description}
            </p>

            <ol className="mt-4 grid gap-2 text-[13px] leading-5 text-slate-600 sm:grid-cols-3">
              <PlanStepButton
                active={isCurrentProgress}
                complete={hasCurrentProgressResult}
                disabled={isLoading}
                label="1"
                onClick={() => onStepChange("current_progress")}
                step="current_progress"
                text="Current Progress"
              />
              <PlanStepButton
                active={isPlannedPath}
                complete={hasPlannedPathResult}
                disabled={isLoading}
                label="2"
                onClick={() => onStepChange("planned_path")}
                step="planned_path"
                text="Compare Own Plan"
              />
              <PlanStepButton
                active={isAdvisorSummary}
                complete={advisorSummaryAvailable}
                disabled={isLoading || !advisorSummaryAvailable}
                label="3"
                locked={!advisorSummaryAvailable}
                onClick={() => onStepChange("advisor_summary")}
                step="advisor_summary"
                text="Advisor Summary"
              />
            </ol>

            {hasAnyResult && analyzedFileSummary ? (
              <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] leading-5 text-slate-700 sm:grid-cols-2">
                <CompactFact label="Workflow" value={analyzedFileSummary.workflowType} />
                <CompactFact label="File" value={analyzedFileSummary.fileName} />
                <CompactFact label="Detected program" value={analyzedFileSummary.detectedProgram ?? "Unknown"} />
                <CompactFact label="Credits" value={analyzedFileSummary.creditsSummary ?? "Not available"} />
              </div>
            ) : (
              <p className="mt-2 text-[13px] leading-5 text-slate-500">
                {isCurrentProgress
                  ? "Current Progress preserves completed, preregistered, AP/transfer, Fall Through, still-needed, and unknown statuses instead of flattening everything into planned courses."
                  : isPlannedPath
                    ? "Optional plan comparison parses future courses and checks them against Current Progress still-needed evidence."
                    : "Advisor Summary reflects the generated path, plus optional plan comparison when provided."}
              </p>
            )}

            {!isAdvisorSummary ? (
              <details className="mt-4 rounded-lg border border-[#dd550c]/25 bg-[#fff7f1] p-3 text-[13px] leading-5 text-slate-700" open={isCurrentProgress || (isPlannedPath && plannedPathInputMode === "pdf" && !hasPlannedPathResult)}>
                <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-950">
                  <FileText aria-hidden="true" className="shrink-0 text-[#dd550c]" size={17} />
                  <span>
                    {isCurrentProgress
                      ? "How to export Current Progress"
                      : "How to get Planned Path input"}
                  </span>
                </summary>
                <ol className="mt-3 list-decimal space-y-1.5 pl-5">
                  {exportSteps.map((step) => (
                    <li key={step}>
                      <FormattedInstruction text={step} />
                    </li>
                  ))}
                </ol>
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] leading-5 text-amber-900">
                  {isCurrentProgress
                    ? "Upload the saved Worksheet PDF, not a screenshot."
                    : "Planned Path can use either a saved plan PDF or pasted planned-course text."}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-slate-600">
                  This is not an official degree audit or a replacement for academic advisors; verify decisions in Degree Works and with your advisor.
                </p>
              </details>
            ) : null}
            <p className="mt-3 text-[12px] leading-5 text-slate-600">
              Privacy: PDFs and pasted planned courses are processed for this check and are not permanently stored.
            </p>
          </div>

          <div className="w-full rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-[13px] font-semibold leading-5 text-slate-700">
              {isAdvisorSummary
                ? "Advisor Summary"
                : isCurrentProgress
                  ? "Current Progress PDF"
                  : "Planned Path input"}
            </p>
            <p className="mt-2 text-[12px] leading-5 text-slate-500">
              {isAdvisorSummary
                ? "The final preparation notes appear below after a Planned Path check."
                : "Degree Works-native analysis is used for all readable Auburn audits."}
            </p>

            {isAdvisorSummary ? (
              <div className="mt-4 grid gap-3">
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-[13px] leading-5 text-emerald-900">
                  <div className="flex gap-2">
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
                    <p>
                      Advisor Summary is ready below. Copy it into your advising notes, then verify everything in Degree Works and with your advisor.
                    </p>
                  </div>
                </div>
                <button
                  className={secondaryButtonClass}
                  disabled={isLoading}
                  onClick={() => onStepChange("planned_path")}
                  type="button"
                >
                  <ArrowLeft aria-hidden="true" size={16} />
                  Back to Planned Path
                </button>
                {onClearAnalysis ? (
                  <button
                    className={secondaryButtonClass}
                    onClick={onClearAnalysis}
                    type="button"
                  >
                    Start another check
                  </button>
                ) : null}
              </div>
            ) : isCurrentProgress && hasCurrentProgressResult ? (
              <div className="mt-4 grid gap-3">
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-[13px] leading-5 text-emerald-900">
                  <div className="flex gap-2">
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
                    <p>
                      Current Progress is checked. Review the generated path below, or update the settings here.
                    </p>
                  </div>
                </div>
                <GeneratedPathPreferencesControls
                  disabled={isLoading}
                  onChange={onGeneratedPathPreferencesChange}
                  preferences={generatedPathPreferences}
                />
                <button
                  className={primaryButtonClass}
                  disabled={isLoading || !onRegenerateGeneratedPath}
                  onClick={onRegenerateGeneratedPath}
                  type="button"
                >
                  Update generated path
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
                <button
                  className={secondaryButtonClass}
                  disabled={isLoading}
                  onClick={() => onStepChange("planned_path")}
                  type="button"
                >
                  Compare my own plan
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
                {onClearAnalysis ? (
                  <button
                    className={secondaryButtonClass}
                    onClick={onClearAnalysis}
                    type="button"
                  >
                    Start another check
                  </button>
                ) : null}
              </div>
            ) : isPlannedPath && hasPlannedPathResult ? (
              <div className="mt-4 grid gap-3">
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-[13px] leading-5 text-emerald-900">
                  <div className="flex gap-2">
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
                    <p>
                      Your own plan is checked. Continue to Advisor Summary for the copyable meeting notes.
                    </p>
                  </div>
                </div>
                <button
                  className={primaryButtonClass}
                  disabled={isLoading}
                  onClick={() => onStepChange("advisor_summary")}
                  type="button"
                >
                  Continue to Advisor Summary
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
                <button
                  className={secondaryButtonClass}
                  disabled={isLoading}
                  onClick={() => onStepChange("current_progress")}
                  type="button"
                >
                  <ArrowLeft aria-hidden="true" size={16} />
                  Back to Current Progress
                </button>
                {onClearAnalysis ? (
                  <button
                    className={secondaryButtonClass}
                    onClick={onClearAnalysis}
                    type="button"
                  >
                    Start another check
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                {isPlannedPath ? (
                  <div className="mt-4 grid grid-cols-2 rounded-md border border-slate-200 bg-white p-1" role="group" aria-label="Planned Path input type">
                    <button
                      aria-pressed={plannedPathInputMode === "pdf"}
                      className={`min-h-9 rounded-sm px-3 text-[13px] font-semibold transition ${
                        plannedPathInputMode === "pdf"
                          ? "bg-[#03244d] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                      disabled={isLoading}
                      onClick={() => onPlannedPathInputModeChange("pdf")}
                      type="button"
                    >
                      Upload PDF
                    </button>
                    <button
                      aria-pressed={plannedPathInputMode === "manual"}
                      className={`min-h-9 rounded-sm px-3 text-[13px] font-semibold transition ${
                        plannedPathInputMode === "manual"
                          ? "bg-[#03244d] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                      disabled={isLoading}
                      onClick={() => onPlannedPathInputModeChange("manual")}
                      type="button"
                    >
                      Paste courses
                    </button>
                  </div>
                ) : null}

                {isManualPlannedPath ? (
                  <>
                    <label className="mt-4 flex items-center gap-2 text-[13px] font-semibold leading-5 text-slate-700" htmlFor="manual-planned-courses">
                      <PencilLine aria-hidden="true" size={16} />
                      Planned courses
                    </label>
                    <textarea
                      className="mt-2 min-h-40 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
                      disabled={isLoading}
                      id="manual-planned-courses"
                      onChange={onManualPlannedCoursesChange}
                      placeholder={"Fall 2026: BIOL 1020, CHEM 1030\nSpring 2027: MATH 1610, CSES 2040"}
                      value={manualPlannedCoursesText}
                    />
                    <p className="mt-2 text-[12px] leading-5 text-slate-500">
                      Paste course prefixes and numbers from a draft plan. This text is processed for this request and is not permanently stored.
                    </p>
                  </>
                ) : (
                  <>
                    <label className="mt-4 block text-[13px] font-semibold leading-5 text-slate-700" htmlFor="combined-degreeworks-pdf">
                      {isCurrentProgress ? "Worksheet PDF" : "Degree Works Plan PDF"}
                    </label>
                    <input
                      key={`${activeStep}-${plannedPathInputMode}`}
                      accept="application/pdf"
                      className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 file:mr-3 file:rounded-sm file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:border-[#dd550c] focus:outline-none focus:ring-4 focus:ring-[#dd550c]/15"
                      disabled={isLoading}
                      id="combined-degreeworks-pdf"
                      onChange={onFileChange}
                      type="file"
                    />
                    <p className="mt-2 text-[12px] leading-5 text-slate-500">
                      Upload the saved PDF, not a screenshot. {isCurrentProgress ? "Current Progress expects a Worksheet PDF." : "Planned Path expects a Degree Works Plan PDF."}
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-slate-500">
                      The PDF is processed server-side for this check and is not permanently stored.
                    </p>
                    {selectedFile ? <p className="mt-2 text-[12px] font-medium leading-5 text-emerald-700">Selected: PDF ready</p> : null}
                    {isCurrentProgress ? (
                      <GeneratedPathPreferencesControls
                        disabled={isLoading}
                        onChange={onGeneratedPathPreferencesChange}
                        preferences={generatedPathPreferences}
                      />
                    ) : null}
                  </>
                )}

                {validationError ? <p className="mt-2 text-[13px] font-medium leading-5 text-orange-700" role="alert">{validationError}</p> : null}

                <button className={`mt-3 ${primaryButtonClass}`} disabled={isLoading} onClick={onAnalyze} type="button">
                  {isLoading ? <Loader2 aria-hidden="true" className="animate-spin" size={17} /> : null}
                  {isCurrentProgress
                    ? "Check Current Progress"
                    : hasCurrentProgressResult
                      ? "Compare my own plan"
                      : "Check Planned Path"}
                </button>
                {isCurrentProgress ? (
                  <button
                    className={`mt-2 ${secondaryButtonClass}`}
                    disabled={isLoading}
                    onClick={() => onStepChange("planned_path")}
                    type="button"
                  >
                    I only have my own plan
                    <ArrowRight aria-hidden="true" size={16} />
                  </button>
                ) : (
                  <button
                    className={`mt-2 ${secondaryButtonClass}`}
                    disabled={isLoading}
                    onClick={() => onStepChange("current_progress")}
                    type="button"
                  >
                    <ArrowLeft aria-hidden="true" size={16} />
                    Back to Current Progress
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function GeneratedPathPreferencesControls({
  disabled,
  onChange,
  preferences,
}: {
  disabled: boolean;
  onChange: (preferences: GeneratedPathPreferences) => void;
  preferences: GeneratedPathPreferences;
}) {
  const startTerm = preferences.startTerm ?? "Fall 2026";
  const maxCreditsPerTerm = preferences.maxCreditsPerTerm ?? 15;
  const maxSummerCredits = preferences.maxSummerCredits ?? 6;
  const includeSummer = Boolean(preferences.includeSummer);

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
      <p className="text-[13px] font-semibold leading-5 text-slate-800">
        Generated path settings
      </p>
      <div className="mt-3 grid gap-3">
        <label className="grid gap-1 text-[12px] font-semibold leading-5 text-slate-600" htmlFor="generated-path-start-term">
          Start term
          <select
            className="min-h-10 rounded-md border border-slate-300 bg-white px-2 text-[13px] font-medium text-slate-700 outline-none focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
            disabled={disabled}
            id="generated-path-start-term"
            onChange={(event) =>
              onChange({ ...preferences, startTerm: event.currentTarget.value })
            }
            value={startTerm}
          >
            {[
              "Fall 2026",
              "Spring 2027",
              "Summer 2027",
              "Fall 2027",
              "Spring 2028",
              "Summer 2028",
              "Fall 2028",
            ].map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-[12px] font-semibold leading-5 text-slate-600" htmlFor="generated-path-max-credits">
          Max fall/spring credits
          <input
            className="min-h-10 rounded-md border border-slate-300 bg-white px-2 text-[13px] font-medium text-slate-700 outline-none focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
            disabled={disabled}
            id="generated-path-max-credits"
            max={21}
            min={9}
            onChange={(event) =>
              onChange({
                ...preferences,
                maxCreditsPerTerm: Number(event.currentTarget.value),
              })
            }
            type="number"
            value={maxCreditsPerTerm}
          />
        </label>

        <label className="flex items-start gap-2 text-[12px] font-semibold leading-5 text-slate-700" htmlFor="generated-path-include-summer">
          <input
            checked={includeSummer}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#b84300] focus:ring-[#dd550c]"
            disabled={disabled}
            id="generated-path-include-summer"
            onChange={(event) =>
              onChange({
                ...preferences,
                includeSummer: event.currentTarget.checked,
              })
            }
            type="checkbox"
          />
          Include summer terms
        </label>

        {includeSummer ? (
          <label className="grid gap-1 text-[12px] font-semibold leading-5 text-slate-600" htmlFor="generated-path-summer-credits">
            Max summer credits
            <input
              className="min-h-10 rounded-md border border-slate-300 bg-white px-2 text-[13px] font-medium text-slate-700 outline-none focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
              disabled={disabled}
              id="generated-path-summer-credits"
              max={12}
              min={3}
              onChange={(event) =>
                onChange({
                  ...preferences,
                  maxSummerCredits: Number(event.currentTarget.value),
                })
              }
              type="number"
              value={maxSummerCredits}
            />
          </label>
        ) : null}
      </div>
      <p className="mt-2 text-[12px] leading-5 text-slate-500">
        The draft still needs advisor review for availability, prerequisites,
        substitutions, AP/transfer, Fall Through, and electives.
      </p>
    </div>
  );
}

function PlanStepButton({
  active,
  complete,
  disabled,
  label,
  locked = false,
  onClick,
  step,
  text,
}: {
  active: boolean;
  complete: boolean;
  disabled: boolean;
  label: string;
  locked?: boolean;
  onClick: () => void;
  step: PlanCheckStep;
  text: string;
}) {
  const statusText = active
    ? "Current step"
    : complete
      ? "Complete"
      : locked
        ? "Available after generated path"
        : "Available";
  const statusClassName = complete
    ? "text-emerald-900"
    : locked
      ? "text-slate-600"
      : "text-slate-700";

  return (
    <li>
      <button
        aria-current={active ? "step" : undefined}
        aria-label={`Step ${label}: ${text}. ${statusText}`}
        className={`flex min-h-[4.75rem] w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition ${
          active
            ? "border-[#dd550c]/35 bg-[#fff7f1] text-slate-900"
            : complete
              ? "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-300"
              : locked
                ? "border-slate-200 bg-slate-50 text-slate-400"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-[#dd550c]/50 hover:bg-white"
        } disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-slate-50`}
        data-testid={`planning-step-${step}`}
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${
          complete
            ? "bg-emerald-600 text-white"
            : active
              ? "bg-[#b84300] text-white"
              : "bg-white text-slate-500"
        }`}>
          {complete ? <CheckCircle2 aria-hidden="true" size={15} /> : label}
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em]">
            Step {label}
          </span>
          <span className="block font-semibold">{text}</span>
          <span className={`mt-0.5 block text-[11px] leading-4 ${statusClassName}`}>
            {statusText}
          </span>
        </span>
      </button>
    </li>
  );
}

function FormattedInstruction({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, index) =>
        index % 2 === 1 ? (
          <code className="rounded-sm bg-white px-1 py-0.5 font-semibold text-slate-800" key={`${text}-${part}`}>
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

function CompactFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-0.5 break-words font-semibold text-slate-900">{value}</p>
    </div>
  );
}
