import type { Metadata } from "next";

import { StakeholderPage } from "@/components/stakeholder-page";

export const metadata: Metadata = {
  title: "Pilot Readiness Template",
  description: "A reusable advisor review, usability, and failure-tracking template.",
};

export default function PilotReviewTemplatePage() {
  return (
    <StakeholderPage
      title="Pilot Readiness Template"
      subtitle="A lightweight template for advisor review, redacted student testing, metrics, and failure tracking."
      sections={[
        {
          title: "Advisor review",
          body: "Record reviewer, date, redacted scenario, whether the output clearly says it is not an official audit, whether the advisor summary supports appointments, wording that could create false confidence, and requirements needing clearer advisor-review labels.",
        },
        {
          title: "Student usability test",
          body: "Record participant group, device/browser, task completion for Current Progress, Planned Path, and Advisor Summary, confusing steps, advisor-verification comprehension, and whether PDF upload or manual planned-course entry was used.",
        },
        {
          title: "Metrics and failure log",
          body: "Track completion rates, parse failures, rate-limit events, accessibility issues, advisor-review counts, scenario, symptom, severity, owner, and status. Use synthetic or redacted materials only.",
        },
      ]}
    />
  );
}
