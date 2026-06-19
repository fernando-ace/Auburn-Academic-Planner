import { FileText, FileUp, Loader2 } from "lucide-react";
import type { ChangeEventHandler, MouseEventHandler } from "react";

import type { PlanningTargetPathInput } from "@/lib/plan/target-path";

export type PlanCheckWorkflowMode = "current_progress" | "planned_path";

export function DegreeWorksWorkflowUploadSection({
  mode,
  isLoading,
  onAnalyze,
  onFileChange,
  onModeChange,
  onTargetPathChange,
  selectedFile,
  selectedTargetPath,
  validationError,
}: {
  mode: PlanCheckWorkflowMode;
  isLoading: boolean;
  onAnalyze: MouseEventHandler<HTMLButtonElement>;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onModeChange: (mode: PlanCheckWorkflowMode) => void;
  onTargetPathChange: (value: PlanningTargetPathInput) => void;
  selectedFile: File | null;
  selectedTargetPath: PlanningTargetPathInput;
  validationError: string | null;
}) {
  const currentProgressExportSteps = [
    "Open Auburn Degree Works.",
    "Go to `Worksheets`.",
    "Click the print icon on the Worksheet page.",
    "Choose dimensions if prompted.",
    "Click `Open PDF`.",
    "In the PDF viewer, click the download icon or save the PDF.",
    "Upload that saved PDF under `Current Progress`.",
  ];
  const plannedPathExportSteps = [
    "Open Auburn Degree Works.",
    "Go to the `Plans` tab.",
    "Open the plan you want to check.",
    "Click the print icon on the Plans page.",
    "Degree Works will open a printable plan page.",
    "On that printable page, click the print icon again.",
    "In the browser print dialog, choose `Save as PDF`.",
    "Save the PDF, then upload that saved PDF here.",
  ];
  const isCurrentProgress = mode === "current_progress";
  const exportSteps = isCurrentProgress
    ? currentProgressExportSteps
    : plannedPathExportSteps;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-5 sm:px-6 lg:pt-7">
      <div className="overflow-hidden rounded-xl border border-[#dd550c]/30 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="h-1 bg-[#dd550c]" />
        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-8 lg:p-6">
          <div className="max-w-3xl lg:py-1">
            <div className="flex items-center gap-2">
              <FileUp aria-hidden="true" className="text-[#dd550c]" size={20} />
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">Degree Works workflows</p>
            </div>
            <h2 className="mt-2 text-[24px] font-semibold leading-8 text-slate-950">
              {isCurrentProgress ? "Check Current Progress" : "Check Planned Path"}
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              {isCurrentProgress
                ? "Upload your Degree Works Worksheet audit to see where you stand right now and what to discuss taking next semester."
                : "Upload a Degree Works Plan PDF to test whether a proposed multi-semester plan supports your graduation path and target timeline."}
            </p>
            <p className="mt-2 text-[13px] leading-5 text-slate-500">
              {isCurrentProgress
                ? "Current Progress preserves completed, preregistered, AP/transfer, Fall Through, still-needed, and unknown statuses instead of flattening everything into planned courses."
                : "Planned Path focuses on timeline feasibility, semester load, prerequisites, unresolved blocks, and advisor-review items for a future plan."}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                className={`rounded-lg border p-4 text-left transition ${
                  isCurrentProgress
                    ? "border-[#dd550c] bg-[#fff7f1] shadow-sm"
                    : "border-slate-200 bg-white hover:border-[#dd550c]/50"
                }`}
                disabled={isLoading}
                onClick={() => onModeChange("current_progress")}
                type="button"
              >
                <span className="block text-[15px] font-semibold leading-6 text-slate-950">Current Progress</span>
                <span className="mt-1 block text-[13px] leading-5 text-slate-600">
                  Worksheet/Audit PDF for current standing and next-semester advisor discussion.
                </span>
              </button>
              <button
                className={`rounded-lg border p-4 text-left transition ${
                  !isCurrentProgress
                    ? "border-[#dd550c] bg-[#fff7f1] shadow-sm"
                    : "border-slate-200 bg-white hover:border-[#dd550c]/50"
                }`}
                disabled={isLoading}
                onClick={() => onModeChange("planned_path")}
                type="button"
              >
                <span className="block text-[15px] font-semibold leading-6 text-slate-950">Planned Path</span>
                <span className="mt-1 block text-[13px] leading-5 text-slate-600">
                  Plan PDF for validating a future graduation path, timeline, and course sequence.
                </span>
              </button>
            </div>

            <details className="mt-4 rounded-lg border border-[#dd550c]/25 bg-[#fff7f1] p-3 text-[13px] leading-5 text-slate-700" open>
              <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-950">
                <FileText aria-hidden="true" className="shrink-0 text-[#dd550c]" size={17} />
                <span>
                  {isCurrentProgress
                    ? "How to export your Degree Works current audit PDF"
                    : "How to export your Degree Works plan PDF"}
                </span>
              </summary>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5">
                {exportSteps.map((step) => (
                  <li key={step}>
                    {step.split("`").map((part, index) =>
                      index % 2 === 1 ? (
                        <code className="rounded-sm bg-white px-1 py-0.5 font-semibold text-slate-800" key={`${step}-${part}`}>
                          {part}
                        </code>
                      ) : (
                        part
                      ),
                    )}
                  </li>
                ))}
              </ol>
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] leading-5 text-amber-900">
                Upload the saved PDF, not a screenshot. {isCurrentProgress ? "Use the Worksheet audit PDF for Current Progress." : "Use the printable Degree Works Plan PDF for Planned Path."}
              </p>
              <p className="mt-2 text-[12px] leading-5 text-slate-600">
                The PDF is processed server-side for this check and is not permanently stored.
              </p>
            </details>
          </div>
          <div className="w-full rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <label className="text-[13px] font-semibold leading-5 text-slate-700" htmlFor="combined-degreeworks-target-path">Planning target</label>
            <select className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 focus:border-[#dd550c] focus:outline-none focus:ring-4 focus:ring-[#dd550c]/15" disabled={isLoading} id="combined-degreeworks-target-path" onChange={(event) => onTargetPathChange(event.target.value as PlanningTargetPathInput)} value={selectedTargetPath}>
              <option value="auto">Auto</option>
              <option value="software_engineering">Software Engineering</option>
              <option value="computer_science">Computer Science</option>
              <option value="ai_certificate">AI Engineering certificate</option>
            </select>
            <p className="mt-2 text-[12px] leading-5 text-slate-500">Focuses the planning reports; all three detailed checks still run.</p>
            <label className="mt-3 block text-[13px] font-semibold leading-5 text-slate-700" htmlFor="combined-degreeworks-pdf">Degree Works PDF</label>
            <input accept="application/pdf" className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 file:mr-3 file:rounded-sm file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:border-[#dd550c] focus:outline-none focus:ring-4 focus:ring-[#dd550c]/15" disabled={isLoading} id="combined-degreeworks-pdf" onChange={onFileChange} type="file" />
            <p className="mt-2 text-[12px] leading-5 text-slate-500">
              Upload the saved PDF, not a screenshot. {isCurrentProgress ? "Current Progress expects a Worksheet/Audit PDF." : "Planned Path expects a Degree Works Plan PDF."}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-slate-500">
              The PDF is processed server-side for this check and is not permanently stored.
            </p>
            {selectedFile ? <p className="mt-2 break-all text-[12px] font-medium leading-5 text-emerald-700">Selected: {selectedFile.name}</p> : null}
            {validationError ? <p className="mt-2 text-[13px] font-medium leading-5 text-orange-700" role="alert">{validationError}</p> : null}
            <button className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#dd550c] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white shadow-sm transition hover:bg-[#b84300] disabled:cursor-not-allowed disabled:bg-slate-300" disabled={isLoading} onClick={onAnalyze} type="button">
              {isLoading ? <Loader2 aria-hidden="true" className="animate-spin" size={17} /> : null}
              {isCurrentProgress ? "Check Current Progress" : "Check Planned Path"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AiCertificateCheckSection({
  enteredCourses,
  isDraftLoading,
  isLoading,
  onCheckEntered,
  onCheckSample,
  onCheckUploaded,
  onCoursesChange,
  onGenerateDraft,
  onPdfFileChange,
  parsedCourseCodes,
  selectedPdfFile,
  uploadValidationError,
}: {
  enteredCourses: string;
  isDraftLoading: boolean;
  isLoading: boolean;
  onCheckEntered: MouseEventHandler<HTMLButtonElement>;
  onCheckSample: MouseEventHandler<HTMLButtonElement>;
  onCheckUploaded: MouseEventHandler<HTMLButtonElement>;
  onCoursesChange: (value: string) => void;
  onGenerateDraft: () => void;
  onPdfFileChange: ChangeEventHandler<HTMLInputElement>;
  parsedCourseCodes: string[];
  selectedPdfFile: File | null;
  uploadValidationError: string | null;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-[22px] font-semibold leading-8 text-slate-950">AI Certificate Plan Check</h2>
      <p className="mt-2 text-[14px] leading-6 text-slate-600">Checks entered courses against Auburn&apos;s AI Engineering certificate requirements using the local deterministic requirement rules.</p>
      <div className="mt-5">
        <label className="text-[13px] font-semibold leading-5 text-slate-700" htmlFor="planned-courses">Paste planned courses</label>
        <textarea className="mt-2 min-h-56 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-[14px] leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15" disabled={isLoading} id="planned-courses" onChange={(event) => onCoursesChange(event.target.value)} placeholder={"COMP 5130\nCOMP 5600\nCOMP 5630\nCOMP 5610"} value={enteredCourses} />
        <p className="mt-2 text-[13px] leading-5 text-slate-500">Users can paste comma-separated courses, newline courses, or Degree Works-style text.</p>
        <p className="mt-1 text-[12px] leading-5 text-slate-500">Parsed courses: {parsedCourseCodes.length > 0 ? parsedCourseCodes.join(", ") : "none yet"}</p>
      </div>
      <div className="mt-5 grid gap-2">
        <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#03244d] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#021b3a] disabled:cursor-not-allowed disabled:bg-slate-300" disabled={isLoading} onClick={onCheckEntered} type="button">{isLoading ? <Loader2 aria-hidden="true" className="animate-spin" size={17} /> : null}Check entered courses</button>
        <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[#03244d] bg-white px-4 py-2 text-center text-[14px] font-semibold leading-5 text-[#03244d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" disabled={isDraftLoading} onClick={onGenerateDraft} type="button">{isDraftLoading ? <Loader2 aria-hidden="true" className="animate-spin" size={17} /> : null}Generate draft plan</button>
        <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-[14px] font-semibold leading-5 text-slate-700 transition hover:border-[#dd550c] hover:text-[#03244d] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" disabled={isLoading} onClick={onCheckSample} type="button">{isLoading ? <Loader2 aria-hidden="true" className="animate-spin" size={17} /> : null}Check sample Degree Works plan</button>
      </div>
      <section className="mt-6 border-t border-slate-200 pt-5">
        <div className="flex items-center gap-2"><FileUp aria-hidden="true" className="text-[#dd550c]" size={18} /><h2 className="text-[16px] font-semibold leading-6 text-slate-950">Upload Degree Works PDF</h2></div>
        <div className="mt-3">
          <label className="text-[13px] font-semibold leading-5 text-slate-700" htmlFor="degreeworks-pdf">Degree Works PDF</label>
          <input accept="application/pdf" className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 file:mr-3 file:rounded-sm file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:border-[#dd550c] focus:outline-none focus:ring-4 focus:ring-[#dd550c]/15" disabled={isLoading} id="degreeworks-pdf" onChange={onPdfFileChange} type="file" />
          {selectedPdfFile ? <p className="mt-2 text-[12px] leading-5 text-slate-500">Selected: {selectedPdfFile.name}</p> : null}
          {uploadValidationError ? <p className="mt-2 text-[13px] leading-5 text-orange-700">{uploadValidationError}</p> : null}
        </div>
        <button className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#dd550c] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#b84300] disabled:cursor-not-allowed disabled:bg-slate-300" disabled={isLoading} onClick={onCheckUploaded} type="button">{isLoading ? <Loader2 aria-hidden="true" className="animate-spin" size={17} /> : null}Check uploaded PDF</button>
      </section>
    </section>
  );
}
