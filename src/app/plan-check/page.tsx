import { connection } from "next/server";

import {
  buildGeneratedPathStartTermOptions,
  getDefaultGeneratedPathStartTerm,
} from "@/lib/plan/generated-path-terms";
import type { GeneratedPathPreferences } from "@/lib/plan/generated-planned-path";
import { PlanCheckClient } from "./plan-check-client";

export default async function PlanCheckPage() {
  await connection();

  const requestTime = new Date();
  const initialGeneratedPathPreferences: GeneratedPathPreferences = {
    startTerm: getDefaultGeneratedPathStartTerm(requestTime),
    maxCreditsPerTerm: 15,
    includeSummer: false,
    maxSummerCredits: 6,
  };

  return (
    <PlanCheckClient
      generatedPathStartTermOptions={buildGeneratedPathStartTermOptions(
        requestTime,
      )}
      initialGeneratedPathPreferences={initialGeneratedPathPreferences}
    />
  );
}
