import { StakeholderPage } from "@/components/stakeholder-page";

export default function MethodologyPage() {
  return (
    <StakeholderPage
      title="Methodology"
      subtitle="A reviewer-focused summary of what the tool does and does not use for planning outputs."
      sections={[
        {
          title: "Degree Works-native planning",
          body: "Current Progress and Planned Path use readable Degree Works text to extract statuses, still-needed requirements, planned courses, semester loads, and advisor-review flags. The planning workflow is not a catalog rule engine.",
        },
        {
          title: "AI boundary",
          body: "Planning Hub does not call Gemini. Gemini is limited to the Chat route, where explicit session consent is required and answers are source-grounded by uploaded Auburn academic materials with confidence and advisor verification guidance.",
        },
        {
          title: "Schedule evidence",
          body: "Generated paths place Degree Works-backed items within selected credit caps. A program-matched checked-in Bulletin sample plan can inform order. An exact catalog-year match is labeled as matched; if Current Progress has no catalog year, the hint is explicitly unconfirmed; a known catalog-year mismatch is not applied. Sample plans are never treated as prerequisite, offering, or seat-availability rules.",
        },
        {
          title: "Advisor verification",
          body: "Outputs are preparation summaries, not official audits. Students should verify course choices, catalog effects, substitutions, transfer/AP credit, prerequisites, and graduation timing with Degree Works and an academic advisor.",
        },
      ]}
    />
  );
}
