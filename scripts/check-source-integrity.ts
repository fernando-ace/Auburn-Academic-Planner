import { checkSourceIntegrity } from "../src/lib/sources/source-integrity.ts";

const result = checkSourceIntegrity();

console.log(`Source integrity: ${result.status.toUpperCase()}`);
console.log(`Checked at: ${result.checkedAt}`);
console.log(`Warnings: ${result.warnings.length}`);

printList("Warnings", result.warnings);
printList("Errors", result.errors);
printList("Missing files", result.missingFiles);
printList(
  "Catalog year mismatches",
  result.catalogYearMismatches.map(
    (mismatch) => `${mismatch.ruleFile} ${mismatch.field}: expected ${mismatch.expected}, found ${mismatch.actual}`,
  ),
);
printList(
  "Source ID mismatches",
  result.sourceIdMismatches.map(
    (mismatch) => `${mismatch.ruleFile} ${mismatch.field}: expected ${mismatch.expected}, found ${mismatch.actual}`,
  ),
);
printList(
  "Rule drift",
  result.driftFindings.map((finding) => {
    const missing = [...finding.missingCourseCodes, ...finding.missingEvidence].join(", ");
    return `${finding.ruleFile} vs ${finding.sourceFile}: missing ${missing}`;
  }),
);
printList("Recommended fixes", result.recommendedFixes);

if (!result.passed) process.exitCode = 1;

function printList(label: string, values: string[]) {
  if (!values.length) return;
  console.log(`\n${label}:`);
  for (const value of values) console.log(`- ${value}`);
}
