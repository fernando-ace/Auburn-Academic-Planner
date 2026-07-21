import Link from "next/link";

import { IndependentPilotNotice } from "@/components/independent-pilot-notice";

export default function NotFound() {
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
          404
        </p>
        <h1 className="mt-2 text-[32px] font-semibold leading-10">
          Page not found
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-600">
          That address does not match a page in this pilot. Return to Planning
          Hub to check Current Progress or compare a planned path.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#b84300] px-4 text-[14px] font-semibold text-white transition hover:bg-[#8f3200]"
          href="/plan-check"
        >
          Return to Planning Hub
        </Link>
      </section>
    </main>
  );
}
