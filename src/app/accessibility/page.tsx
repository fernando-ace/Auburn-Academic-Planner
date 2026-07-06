import { StakeholderPage } from "@/components/stakeholder-page";

export default function AccessibilityPage() {
  return (
    <StakeholderPage
      title="Accessibility"
      subtitle="Pilot accessibility expectations for a tool intended for Auburn students."
      sections={[
        {
          title: "WCAG 2.1 AA target",
          body: "The interface is designed and tested against WCAG 2.1 AA expectations, including keyboard access, visible focus, readable contrast, no horizontal overflow on common viewport sizes, and automated axe checks.",
        },
        {
          title: "Keyboard operation",
          body: "Primary Planning Hub and Chat controls are reachable by keyboard. The stakeholder More menu can be opened with pointer or keyboard and closed with Escape.",
        },
        {
          title: "Pilot feedback",
          body: "Accessibility review should include real assistive-technology checks with redacted or synthetic materials before any sponsored campus use.",
        },
      ]}
    />
  );
}
