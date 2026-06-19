export const planningTargetPaths = [
  "auto",
  "software_engineering",
  "computer_science",
  "ai_certificate",
] as const;

export type PlanningTargetPathInput = (typeof planningTargetPaths)[number];

export function isPlanningTargetPathInput(
  value: unknown,
): value is PlanningTargetPathInput {
  return planningTargetPaths.includes(value as PlanningTargetPathInput);
}
