"use client";

import { Copy, ExternalLink, Mail } from "lucide-react";
import { useState } from "react";

const inputClassName =
  "mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[14px] leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#dd550c] focus:ring-2 focus:ring-[#dd550c]/20";
const reliableEmailDraftUriLength = 1800;

function formatFeedbackSummary({
  feedbackType,
  task,
  expected,
  actual,
  environment,
  impact,
}: {
  feedbackType: string;
  task: string;
  expected: string;
  actual: string;
  environment: string;
  impact: string;
}) {
  return [
    "Auburn Academic Planner feedback",
    "",
    `Feedback type: ${feedbackType}`,
    `Page or task: ${task.trim() || "Not provided"}`,
    `Expected result: ${expected.trim() || "Not provided"}`,
    `What happened: ${actual.trim() || "Not provided"}`,
    `Browser, device, or assistive technology: ${environment.trim() || "Not provided"}`,
    `Why this matters: ${impact.trim() || "Not provided"}`,
    "",
    "Privacy reminder: Before sending, remove every student record, name, student ID, credential, and non-public security detail.",
  ].join("\n");
}

export function FeedbackComposer() {
  const [feedbackType, setFeedbackType] = useState("Product behavior");
  const [task, setTask] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [environment, setEnvironment] = useState("");
  const [impact, setImpact] = useState("");
  const [copyStatus, setCopyStatus] = useState(
    "Nothing has been copied or sent.",
  );

  const summary = formatFeedbackSummary({
    feedbackType,
    task,
    expected,
    actual,
    environment,
    impact,
  });
  const emailHref = `mailto:?subject=${encodeURIComponent(
    "Auburn Academic Planner feedback",
  )}&body=${encodeURIComponent(summary)}`;
  const canOpenEmailDraft = emailHref.length <= reliableEmailDraftUriLength;

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus(
        "Feedback summary copied. Send it through the channel that shared this pilot.",
      );
    } catch {
      setCopyStatus(
        "Your browser blocked copying. Use Open email draft or the public GitHub form instead.",
      );
    }
  }

  return (
    <section
      aria-labelledby="feedback-composer-heading"
      className="rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="max-w-3xl">
        <h2
          className="text-[20px] font-semibold leading-7 text-slate-950"
          id="feedback-composer-heading"
        >
          Prepare non-sensitive feedback
        </h2>
        <p className="mt-2 text-[14px] leading-6 text-slate-600">
          This form stays in your browser. It does not submit to or store data in
          Auburn Academic Planner. Use synthetic examples and do not include
          names, student IDs, Degree Works records, credentials, or security
          details.
        </p>
      </div>

      <form className="mt-6 grid gap-5" onSubmit={(event) => event.preventDefault()}>
        <label className="text-[14px] font-semibold text-slate-800">
          Feedback type
          <select
            className={inputClassName}
            onChange={(event) => setFeedbackType(event.target.value)}
            value={feedbackType}
          >
            <option>Product behavior</option>
            <option>Accessibility barrier</option>
            <option>Documentation or wording</option>
            <option>Other non-sensitive feedback</option>
          </select>
        </label>

        <label className="text-[14px] font-semibold text-slate-800">
          Page or task
          <input
            className={inputClassName}
            maxLength={160}
            onChange={(event) => setTask(event.target.value)}
            placeholder="Example: Planning Hub Current Progress upload"
            type="text"
            value={task}
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-[14px] font-semibold text-slate-800">
            Expected result
            <textarea
              className={inputClassName}
              maxLength={800}
              onChange={(event) => setExpected(event.target.value)}
              rows={4}
              value={expected}
            />
          </label>
          <label className="text-[14px] font-semibold text-slate-800">
            What happened
            <textarea
              className={inputClassName}
              maxLength={1200}
              onChange={(event) => setActual(event.target.value)}
              rows={4}
              value={actual}
            />
          </label>
        </div>

        <label className="text-[14px] font-semibold text-slate-800">
          Browser, device, or assistive technology
          <input
            className={inputClassName}
            maxLength={200}
            onChange={(event) => setEnvironment(event.target.value)}
            placeholder="Example: Safari on iPhone with VoiceOver"
            type="text"
            value={environment}
          />
        </label>

        <label className="text-[14px] font-semibold text-slate-800">
          Why this matters
          <textarea
            className={inputClassName}
            maxLength={600}
            onChange={(event) => setImpact(event.target.value)}
            rows={3}
            value={impact}
          />
        </label>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:flex-wrap">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#03244d] px-4 text-[14px] font-semibold text-white transition hover:bg-[#0a3767] focus:outline-none focus:ring-2 focus:ring-[#dd550c]/40"
            onClick={copySummary}
            type="button"
          >
            <Copy aria-hidden="true" size={17} />
            Copy feedback summary
          </button>
          {canOpenEmailDraft ? (
            <a
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-[14px] font-semibold text-slate-700 transition hover:border-[#dd550c] hover:text-[#03244d] focus:outline-none focus:ring-2 focus:ring-[#dd550c]/30"
              href={emailHref}
            >
              <Mail aria-hidden="true" size={17} />
              Open email draft
            </a>
          ) : (
            <button
              className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-4 text-[14px] font-semibold text-slate-400"
              disabled
              type="button"
            >
              <Mail aria-hidden="true" size={17} />
              Email draft too long
            </button>
          )}
          <a
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-[14px] font-semibold text-slate-700 transition hover:border-[#dd550c] hover:text-[#03244d] focus:outline-none focus:ring-2 focus:ring-[#dd550c]/30"
            href="https://github.com/fernando-ace/Auburn-Academic-Planner/issues/new?template=product-feedback.yml"
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden="true" size={17} />
            Public GitHub form (sign-in required)
          </a>
        </div>
      </form>

      <p aria-live="polite" className="mt-4 text-[13px] leading-5 text-slate-600">
        {copyStatus}
      </p>
      {!canOpenEmailDraft ? (
        <p className="mt-1 text-[13px] leading-5 text-slate-600">
          Copy the summary instead so an email application does not truncate
          the details.
        </p>
      ) : null}
    </section>
  );
}
