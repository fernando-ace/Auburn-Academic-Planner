import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import type { ReactNode } from "react";

import { StakeholderMoreMenu } from "./stakeholder-more-menu";

type StakeholderSection = {
  title: string;
  body: string;
};

export function StakeholderPage({
  title,
  subtitle,
  sections,
  children,
}: {
  title: string;
  subtitle: string;
  sections: StakeholderSection[];
  children?: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-slate-100 text-slate-950">
      <header className="bg-[#03244d] px-4 py-4 text-white shadow-sm sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
          <Link className="flex min-w-0 items-center gap-3" href="/plan-check">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-[#03244d]">
              <ClipboardCheck aria-hidden="true" size={21} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[18px] font-semibold leading-6 sm:text-[20px]">
                Auburn Academic Planner
              </p>
              <p className="hidden text-[13px] text-white/75 sm:block">
                Stakeholder review material
              </p>
            </div>
          </Link>
          <nav className="flex shrink-0 items-center gap-2" aria-label="Stakeholder navigation">
            <Link
              className="hidden h-10 items-center rounded-lg border border-white/20 px-3 text-[13px] font-semibold text-white transition hover:bg-white/10 sm:inline-flex"
              href="/plan-check"
            >
              Planning Hub
            </Link>
            <StakeholderMoreMenu />
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <section className="max-w-3xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
            Reviewer reference
          </p>
          <h1 className="mt-2 text-[32px] font-semibold leading-10 text-slate-950 sm:text-[40px] sm:leading-[48px]">
            {title}
          </h1>
          <p className="mt-3 text-[16px] leading-7 text-slate-600">{subtitle}</p>
        </section>

        <div className="mt-7 grid gap-4">
          {sections.map((section) => (
            <section
              className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
              key={section.title}
            >
              <h2 className="text-[18px] font-semibold leading-7 text-slate-950">
                {section.title}
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-slate-600">
                {section.body}
              </p>
            </section>
          ))}
        </div>
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </main>
  );
}
