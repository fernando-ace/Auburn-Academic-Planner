import { StakeholderPage } from "@/components/stakeholder-page";

export default function PrivacyPage() {
  return (
    <StakeholderPage
      title="Privacy"
      subtitle="How Planning Hub handles student-provided Degree Works material during this pilot-readiness phase."
      sections={[
        {
          title: "Transient PDF processing",
          body: "Planning Hub processes uploaded Degree Works PDFs for the current request and does not permanently store the PDF or extracted text. Responses use generic source labels instead of raw uploaded filenames.",
        },
        {
          title: "Sensitive information caution",
          body: "Auburn guidance warns against submitting sensitive or confidential data to unapproved AI tools. Planning Hub PDF analysis is deterministic and does not call Gemini; students should still use redacted examples for pilot testing whenever possible.",
        },
        {
          title: "FERPA review",
          body: "Degree Works records can include personally identifiable education-record information. Any Auburn-sponsored pilot should be reviewed for FERPA handling, access expectations, retention, and advisor workflow before student rollout.",
        },
      ]}
    />
  );
}
