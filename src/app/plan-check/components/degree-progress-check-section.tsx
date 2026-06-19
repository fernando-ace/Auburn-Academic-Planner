import { FileUp, Loader2 } from "lucide-react";
import type { ChangeEventHandler, MouseEventHandler } from "react";

type DegreeKind = "software_engineering" | "computer_science";

const degreeContent = {
  software_engineering: {
    title: "Software Engineering Degree Progress",
    description:
      "Checks the sample Degree Works plan against local Software Engineering degree rules. This extracted plan does not prove completion of every Software Engineering requirement.",
    caveat:
      "AP, transfer, substitutions, Degree Works hidden sections, and advisor-approved electives may not be captured by the simple parser yet.",
    coursesId: "software-engineering-planned-courses",
    coursesLabel: "Paste Software Engineering plan courses",
    coursesPlaceholder: "COMP 1210\nCOMP 2210\nCOMP 2710\nPHIL 1020",
    creditsId: "software-engineering-total-planned-credits",
    checkLabel: "Check pasted Software Engineering plan",
    pdfId: "software-engineering-degreeworks-pdf",
    pdfLabel: "Software Engineering Degree Works PDF",
  },
  computer_science: {
    title: "Computer Science Degree Progress",
    description:
      "Checks the sample Degree Works plan against local Computer Science degree rules. This extracted plan does not prove final degree completion.",
    caveat:
      "Advisor verification is required. AP, transfer, substitutions, hidden Degree Works sections, electives, prerequisites, and semester ordering may affect this result.",
    coursesId: "computer-science-planned-courses",
    coursesLabel: "Paste Computer Science plan courses",
    coursesPlaceholder: "COMP 1210\nCOMP 2210\nCOMP 4200\nPHIL 1020",
    creditsId: "computer-science-total-planned-credits",
    checkLabel: "Check pasted Computer Science plan",
    pdfId: "computer-science-degreeworks-pdf",
    pdfLabel: "Computer Science Degree Works PDF",
  },
} as const;

export function DegreeProgressCheckSection({
  degreeKind,
  enteredCourses,
  enteredTotalCredits,
  isDraftSemesterPlanLoading,
  isLoading,
  manualValidationError,
  onCheckEnteredCourses,
  onCheckSamplePlan,
  onCheckUploadedPdf,
  onCoursesChange,
  onGenerateDraftPlan,
  onPdfFileChange,
  onTotalCreditsChange,
  parsedCourseCodes,
  selectedPdfFile,
  uploadValidationError,
}: {
  degreeKind: DegreeKind;
  enteredCourses: string;
  enteredTotalCredits: string;
  isDraftSemesterPlanLoading: boolean;
  isLoading: boolean;
  manualValidationError: string | null;
  onCheckEnteredCourses: MouseEventHandler<HTMLButtonElement>;
  onCheckSamplePlan: MouseEventHandler<HTMLButtonElement>;
  onCheckUploadedPdf: MouseEventHandler<HTMLButtonElement>;
  onCoursesChange: (value: string) => void;
  onGenerateDraftPlan: () => void;
  onPdfFileChange: ChangeEventHandler<HTMLInputElement>;
  onTotalCreditsChange: (value: string) => void;
  parsedCourseCodes: string[];
  selectedPdfFile: File | null;
  uploadValidationError: string | null;
}) {
  const content = degreeContent[degreeKind];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-[22px] font-semibold leading-8 text-slate-950">
        {content.title}
      </h2>
      <p className="mt-2 text-[14px] leading-6 text-slate-600">
        {content.description}
      </p>
      <p className="mt-2 text-[13px] leading-5 text-slate-500">
        {content.caveat}
      </p>

      <div className="mt-5">
        <label className="text-[13px] font-semibold leading-5 text-slate-700" htmlFor={content.coursesId}>
          {content.coursesLabel}
        </label>
        <textarea
          className="mt-2 min-h-56 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-[14px] leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
          disabled={isLoading}
          id={content.coursesId}
          onChange={(event) => onCoursesChange(event.target.value)}
          placeholder={content.coursesPlaceholder}
          value={enteredCourses}
        />
        <p className="mt-2 text-[13px] leading-5 text-slate-500">
          Paste comma-separated courses, newline courses, or messy Degree Works-style text. This check is deterministic and still needs advisor review.
        </p>
        <p className="mt-1 text-[12px] leading-5 text-slate-500">
          Parsed courses: {parsedCourseCodes.length > 0 ? parsedCourseCodes.join(", ") : "none yet"}
        </p>
      </div>

      <div className="mt-4">
        <label className="text-[13px] font-semibold leading-5 text-slate-700" htmlFor={content.creditsId}>
          Total planned credits
        </label>
        <input
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[14px] leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
          disabled={isLoading}
          id={content.creditsId}
          inputMode="decimal"
          min="0"
          onChange={(event) => onTotalCreditsChange(event.target.value)}
          placeholder="Optional, e.g. 122"
          type="number"
          value={enteredTotalCredits}
        />
        <p className="mt-2 text-[13px] leading-5 text-slate-500">
          Leave blank when Degree Works, AP, transfer, substitution, or elective credits still need advisor confirmation.
        </p>
        {manualValidationError ? (
          <p className="mt-2 text-[13px] leading-5 text-orange-700">{manualValidationError}</p>
        ) : null}
      </div>

      <button className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#03244d] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#021b3a] disabled:cursor-not-allowed disabled:bg-slate-300" disabled={isLoading} onClick={onCheckEnteredCourses} type="button">
        {isLoading ? <Loader2 aria-hidden="true" className="animate-spin" size={17} /> : null}
        {content.checkLabel}
      </button>
      <button className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[#03244d] bg-white px-4 py-2 text-center text-[14px] font-semibold leading-5 text-[#03244d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" disabled={isDraftSemesterPlanLoading} onClick={onGenerateDraftPlan} type="button">
        {isDraftSemesterPlanLoading ? <Loader2 aria-hidden="true" className="animate-spin" size={17} /> : null}
        Generate draft plan
      </button>
      <button className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-[14px] font-semibold leading-5 text-slate-700 transition hover:border-[#dd550c] hover:text-[#03244d] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" disabled={isLoading} onClick={onCheckSamplePlan} type="button">
        {isLoading ? <Loader2 aria-hidden="true" className="animate-spin" size={17} /> : null}
        Check sample Degree Works plan
      </button>

      <section className="mt-6 border-t border-slate-200 pt-5">
        <div className="flex items-center gap-2">
          <FileUp aria-hidden="true" className="text-[#dd550c]" size={18} />
          <h2 className="text-[16px] font-semibold leading-6 text-slate-950">Upload Degree Works PDF</h2>
        </div>
        <div className="mt-3">
          <label className="text-[13px] font-semibold leading-5 text-slate-700" htmlFor={content.pdfId}>{content.pdfLabel}</label>
          <input accept="application/pdf" className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 file:mr-3 file:rounded-sm file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:border-[#dd550c] focus:outline-none focus:ring-4 focus:ring-[#dd550c]/15" disabled={isLoading} id={content.pdfId} onChange={onPdfFileChange} type="file" />
          {selectedPdfFile ? <p className="mt-2 text-[12px] leading-5 text-slate-500">Selected: {selectedPdfFile.name}</p> : null}
          {uploadValidationError ? <p className="mt-2 text-[13px] leading-5 text-orange-700">{uploadValidationError}</p> : null}
        </div>
        <button className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#dd550c] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#b84300] disabled:cursor-not-allowed disabled:bg-slate-300" disabled={isLoading} onClick={onCheckUploadedPdf} type="button">
          {isLoading ? <Loader2 aria-hidden="true" className="animate-spin" size={17} /> : null}
          Check uploaded PDF
        </button>
      </section>
    </section>
  );
}
