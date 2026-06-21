import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import type {
  DegreeWorksDetectedSignals,
  DegreeWorksParserConfidence,
} from "@/lib/plan/degreeworks-analysis";

export function ResultSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section>
      <h3 className="text-[15px] font-semibold leading-6 text-slate-950">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ParserNotes({
  detectedSignals,
  parserConfidence,
  parserWarnings,
}: {
  detectedSignals: DegreeWorksDetectedSignals;
  parserConfidence: DegreeWorksParserConfidence;
  parserWarnings: string[];
}) {
  const signals = [
    detectedSignals.hasTransferCreditSignal ? "Transfer credit signal detected." : null,
    detectedSignals.hasApCreditSignal ? "AP or advanced placement signal detected." : null,
    detectedSignals.hasInProgressSignal ? "In-progress or registered coursework signal detected." : null,
    detectedSignals.hasSubstitutionSignal ? "Substitution or petition signal detected." : null,
    detectedSignals.hasExceptionSignal ? "Exception, waiver, or petition signal detected." : null,
    detectedSignals.hasInsufficientTextSignal ? "Extracted text may be incomplete." : null,
  ].filter((item): item is string => item !== null);
  const notes = [...signals, ...parserWarnings];

  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Parser confidence
        </p>
        <p className="mt-1 text-[16px] font-semibold leading-6 text-slate-950">
          {parserConfidence}
        </p>
      </div>
      {notes.length > 0 ? (
        <ul className="space-y-2 rounded-md border border-[#dd550c]/25 bg-[#fff7f1] p-3">
          {notes.map((note) => (
            <li
              className="flex gap-2 text-[13px] leading-5 text-slate-700"
              key={note}
            >
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-[#b84300]"
                size={15}
              />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
          No parser warnings were produced.
        </p>
      )}
    </div>
  );
}
