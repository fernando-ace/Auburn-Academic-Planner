export const planningTargetPaths = [
  "auto",
  "software_engineering",
  "computer_science",
  "ai_certificate",
  "degreeworks_only",
] as const;

export type PlanningTargetPathInput = (typeof planningTargetPaths)[number];

export function isPlanningTargetPathInput(
  value: unknown,
): value is PlanningTargetPathInput {
  return planningTargetPaths.includes(value as PlanningTargetPathInput);
}
