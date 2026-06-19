import { FileUp, Loader2 } from "lucide-react";
import type { ChangeEventHandler, MouseEventHandler } from "react";

import type { PlanningTargetPathInput } from "@/lib/plan/target-path";

export function CombinedDegreeWorksUploadSection({
  isLoading,
  onAnalyze,
  onFileChange,
  onTargetPathChange,
  selectedFile,
  selectedTargetPath,
  validationError,
}: {
  isLoading: boolean;
  onAnalyze: MouseEventHandler<HTMLButtonElement>;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onTargetPathChange: (value: PlanningTargetPathInput) => void;
  selectedFile: File | null;
  selectedTargetPath: PlanningTargetPathInput;
  validationError: string | null;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 lg:pt-7">
      <div className="rounded-md border border-[#dd550c]/30 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <FileUp aria-hidden="true" className="text-[#dd550c]" size={20} />
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">Combined PDF analysis</p>
            </div>
            <h2 className="mt-2 text-[24px] font-semibold leading-8 text-slate-950">Analyze Degree Works PDF</h2>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              Upload one Degree Works PDF to run both the AI Engineering certificate check, Software Engineering degree progress check, and Computer Science degree progress check from the same parsed courses and credit total.
            </p>
            <p className="mt-2 text-[13px] leading-5 text-slate-500">
              This is not an official degree audit. Advisor verification is required. AP, transfer, substitutions, hidden Degree Works sections, electives, prerequisites, and semester ordering may require advisor review.
            </p>
          </div>
          <div className="w-full rounded-md border border-slate-200 bg-slate-50 p-3 lg:w-[24rem]">
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
            {selectedFile ? <p className="mt-2 text-[12px] leading-5 text-slate-500">Selected: {selectedFile.name}</p> : null}
            {validationError ? <p className="mt-2 text-[13px] leading-5 text-orange-700">{validationError}</p> : null}
            <button className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#dd550c] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#b84300] disabled:cursor-not-allowed disabled:bg-slate-300" disabled={isLoading} onClick={onAnalyze} type="button">
              {isLoading ? <Loader2 aria-hidden="true" className="animate-spin" size={17} /> : null}
              Analyze Degree Works PDF
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
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
