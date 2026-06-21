import { checkProjectSourceIntegrity } from "../src/lib/sources/source-integrity-filesystem.ts";

const result = checkProjectSourceIntegrity();

console.log(`Source integrity: ${result.status.toUpperCase()}`);
console.log(`Checked at: ${result.checkedAt}`);
console.log(`Warnings: ${result.warnings.length}`);

printList("Warnings", result.warnings);
printList("Errors", result.errors);
printList("Missing files", result.missingFiles);
printList("Recommended fixes", result.recommendedFixes);

if (!result.passed) process.exitCode = 1;

function printList(label: string, values: string[]) {
  if (!values.length) return;
  console.log(`\n${label}:`);
  for (const value of values) console.log(`- ${value}`);
}
