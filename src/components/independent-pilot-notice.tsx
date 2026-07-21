import Link from "next/link";

export function IndependentPilotNotice() {
  return (
    <aside
      aria-label="Pilot status"
      className="border-b border-sky-200 bg-sky-50 px-4 py-2 text-[12px] leading-5 text-sky-950 sm:px-6"
    >
      <p className="mx-auto w-full max-w-7xl">
        <strong>Independent student-built pilot.</strong> This is not an official
        or Auburn-endorsed service. Verify academic decisions in Degree Works and
        with an advisor. <Link className="font-semibold underline underline-offset-2" href="/limitations">Review scope</Link>{" "}
        or{" "}
        <Link
          className="font-semibold underline underline-offset-2"
          href="/feedback"
        >
          send feedback
        </Link>
        .
      </p>
    </aside>
  );
}
