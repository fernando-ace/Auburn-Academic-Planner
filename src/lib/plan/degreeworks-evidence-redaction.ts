const recordBoundary =
  String.raw`(?=\s+\b(?:Student\s+(?:name|ID|number)|Banner\s+ID|Email|E-mail|Phone|Mobile|Cell|Date\s+of\s+birth|Birth\s+date|Program|Major|College|Catalog\s+year|Credits\s+(?:required|applied|needed)|Audit\s+date|Degree(?:\s+progress)?|Overall\s+GPA|Level|Classification|GPA|Unmet\s+conditions|[A-Z]{2,4}\s*\d{4})\b|$)`;

const studentNamePattern = new RegExp(
  String.raw`\bStudent\s+name\b\s*:?\s*[A-Za-z][A-Za-z ,.'-]{1,100}?${recordBoundary}`,
  "gi",
);
const labeledStudentIdPattern =
  /\b(?:Student\s+(?:ID|number)|Banner\s+ID)\b\s*[:#-]?\s*(?:\*{2,}\d{2,}|[A-Z]?\d{7,10}|REDACTED)\b/gi;
const auburnHeaderIdentityPattern =
  /\bAuburn\s+University\s+[A-Za-z][A-Za-z ,.'-]{1,80}\s*-\s*(?:\*{2,}\d{2,}|[A-Z]?\d{7,10})\b/gi;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const labeledPhonePattern =
  /\b(?:Phone|Mobile|Cell)\b\s*:?\s*(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]\d{3}[ .-]\d{4}\b/gi;
const labeledBirthDatePattern =
  /\b(?:Date\s+of\s+birth|Birth\s+date)\b\s*:?\s*(?:\d{1,2}[/-]){2}\d{2,4}\b/gi;

export function redactDegreeWorksEvidence(text: string) {
  return text
    .replace(auburnHeaderIdentityPattern, "Auburn University [student identity redacted]")
    .replace(studentNamePattern, "Student name [redacted]")
    .replace(labeledStudentIdPattern, "Student ID [redacted]")
    .replace(emailPattern, "[email redacted]")
    .replace(labeledPhonePattern, "Phone [redacted]")
    .replace(labeledBirthDatePattern, "Date of birth [redacted]")
    .replace(/\s+/g, " ")
    .trim();
}
