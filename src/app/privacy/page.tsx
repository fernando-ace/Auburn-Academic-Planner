import { StakeholderPage } from "@/components/stakeholder-page";

export default function PrivacyPage() {
  return (
    <StakeholderPage
      title="Privacy"
      subtitle="How Planning Hub handles student-provided Degree Works material and Chat messages during this pilot-readiness phase."
      sections={[
        {
          title: "Transient PDF processing",
          body: "Planning Hub processes uploaded Degree Works PDFs for the current request and does not permanently store the PDF or extracted text. Responses use generic source labels instead of raw uploaded filenames.",
        },
        {
          title: "Sensitive information caution",
          body: "Planning Hub PDF analysis is deterministic and does not send PDF contents to Gemini. Students should still use redacted examples for pilot testing whenever possible and avoid uploading records that are not needed for the planning task.",
        },
        {
          title: "Chat and Gemini",
          body: "When you use Chat, your question and up to 11 recent messages are sent to Google Gemini with retrieved Auburn source context to generate the answer. Do not include names, student IDs, or other private student records in Chat.",
        },
        {
          title: "FERPA review",
          body: "Degree Works records can include personally identifiable education-record information. Any Auburn-sponsored pilot should be reviewed for FERPA handling, access expectations, retention, and advisor workflow before student rollout.",
        },
      ]}
    />
  );
}
