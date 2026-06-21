import type {
  CurrentDegreeAuditAnalysis,
  CurrentDegreeAuditRequirementBlock,
} from "./current-degree-audit-analysis.ts";
import type { DegreeWorksStillNeededItem } from "./degreeworks-still-needed.ts";
import { formatStillNeededItemForDisplay } from "./degreeworks-still-needed.ts";

export type CurrentProgressPriority = {
  label: string;
  reason: string;
};

export type StillNeededDisplayGroup = {
  title: string;
  items: string[];
};

const parserFragmentPattern =
  /\b(?:credits?\s+(?:required|applied|needed)|catalog\s+year|gpa|unmet\s+condition|satisfied\s+by|student\s+id|audit\s+date)\b/i;

export function formatRequirementBlockLabel(
  block: Pick<CurrentDegreeAuditRequirementBlock, "name" | "creditsNeeded">,
) {
  const cleanName = cleanRequirementBlockName(block.name);

  if (!cleanName) {
    return "Requirement block needs advisor review";
  }

  const credits =
    typeof block.creditsNeeded === "number" && Number.isFinite(block.creditsNeeded)
      ? ` - ${block.creditsNeeded} credits needed`
      : "";

  return `${cleanName}${credits}`;
}

export function groupStillNeededItems(
  items: DegreeWorksStillNeededItem[],
): StillNeededDisplayGroup[] {
  const groups: StillNeededDisplayGroup[] = [
    { title: "Specific courses still needed", items: [] },
    { title: "Course option requirements", items: [] },
    { title: "Core or elective requirements", items: [] },
    { title: "Milestones", items: [] },
    { title: "Advisor-review requirements", items: [] },
  ];

  for (const item of items) {
    const displayText = formatStillNeededDisplayText(item);

    if (item.requirementType === "specific_course") {
      groups[0].items.push(displayText);
    } else if (item.requirementType === "course_options") {
      groups[1].items.push(displayText);
    } else if (item.requirementType === "credit_hours_from_list") {
      groups[2].items.push(displayText);
    } else if (item.requirementType === "graduation_milestone") {
      groups[3].items.push(displayText);
    } else {
      groups[4].items.push(displayText);
    }
  }

  return groups
    .map((group) => ({ ...group, items: dedupe(group.items).slice(0, 6) }))
    .filter((group) => group.items.length > 0);
}

export function buildCurrentProgressPriorities({
  audit,
}: {
  audit: CurrentDegreeAuditAnalysis;
}): CurrentProgressPriority[] {
  const priorities: CurrentProgressPriority[] = [];
  const incompleteBlocks = audit.requirementBlocks.filter(
    (block) => block.status !== "complete",
  );

  if (
    incompleteBlocks.some((block) =>
      /\b(?:major|program|business|liberal arts|science|engineering|minor)\b/i.test(
        block.name,
      ),
    ) ||
    audit.stillNeededCourseCodes.length > 0
  ) {
    priorities.push({
      label: "Finish remaining major requirements",
      reason: "Degree Works still shows program or course requirements to resolve.",
    });
  }

  if (
    audit.stillNeededItems.some((item) =>
      ["course_options", "credit_hours_from_list", "block_reference"].includes(
        item.requirementType,
      ),
    )
  ) {
    priorities.push({
      label: "Choose remaining core or elective options",
      reason: "Some requirements need an advisor-approved choice instead of one fixed course.",
    });
  }

  if (audit.preregisteredCourseCodes.length > 0) {
    priorities.push({
      label: "Verify preregistered courses",
      reason: "Confirm these registrations still apply before treating them as completed.",
    });
  }

  if (
    audit.externalCreditRecords.length > 0 ||
    audit.transferOrApCourseCodes.length > 0 ||
    audit.nonDegreeApplicableCourseCodes.length > 0
  ) {
    priorities.push({
      label: "Confirm AP, transfer, and Fall Through credit applicability",
      reason: "External or non-degree-applicable credit can change what remains.",
    });
  }

  if (
    audit.stillNeededItems.some(
      (item) => item.requirementType === "graduation_milestone",
    )
  ) {
    priorities.push({
      label: "Review graduation or program milestones",
      reason: "Milestone requirements may need timing or completion verification.",
    });
  }

  if (priorities.length === 0) {
    priorities.push({
      label: "Review remaining advisor-verification items",
      reason: "Use Degree Works and your advisor to confirm what should happen next.",
    });
  }

  return priorities.slice(0, 5);
}

export function formatStillNeededDisplayText(item: DegreeWorksStillNeededItem) {
  if (
    item.requirementType === "course_options" &&
    item.courseOptions.length > 6
  ) {
    return "Core or elective options require advisor review";
  }

  if (
    item.requirementType === "credit_hours_from_list" &&
    item.courseOptions.length > 6
  ) {
    return /technical\s+elective/i.test(item.neededText)
      ? "Technical elective options require advisor review"
      : "Core or elective options require advisor review";
  }

  if (
    item.requirementType === "block_reference" ||
    item.requirementType === "advisor_review"
  ) {
    return "Requirement block needs advisor review";
  }

  return formatStillNeededItemForDisplay(item).replaceAll(
    "Option-list",
    "Core or elective",
  );
}

function cleanRequirementBlockName(name: string) {
  const withoutNoise = name
    .replace(/\b(?:See|Below|Requirement|Requirements)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    withoutNoise.length < 4 ||
    withoutNoise.length > 70 ||
    parserFragmentPattern.test(withoutNoise)
  ) {
    return "";
  }

  return titleCaseRequirement(withoutNoise);
}

function titleCaseRequirement(value: string) {
  return value
    .split(/\s+/)
    .map((word) =>
      /^(?:AP|GPA|UNIV|COMP|CS|BS|BA|BSBA|HSS)$/i.test(word)
        ? word.toUpperCase()
        : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
    )
    .join(" ");
}

function dedupe(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}
