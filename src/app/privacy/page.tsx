import Link from "next/link";

import { StakeholderPage } from "@/components/stakeholder-page";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Privacy",
  description: "How the independent pilot handles planning inputs and Chat data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <StakeholderPage
      title="Privacy"
      subtitle="How Planning Hub handles student-provided Degree Works material and Chat messages during this pilot-readiness phase."
      sections={[
        {
          title: "Status and effective date",
          body: "Effective July 20, 2026. This independent student-built pilot is operated by the project repository owner and is not an official or Auburn-endorsed service. This notice should be reviewed again before any sponsored campus pilot.",
        },
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
          title: "Hosting and request protection",
          body: "The application is hosted on Vercel, which necessarily receives network and request metadata such as IP address, time, route, browser headers, and diagnostic information. When distributed request protection is configured, the app sends Upstash only a shortened one-way hash of the validated client IP together with a route namespace so it can count requests; the raw IP is not used as the Upstash rate-limit key.",
        },
        {
          title: "Retention and service providers",
          body: "The application code does not create student accounts or a database of PDFs, extracted audit text, planning results, or Chat histories. Vercel, Google, and Upstash may retain service or diagnostic data under the deployment settings and their own terms. Their retention cannot be erased by Reset Chat or Delete device draft. Auburn should approve vendor settings, agreements, retention, and incident-response expectations before any sponsored use.",
        },
        {
          title: "Consent, reset, and data minimization",
          body: "Gemini consent lasts only for the current browser session and is not saved between visits. Reset chat and revoke consent clears the conversation shown in this browser and stops future messages from being sent. Reset does not retract a request that was already sent. The API rejects Chat requests without the current consent acknowledgment, and the server limits each request to the current question plus at most five recent messages.",
        },
        {
          title: "FERPA review",
          body: "Degree Works records can include personally identifiable education-record information. Any Auburn-sponsored pilot should be reviewed for FERPA handling, access expectations, retention, and advisor workflow before student rollout.",
        },
        {
          title: "Feedback and incident reporting",
          body: "The Feedback page prepares non-sensitive product feedback locally and offers copy, email-draft, and public GitHub options. It does not submit the form to this application. Do not include names, student IDs, Degree Works records, security details, or other private information. A private privacy and security reporting channel must be established before any sponsored campus use.",
        },
      ]}
    >
      <Link
        className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:border-[#dd550c] hover:text-[#03244d]"
        href="/feedback"
      >
        Send non-sensitive product feedback
      </Link>
    </StakeholderPage>
  );
}
