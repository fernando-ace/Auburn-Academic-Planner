import { ClipboardCheck } from "lucide-react";

export function AdvisorMeetingSummary({
  summary,
  copyStatus,
  onCopySummary,
}: {
  summary: string;
  copyStatus: string | null;
  onCopySummary: () => void;
}) {
  return (
    <section className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[18px] font-semibold leading-7 text-slate-950">
            Advisor Meeting Summary
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-slate-600">
            This is a preparation summary, not an official degree audit.
            Advisor verification is required.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#03244d] px-3 py-2 text-[13px] font-semibold leading-5 text-white transition hover:bg-[#021b3a]"
          onClick={onCopySummary}
          type="button"
        >
          <ClipboardCheck aria-hidden="true" size={16} />
          Copy summary
        </button>
      </div>
      <textarea
        id="advisor-meeting-summary-text"
        className="mt-4 min-h-80 w-full resize-y rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-[12px] leading-5 text-slate-800 outline-none focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
        readOnly
        value={summary}
      />
      {copyStatus ? (
        <p className="mt-2 text-[13px] leading-5 text-slate-600">
          {copyStatus}
        </p>
      ) : null}
    </section>
  );
}
