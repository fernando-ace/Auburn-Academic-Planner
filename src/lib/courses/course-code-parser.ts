import { AUBURN_COURSE_PREFIXES } from "./auburn-course-prefixes.generated.ts";

const courseCodePattern = new RegExp(
  `\\b(${AUBURN_COURSE_PREFIXES.join("|")})\\s*-?\\s*([0-9][0-9A-Z]{3})\\b`,
  "gi",
);

export function parseCourseCodes(input: string): string[] {
  const courseCodes: string[] = [];
  const seen = new Set<string>();

  for (const match of input.matchAll(courseCodePattern)) {
    const normalizedCourseCode = `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;

    if (seen.has(normalizedCourseCode)) {
      continue;
    }

    seen.add(normalizedCourseCode);
    courseCodes.push(normalizedCourseCode);
  }

  return courseCodes;
}
