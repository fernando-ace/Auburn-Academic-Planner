import type { ReactNode } from "react";

const statusToneClasses = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  navy: "border-[#03244d]/15 bg-[#eef4fa] text-[#03244d]",
  orange: "border-[#dd550c]/20 bg-[#fff7f1] text-[#9b3900]",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
} as const;

export function StatusPill({
  children,
  icon,
  tone = "neutral",
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: keyof typeof statusToneClasses;
}) {
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-4 ${statusToneClasses[tone]}`}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
}

export function SectionCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_30px_rgba(15,23,42,0.04)] ${className}`}
    >
      {children}
    </section>
  );
}

export function MetricCard({
  detail,
  label,
  value,
}: {
  detail?: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <div className="mt-1.5 text-[15px] font-semibold leading-5 text-[#03244d]">
        {value}
      </div>
      {detail ? (
        <div className="mt-1 text-[12px] leading-5 text-slate-500">{detail}</div>
      ) : null}
    </div>
  );
}

export function Callout({
  children,
  icon,
  tone = "neutral",
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "warning" | "success";
}) {
  const classes = {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[tone];

  return (
    <div className={`flex gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] leading-5 ${classes}`}>
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-6 text-[14px] leading-6 text-slate-500">
      {children}
    </div>
  );
}

export function CollapsibleDetails({
  children,
  description,
  open = false,
  title,
}: {
  children: ReactNode;
  description?: string;
  open?: boolean;
  title: string;
}) {
  return (
    <details
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      open={open}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 outline-none transition hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#dd550c]/20 sm:px-5">
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold leading-5 text-slate-950">
            {title}
          </span>
          {description ? (
            <span className="mt-1 block text-[12px] leading-5 text-slate-500">
              {description}
            </span>
          ) : null}
        </span>
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 text-lg text-slate-500 transition group-open:rotate-45 group-open:border-[#dd550c]/30 group-open:text-[#b84300]"
        >
          +
        </span>
      </summary>
      <div className="border-t border-slate-200 bg-slate-50/60 p-4 sm:p-5">
        {children}
      </div>
    </details>
  );
}
