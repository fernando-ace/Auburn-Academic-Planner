import {
  buildGeneratedPathStartTermOptions,
  getDefaultGeneratedPathStartTerm,
} from "@/lib/plan/generated-path-terms";
import type { GeneratedPathPreferences } from "@/lib/plan/generated-planned-path";
import { PlanCheckClient } from "./plan-check-client";

export const revalidate = 300;

export default function PlanCheckPage() {
  const renderedAt = new Date();
  const initialGeneratedPathPreferences: GeneratedPathPreferences = {
    startTerm: getDefaultGeneratedPathStartTerm(renderedAt),
    maxCreditsPerTerm: 15,
    includeSummer: false,
    maxSummerCredits: 6,
  };

  return (
    <PlanCheckClient
      generatedPathStartTermOptions={buildGeneratedPathStartTermOptions(
        renderedAt,
      )}
      initialGeneratedPathPreferences={initialGeneratedPathPreferences}
    />
  );
}
