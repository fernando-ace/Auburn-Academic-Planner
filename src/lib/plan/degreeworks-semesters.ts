import { parseCourseCodes } from "../courses/course-code-parser.ts";
import type { DegreeWorksParserConfidence } from "./degreeworks-analysis.ts";

export type DegreeWorksSemesterTerm = {
  label: string;
  index: number;
  courseCodes: string[];
};

export type DegreeWorksSemesterExtraction = {
  terms: DegreeWorksSemesterTerm[];
  unassignedCourseCodes: string[];
  warnings: string[];
  confidence: DegreeWorksParserConfidence;
};

const termLabelPattern =
  /\b(Fall|Spring|Summer)\s+(20\d{2})\s+Credits\s*:\s*\d+(?:\.\d+)?/gi;

export function extractDegreeWorksSemesters(
  text: string,
): DegreeWorksSemesterExtraction {
  const allCourseCodes = parseCourseCodes(text);
  const termMatches = Array.from(text.matchAll(termLabelPattern));
  const warnings: string[] = [];

  if (termMatches.length === 0) {
    return {
      terms: [],
      unassignedCourseCodes: allCourseCodes,
      warnings: [
        "No reliable Degree Works term labels were found in the extracted text.",
      ],
      confidence: "low",
    };
  }

  const seenAssignedCourses = new Set<string>();
  const terms = termMatches.map((match, index) => {
    const startIndex = match.index ?? 0;
    const endIndex =
      index + 1 < termMatches.length
        ? (termMatches[index + 1].index ?? text.length)
        : text.length;
    const segmentText = text.slice(startIndex, endIndex);
    const courseCodes = parseCourseCodes(segmentText).filter((courseCode) => {
      if (seenAssignedCourses.has(courseCode)) {
        return false;
      }

      seenAssignedCourses.add(courseCode);
      return true;
    });

    return {
      label: `${capitalizeTerm(match[1])} ${match[2]}`,
      index,
      courseCodes,
    };
  });

  const unassignedCourseCodes = allCourseCodes.filter(
    (courseCode) => !seenAssignedCourses.has(courseCode),
  );
  const assignedCourseCount = seenAssignedCourses.size;
  const assignedRatio =
    allCourseCodes.length === 0 ? 0 : assignedCourseCount / allCourseCodes.length;

  if (unassignedCourseCodes.length > 0) {
    warnings.push(
      "Some parsed courses were not assigned to a detected Degree Works term.",
    );
  }

  if (terms.some((term) => term.courseCodes.length === 0)) {
    warnings.push(
      "One or more detected Degree Works terms did not contain parsed course codes.",
    );
  }

  return {
    terms,
    unassignedCourseCodes,
    warnings,
    confidence:
      terms.length >= 2 && assignedRatio >= 0.8
        ? "high"
        : assignedCourseCount > 0
          ? "medium"
          : "low",
  };
}

function capitalizeTerm(term: string) {
  const lowerTerm = term.toLowerCase();
  return `${lowerTerm.charAt(0).toUpperCase()}${lowerTerm.slice(1)}`;
}
