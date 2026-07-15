import { StakeholderPage } from "@/components/stakeholder-page";

export default function LimitationsPage() {
  return (
    <StakeholderPage
      title="Limitations"
      subtitle="Known boundaries that should stay visible to advisors and Auburn stakeholders."
      sections={[
        {
          title: "Not an official audit",
          body: "Planning Hub output is not an official Auburn degree audit and does not replace Degree Works, Bulletin requirements, college policies, or advisor judgment.",
        },
        {
          title: "PDF extraction limits",
          body: "Readable PDF text can omit layout, substitutions, exceptions, hidden notes, transfer equivalencies, catalog-year effects, course availability, and prerequisite nuance.",
        },
        {
          title: "Manual planned courses",
          body: "Pasted planned-course text helps students check draft plans quickly, but it only sees the courses the student enters. It should be reviewed with the student's current Degree Works audit and advisor.",
        },
        {
          title: "Schedule feasibility",
          body: "Generated paths check Degree Works grounding and selected credit caps. A catalog-matched Bulletin sample plan may provide a season or ordering hint, but the planner does not verify prerequisites, corequisites, actual term offerings, or live seat availability. Confirm those details before registration.",
        },
      ]}
    />
  );
}
