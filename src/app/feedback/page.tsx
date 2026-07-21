import { StakeholderPage } from "@/components/stakeholder-page";
import { buildPageMetadata } from "@/lib/site-metadata";

import { FeedbackComposer } from "./feedback-composer";

export const metadata = buildPageMetadata({
  title: "Feedback",
  description:
    "Prepare privacy-safe product or accessibility feedback for the independent pilot.",
  path: "/feedback",
});

export default function FeedbackPage() {
  return (
    <StakeholderPage
      title="Feedback"
      subtitle="Prepare a reproducible, privacy-safe summary without needing a GitHub account or sending data to this application."
      sections={[
        {
          title: "Choose a delivery channel",
          body: "Copy the summary into the channel that shared this pilot, open an email draft with no recipient selected, or use the public GitHub form if you have an account. The application does not receive or store the form contents.",
        },
        {
          title: "Keep records and incidents out",
          body: "Use only synthetic details. Do not include a Degree Works document, student record, name, student ID, credential, vulnerability detail, or other non-public information. A private incident channel must exist before sponsored campus use.",
        },
      ]}
    >
      <FeedbackComposer />
    </StakeholderPage>
  );
}
