import { StakeholderPage } from "@/components/stakeholder-page";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Pilot Readiness Template",
  description: "A reusable advisor review, usability, and failure-tracking template.",
  path: "/pilot-review/template",
});

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
          body: "Record participant group, device/browser, task completion for Current Progress, the generated path, Advisor Summary, and optional own-plan comparison; note confusing steps, advisor-verification comprehension, and whether a Plan PDF or manual courses were used.",
        },
        {
          title: "Metrics and failure log",
          body: "Track Current Progress completion, generated-path usefulness, own-plan comparison completion, parse failures, rate-limit events, accessibility issues, advisor-review counts, scenario, symptom, severity, owner, and status. Use synthetic or redacted materials only.",
        },
      ]}
    />
  );
}
