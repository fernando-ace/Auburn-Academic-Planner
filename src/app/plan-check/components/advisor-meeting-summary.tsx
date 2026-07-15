import { Check, ClipboardCheck, Download } from "lucide-react";

export function AdvisorMeetingSummary({
  summary,
  status,
  onCopySummary,
  onDownloadSummary,
  title = "Advisor Meeting Summary",
}: {
  summary: string;
  status: string | null;
  onCopySummary: () => void;
  onDownloadSummary: () => void;
  title?: string;
}) {
  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-[#03244d]/20 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#03244d]/10 bg-[#eef4fa] px-4 py-2.5 text-[12px] font-semibold text-[#03244d] sm:px-5">
        <ClipboardCheck aria-hidden="true" size={15} />
        Copyable meeting notes
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-[18px] font-semibold leading-7 text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-slate-600">
              This is a preparation summary, not an official degree audit.
              Advisor verification is required.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold leading-5 text-slate-700 transition hover:border-[#dd550c] hover:text-[#03244d]"
              onClick={onDownloadSummary}
              type="button"
            >
              <Download aria-hidden="true" size={16} />
              Download notes
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#03244d] px-3 py-2 text-[13px] font-semibold leading-5 text-white transition hover:bg-[#021b3a]"
              onClick={onCopySummary}
              type="button"
            >
              {status === "Summary copied." ? (
                <Check aria-hidden="true" size={16} />
              ) : (
                <ClipboardCheck aria-hidden="true" size={16} />
              )}
              {status === "Summary copied." ? "Copied" : "Copy summary"}
            </button>
          </div>
        </div>
        <label className="sr-only" htmlFor="advisor-meeting-summary-text">
          {title}
        </label>
        <textarea
          id="advisor-meeting-summary-text"
          className="mt-4 min-h-80 w-full resize-y rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-[12px] leading-5 text-slate-800 outline-none focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
          readOnly
          value={summary}
        />
        {status ? (
          <p className="mt-2 text-[13px] leading-5 text-slate-600" role="status">
            {status}
          </p>
        ) : null}
        <p className="mt-2 text-[12px] leading-5 text-slate-500">
          More details are available in the expanded evidence section.
        </p>
      </div>
    </section>
  );
}
