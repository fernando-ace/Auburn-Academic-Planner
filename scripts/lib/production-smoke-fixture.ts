export const PRODUCTION_SMOKE_EXPECTED_COURSE_CODES = [
  "COMP 3220",
  "COMP 3270",
  "ELEC 2200",
] as const;

const productionSmokeWorksheetLines = [
  "Auburn University Degree Works Worksheet",
  "Student name Synthetic Release Check",
  "Student ID ****0000",
  "Degree Bachelor of Software Engr",
  "Program BSWE Software Engineering",
  "Major Software Engineering - SENG",
  "Catalog year 2025-2026",
  "Credits required 122",
  "Credits applied 96",
  "Unmet conditions for this set of requirements: 26 Credits needed",
  "Bachelor of Software Engineering INCOMPLETE",
  "Complete See Pre Engineering Course Requirements Below",
  "Satisfied by: COMP 1210 Fundamentals of Computing I Grade A Credits 3 Term Fall 2024",
  "Satisfied by: MATH 1610 Calculus I Grade B Credits 4 Term Fall 2024",
  "Incomplete See Software Engineering Major Courses section",
  "Still needed: 3 Credits in COMP 3220",
  "Still needed: 3 Credits in COMP 3270",
  "Incomplete See Software Engineering Supporting Courses section",
  "Still needed: 4 Credits in ELEC 2200",
  "Complete See Composition Core Requirements Below",
  "Satisfied by: ENGL 1100 English Composition I Grade A Credits 3 Term Fall 2024",
  "Satisfied by: ENGL 1120 English Composition II Grade B Credits 3 Term Spring 2025",
  "Disclaimer: This audit is a guide and is not official graduation certification.",
];

export function makeProductionSmokeWorksheetPdf() {
  const escaped = productionSmokeWorksheetLines
    .map((line) =>
      line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"),
    )
    .map(
      (line, index) =>
        `BT /F1 9 Tf 32 ${760 - index * 12} Td (${line}) Tj ET`,
    )
    .join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${escaped.length} >>\nstream\n${escaped}\nendstream`,
  ];
  const offsets: number[] = [];
  let pdf = "%PDF-1.7\n";

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return pdf;
}
