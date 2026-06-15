const totalCreditPatterns = [
  /\btotal\s+planned\s+credits?\s*:?\s*([0-9]+(?:\.[0-9]+)?)/i,
  /\btotal\s+plan\s+credits?\s*:?\s*([0-9]+(?:\.[0-9]+)?)/i,
  /\btotal\s+credits?\s+planned\s*:?\s*([0-9]+(?:\.[0-9]+)?)/i,
  /\btotal\s+hours?\s*:?\s*([0-9]+(?:\.[0-9]+)?)/i,
  /\btotal\s+credits?\s*:?\s*([0-9]+(?:\.[0-9]+)?)/i,
];

export function extractTotalPlannedCredits(text: string) {
  for (const pattern of totalCreditPatterns) {
    const match = pattern.exec(text);

    if (!match) {
      continue;
    }

    const totalCredits = Number(match[1]);

    if (Number.isFinite(totalCredits) && totalCredits > 0) {
      return totalCredits;
    }
  }

  return null;
}
