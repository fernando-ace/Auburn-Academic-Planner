"use client";

import Link from "next/link";
import { useEffect } from "react";

import { IndependentPilotNotice } from "@/components/independent-pilot-notice";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application route failed.", error.digest ?? "no-digest");
  }, [error.digest]);

  return (
    <main
      className="min-h-dvh bg-slate-100 text-slate-950"
      id="main-content"
      tabIndex={-1}
    >
      <header className="bg-[#03244d] px-4 py-5 text-white sm:px-6">
        <p className="mx-auto w-full max-w-3xl text-[18px] font-semibold">
          Auburn Academic Planner
        </p>
      </header>
      <IndependentPilotNotice />
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
          Something went wrong
        </p>
        <h1 className="mt-2 text-[32px] font-semibold leading-10">
          This page could not finish loading
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-600">
          PDFs are not permanently stored. If you enabled a device draft, it
          remains only in this browser. Try this page again, or return to
          Planning Hub and restart the current step.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="inline-flex min-h-11 items-center rounded-lg bg-[#b84300] px-4 text-[14px] font-semibold text-white transition hover:bg-[#8f3200]"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-semibold text-slate-700 transition hover:border-[#dd550c]"
            href="/plan-check"
          >
            Return to Planning Hub
          </Link>
        </div>
      </section>
    </main>
  );
}
