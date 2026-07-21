import type { Metadata } from "next";

import { StakeholderPage } from "@/components/stakeholder-page";

export const metadata: Metadata = {
  title: "Accessibility",
  description: "Accessibility targets, testing, and feedback for the pilot.",
};

export default function AccessibilityPage() {
  return (
    <StakeholderPage
      title="Accessibility"
      subtitle="Pilot accessibility expectations for a tool intended for Auburn students."
      sections={[
        {
          title: "WCAG 2.2 AA target",
          body: "The pilot targets WCAG 2.2 Level AA. Automated axe checks, keyboard regressions, visible-focus checks, and narrow-width overflow checks run in Chromium, Firefox, and WebKit, but automated results are not a conformance certification.",
        },
        {
          title: "Keyboard operation",
          body: "Primary Planning Hub and Chat controls are reachable by keyboard. The stakeholder More menu can be opened with pointer or keyboard and closed with Escape.",
        },
        {
          title: "Pilot feedback",
          body: "Accessibility review should include real assistive-technology checks with redacted or synthetic materials before any sponsored campus use. Report a barrier through the public project feedback tracker so the device, browser, assistive technology, task, and impact can be reproduced.",
        },
      ]}
    />
  );
}
