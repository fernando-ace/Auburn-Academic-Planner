import Link from "next/link";

import { StakeholderPage } from "@/components/stakeholder-page";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Pilot Review",
  description: "Operational checklist for a responsible Auburn-facing pilot review.",
  path: "/pilot-review",
});

export default function PilotReviewPage() {
  return (
    <StakeholderPage
      title="Pilot Review"
      subtitle="Operational checklist for moving from prototype to a responsible Auburn-facing pilot."
      sections={[
        {
          title: "Advisor review",
          body: "Have advisors review redacted Planning Hub outputs for clarity, false reassurance risk, and whether the advisor-summary format matches real appointment workflows.",
        },
        {
          title: "Student testing",
          body: "Use synthetic or redacted Degree Works examples for usability tests. Track where students hesitate, misinterpret output, or expect official approval.",
        },
        {
          title: "Metrics and failures",
          body: "Record completion rate, upload failures, manual-entry usefulness, advisor-review flags, uncovered requirement patterns, and any output that could mislead a student.",
        },
      ]}
    >
      <Link
        className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:border-[#dd550c] hover:text-[#03244d]"
        href="/pilot-review/template"
      >
        Pilot readiness template
      </Link>
    </StakeholderPage>
  );
}
