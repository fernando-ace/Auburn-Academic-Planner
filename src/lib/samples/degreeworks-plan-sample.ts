import degreeWorksPlanSampleJson from "../../../data/samples/degreeworks-plan-sample.json" with { type: "json" };

export type DegreeWorksPlanSampleCourse = {
  code: string;
  name: string;
  credits: number;
};

export type DegreeWorksPlanSampleTerm = {
  name: string;
  plannedCredits: number;
  courses: DegreeWorksPlanSampleCourse[];
};

export type DegreeWorksPlanSample = {
  planDescription: string;
  totalPlannedCredits: number;
  major: string;
  program: string;
  terms: DegreeWorksPlanSampleTerm[];
};

const degreeWorksPlanSample =
  degreeWorksPlanSampleJson as DegreeWorksPlanSample;

export function getDegreeWorksPlanSample() {
  return degreeWorksPlanSample;
}

export function getDegreeWorksPlanSampleCourseCodes() {
  return degreeWorksPlanSample.terms.flatMap((term) =>
    term.courses.map((course) => course.code),
  );
}
