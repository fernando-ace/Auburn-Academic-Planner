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
          title: "Optional saved manual plan",
          body: "Planning Hub saves nothing automatically. When you explicitly choose Save on this device, it stores only versioned planning settings plus recognized manual course codes, term labels, and planned credit totals in that browser for 30 days. If size limits omit recognized items, the draft also stores only the counts omitted so the warning remains visible. It never saves PDFs, filenames, raw extracted audit evidence, analysis results, or Chat messages. Restore and Delete controls stay visible; Delete removes the saved plan from this device.",
        },
        {
          title: "Chat and Gemini",
          body: "Chat is off until you explicitly consent. After consent, your current question and up to five recent, non-error messages are sent to Google Gemini with retrieved Auburn source context. That recent history is browser-supplied, untrusted continuity context; the server does not authenticate it as prior model output. Google processes the content to generate the answer. Do not include names, student IDs, or other private student records in Chat.",
        },
        {
          title: "Consent, reset, and data minimization",
          body: "Gemini consent lasts only for the current browser session and is not saved between visits. Reset chat and revoke consent clears the conversation shown in this browser and stops future messages from being sent. Reset does not retract a request that was already sent. The API rejects Chat requests without the current consent acknowledgment, and the server limits each request to the current question plus at most five recent messages.",
        },
        {
          title: "FERPA review",
          body: "Degree Works records can include personally identifiable education-record information. Any Auburn-sponsored pilot should be reviewed for FERPA handling, access expectations, retention, and advisor workflow before student rollout.",
        },
      ]}
    />
  );
}
