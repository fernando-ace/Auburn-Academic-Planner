import type {
  CurrentDegreeAuditAnalysis,
} from "./current-degree-audit-analysis.ts";
import type { DegreeWorksParserConfidence } from "./degreeworks-analysis.ts";
import {
  formatStillNeededItemForDisplay,
  type DegreeWorksStillNeededItem,
  type DegreeWorksStillNeededRequirementType,
} from "./degreeworks-still-needed.ts";
import {
  findBulletinSamplePlanOrdering,
  type BulletinSamplePlanOrdering,
} from "./bulletin-sample-plan.ts";

export type GeneratedPathPreferences = {
  startTerm?: string;
  maxCreditsPerTerm?: number;
  includeSummer?: boolean;
  maxSummerCredits?: number;
  maxTerms?: number;
};

export type ResolvedGeneratedPathPreferences = {
  startTerm: string;
  maxCreditsPerTerm: number;
  includeSummer: boolean;
  maxSummerCredits: number;
  maxTerms: number;
};

export type GeneratedPlannedPathItem = {
  kind: "course" | "option" | "milestone" | "placeholder" | "registered" | "current";
  label: string;
  courseCodes: string[];
  credits: number;
  requirementLabel: string;
  requirementType: DegreeWorksStillNeededRequirementType;
  sourceBlockName: string;
  reason: string;
  locked?: boolean;
  sourceStatus?: "preregistered" | "in_progress";
  advisorVerificationRequired: true;
};

export type GeneratedPlannedPathTerm = {
  label: string;
  index: number;
  plannedCredits: number;
  lockedCredits: number;
  draftCredits: number;
  items: GeneratedPlannedPathItem[];
  warnings: string[];
};

export type GeneratedPathAdvisorReviewItem = {
  label: string;
  neededText: string;
  requirementType: DegreeWorksStillNeededRequirementType;
  courseOptions: string[];
  credits: number | null;
  reason: string;
};

export type GeneratedPlannedPath = {
  targetPath: "degreeworks_native";
  detectedProgram: CurrentDegreeAuditAnalysis["detectedProgram"];
  preferences: ResolvedGeneratedPathPreferences;
  terms: GeneratedPlannedPathTerm[];
  placedItems: GeneratedPlannedPathItem[];
  advisorReviewItems: GeneratedPathAdvisorReviewItem[];
  unplacedItems: GeneratedPathAdvisorReviewItem[];
  excludedCurrentCourseCodes: string[];
  creditTotals: {
    lockedCurrentCredits: number;
    draftCredits: number;
    totalDisplayedCredits: number;
  };
  orderingSource: {
    authority: "degreeworks_current_progress";
    bulletinOrderingHint: {
      matchedMajorTitle: string;
      catalogYear: string | null;
      fileName: string;
      confidence: "high" | "medium" | "low";
    } | null;
  };
  confidence: DegreeWorksParserConfidence;
  notes: string[];
};

type PlaceableItem = GeneratedPlannedPathItem & {
  sortOrder: number;
};

const defaultMaxCreditsPerTerm = 15;
const defaultMaxSummerCredits = 6;
const defaultMaxTerms = 8;
const defaultCourseCredits = 3;
const maxCreditCap = 21;
const maxSummerCreditCap = 12;
const courseCodePattern = /^[A-Z]{2,4}\s+\d{4}[A-Z]?$/;

export function buildGeneratedPlannedPath({
  audit,
  preferences,
}: {
  audit: CurrentDegreeAuditAnalysis;
  preferences?: GeneratedPathPreferences | null;
}): GeneratedPlannedPath {
  const resolvedPreferences = resolveGeneratedPathPreferences(preferences);
  const ordering = findBulletinSamplePlanOrdering(audit);
  const excludedCurrentCourseCodes = currentCourseCodes(audit);
  const unavailable = new Set(excludedCurrentCourseCodes);
  const advisorReviewItems: GeneratedPathAdvisorReviewItem[] = [];
  const unplacedItems: GeneratedPathAdvisorReviewItem[] = [];
  const lockedTerms = buildLockedCurrentTerms({
    audit,
    preferences: resolvedPreferences,
  });
  const placeableItems = audit.stillNeededItems.flatMap((item, index) =>
    buildPlaceableItems({
      advisorReviewItems,
      index,
      item,
      ordering,
      unavailable,
      unplacedItems,
    }),
  );
  const sortedItems = placeableItems.sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.requirementLabel.localeCompare(right.requirementLabel);
  });
  const terms = placeItemsInTerms({
    initialTerms: lockedTerms,
    items: sortedItems,
    maxDraftCredits: audit.creditsNeeded ?? null,
    preferences: resolvedPreferences,
    unplacedItems,
  });
  const placedItems = terms.flatMap((term) => term.items);
  const creditTotals = summarizeCreditTotals(terms);

  return {
    targetPath: "degreeworks_native",
    detectedProgram: audit.detectedProgram,
    preferences: resolvedPreferences,
    terms,
    placedItems,
    advisorReviewItems: dedupeAdvisorItems(advisorReviewItems),
    unplacedItems: dedupeAdvisorItems(unplacedItems),
    excludedCurrentCourseCodes,
    creditTotals,
    orderingSource: {
      authority: "degreeworks_current_progress",
      bulletinOrderingHint: ordering
        ? {
            matchedMajorTitle: ordering.matchedMajorTitle,
            catalogYear: ordering.catalogYear,
            fileName: ordering.fileName,
            confidence: ordering.confidence,
          }
        : null,
    },
    confidence: generatedPathConfidence({
      advisorReviewItems,
      audit,
      ordering,
      placedItems,
      unplacedItems,
    }),
    notes: generatedPathNotes({ ordering }),
  };
}

export function parseGeneratedPathPreferences(
  value: unknown,
): GeneratedPathPreferences {
  if (typeof value === "string") {
    if (!value.trim()) {
      return {};
    }

    try {
      return parseGeneratedPathPreferences(JSON.parse(value));
    } catch {
      return {};
    }
  }

  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as GeneratedPathPreferences;
  return {
    ...(typeof candidate.startTerm === "string"
      ? { startTerm: candidate.startTerm }
      : {}),
    ...(typeof candidate.maxCreditsPerTerm === "number"
      ? { maxCreditsPerTerm: candidate.maxCreditsPerTerm }
      : {}),
    ...(typeof candidate.includeSummer === "boolean"
      ? { includeSummer: candidate.includeSummer }
      : {}),
    ...(typeof candidate.maxSummerCredits === "number"
      ? { maxSummerCredits: candidate.maxSummerCredits }
      : {}),
    ...(typeof candidate.maxTerms === "number"
      ? { maxTerms: candidate.maxTerms }
      : {}),
  };
}

export function resolveGeneratedPathPreferences(
  preferences?: GeneratedPathPreferences | null,
): ResolvedGeneratedPathPreferences {
  return {
    startTerm: normalizeStartTerm(preferences?.startTerm),
    maxCreditsPerTerm: clampInteger(
      preferences?.maxCreditsPerTerm,
      9,
      maxCreditCap,
      defaultMaxCreditsPerTerm,
    ),
    includeSummer: Boolean(preferences?.includeSummer),
    maxSummerCredits: clampInteger(
      preferences?.maxSummerCredits,
      3,
      maxSummerCreditCap,
      defaultMaxSummerCredits,
    ),
    maxTerms: clampInteger(preferences?.maxTerms, 1, 12, defaultMaxTerms),
  };
}

function buildLockedCurrentTerms({
  audit,
  preferences,
}: {
  audit: CurrentDegreeAuditAnalysis;
  preferences: ResolvedGeneratedPathPreferences;
}) {
  const terms: GeneratedPlannedPathTerm[] = [];
  const lockedRecords = audit.courseStatusRecords
    .filter(
      (record) =>
        (record.status === "preregistered" || record.status === "in_progress") &&
        Boolean(record.termLabel),
    )
    .sort((left, right) => {
      const leftIndex = termIndexForLabel(left.termLabel ?? "", preferences) ?? 999;
      const rightIndex = termIndexForLabel(right.termLabel ?? "", preferences) ?? 999;
      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      return left.code.localeCompare(right.code);
    });

  for (const record of lockedRecords) {
    const termIndex = termIndexForLabel(record.termLabel ?? "", preferences);
    if (termIndex === null || termIndex >= preferences.maxTerms) {
      continue;
    }

    const term = terms[termIndex] ?? buildTerm(termIndex, preferences);
    const item = lockedItemForRecord(record);
    term.items.push(item);
    term.plannedCredits += item.credits;
    term.lockedCredits += item.credits;
    terms[termIndex] = term;
  }

  return terms;
}

function lockedItemForRecord(
  record: CurrentDegreeAuditAnalysis["courseStatusRecords"][number],
): GeneratedPlannedPathItem {
  const isPreregistered = record.status === "preregistered";
  return {
    kind: isPreregistered ? "registered" : "current",
    label: record.code,
    courseCodes: [record.code],
    credits: typeof record.credits === "number" ? record.credits : defaultCourseCredits,
    requirementLabel: isPreregistered
      ? "Preregistered Current Progress course"
      : "In-progress Current Progress course",
    requirementType: "advisor_review",
    sourceBlockName: "Current Progress",
    reason: isPreregistered
      ? "Degree Works lists this course as preregistered, so the draft keeps it instead of replacing it."
      : "Degree Works lists this course as in progress, so the draft keeps it instead of replacing it.",
    locked: true,
    sourceStatus: isPreregistered ? "preregistered" : "in_progress",
    advisorVerificationRequired: true,
  };
}

function buildPlaceableItems({
  advisorReviewItems,
  index,
  item,
  ordering,
  unavailable,
  unplacedItems,
}: {
  advisorReviewItems: GeneratedPathAdvisorReviewItem[];
  index: number;
  item: DegreeWorksStillNeededItem;
  ordering: BulletinSamplePlanOrdering | null;
  unavailable: Set<string>;
  unplacedItems: GeneratedPathAdvisorReviewItem[];
}): PlaceableItem[] {
  if (item.requirementType === "specific_course") {
    const code = normalizeCourseCode(item.courseOptions[0] ?? "");
    if (!code || unavailable.has(code)) {
      unplacedItems.push(advisorReviewItemForRequirement({
        item,
        reason:
          "Degree Works still lists this item, but the course also appears completed, transfer/AP, in progress, or preregistered; verify before planning it again.",
      }));
      return [];
    }

    return [
      buildCourseItem({
        code,
        index,
        item,
        kind: "course",
        ordering,
        reason:
          "Degree Works lists this exact course as still needed, so it is placed in the generated path.",
      }),
    ];
  }

  if (item.requirementType === "course_options") {
    const currentMatches = currentOptionMatches(item, unavailable);
    if (currentMatches.length > 0) {
      advisorReviewItems.push(advisorReviewItemForRequirement({
        item,
        reason:
          `This option set overlaps current, completed, AP/transfer, in-progress, or preregistered evidence (${currentMatches.join(", ")}); confirm whether it is already covered before choosing a different option.`,
      }));
      return [];
    }

    const selectedCode = selectOptionCourse({ item, ordering, unavailable });
    if (!selectedCode) {
      unplacedItems.push(advisorReviewItemForRequirement({
        item,
        reason:
          "Degree Works lists options, but no uncompleted option could be selected confidently.",
      }));
      return [];
    }

    advisorReviewItems.push(advisorReviewItemForRequirement({
      item,
      reason:
        "Degree Works lists an option set; the generated path chose one visible option for planning, but an advisor should confirm the choice.",
    }));

    return [
      buildCourseItem({
        code: selectedCode,
        index,
        item,
        kind: "option",
        ordering,
        reason:
          "Degree Works lists multiple options; this option appears earliest in the matched Auburn Bulletin sample plan or Degree Works option order.",
      }),
    ];
  }

  if (item.requirementType === "graduation_milestone") {
    const code = selectOptionCourse({ item, ordering, unavailable });
    return [
      {
        kind: "milestone",
        label: formatStillNeededItemForDisplay(item),
        courseCodes: code ? [code] : [],
        credits: 0,
        requirementLabel: item.requirementLabel,
        requirementType: item.requirementType,
        sourceBlockName: item.blockName,
        reason:
          "Degree Works lists this as a graduation or program milestone; it is placed near the end of the draft path.",
        advisorVerificationRequired: true,
        sortOrder: 100_000 + index,
      },
    ];
  }

  if (
    item.requirementType === "credit_hours_from_list" &&
    typeof item.creditAmount === "number" &&
    item.creditAmount > 0
  ) {
    const currentMatches = currentOptionMatches(item, unavailable);
    if (currentMatches.length > 0) {
      advisorReviewItems.push(advisorReviewItemForRequirement({
        item,
        reason:
          `This credit-hour option list overlaps current, completed, AP/transfer, in-progress, or preregistered evidence (${currentMatches.join(", ")}); confirm remaining credits with an advisor before reserving placeholders.`,
      }));
      return [];
    }

    advisorReviewItems.push(advisorReviewItemForRequirement({
      item,
      reason:
        "This is a credit-hour or elective requirement; the path reserves advisor-choice credits instead of inventing exact courses.",
    }));
    return buildAdvisorChoicePlaceholders({ index, item });
  }

  unplacedItems.push(advisorReviewItemForRequirement({
    item,
    reason:
      "This Degree Works requirement needs advisor review before the planner can choose a course or credit placeholder.",
  }));
  return [];
}

function buildCourseItem({
  code,
  index,
  item,
  kind,
  ordering,
  reason,
}: {
  code: string;
  index: number;
  item: DegreeWorksStillNeededItem;
  kind: "course" | "option";
  ordering: BulletinSamplePlanOrdering | null;
  reason: string;
}): PlaceableItem {
  const orderHint = ordering?.coursesByCode[code];
  return {
    kind,
    label: code,
    courseCodes: [code],
    credits: estimateCredits({ code, item, ordering }),
    requirementLabel: item.requirementLabel,
    requirementType: item.requirementType,
    sourceBlockName: item.blockName,
    reason,
    advisorVerificationRequired: true,
    sortOrder: orderHint ? orderHint.order : 10_000 + index,
  };
}

function buildAdvisorChoicePlaceholders({
  index,
  item,
}: {
  index: number;
  item: DegreeWorksStillNeededItem;
}) {
  const placeholders: PlaceableItem[] = [];
  let remainingCredits = Math.max(0, item.creditAmount ?? 0);
  let chunkIndex = 1;

  while (remainingCredits > 0) {
    const credits = Math.min(defaultCourseCredits, remainingCredits);
    placeholders.push({
      kind: "placeholder",
      label:
        remainingCredits === item.creditAmount
          ? formatStillNeededItemForDisplay(item)
          : `${formatStillNeededItemForDisplay(item)} (${chunkIndex})`,
      courseCodes: [],
      credits,
      requirementLabel: item.requirementLabel,
      requirementType: item.requirementType,
      sourceBlockName: item.blockName,
      reason:
        "Reserved as advisor-choice credits because Degree Works lists a broad elective or option-list requirement.",
      advisorVerificationRequired: true,
      sortOrder: 50_000 + index * 10 + chunkIndex,
    });
    remainingCredits -= credits;
    chunkIndex += 1;
  }

  return placeholders;
}

function placeItemsInTerms({
  initialTerms = [],
  items,
  maxDraftCredits,
  preferences,
  unplacedItems,
}: {
  initialTerms?: GeneratedPlannedPathTerm[];
  items: PlaceableItem[];
  maxDraftCredits: number | null;
  preferences: ResolvedGeneratedPathPreferences;
  unplacedItems: GeneratedPathAdvisorReviewItem[];
}) {
  const terms: GeneratedPlannedPathTerm[] = initialTerms.map((term) => ({
    ...term,
    items: [...term.items],
    warnings: [...term.warnings],
  }));
  let currentTermIndex = 0;
  let draftCreditsPlaced = terms.reduce((sum, term) => sum + term.draftCredits, 0);

  for (const item of items) {
    if (
      typeof maxDraftCredits === "number" &&
      item.credits > 0 &&
      draftCreditsPlaced + item.credits > maxDraftCredits
    ) {
      unplacedItems.push({
        label: item.label,
        neededText: item.requirementLabel,
        requirementType: item.requirementType,
        courseOptions: item.courseCodes,
        credits: item.credits,
        reason:
          "The generated path reached the Current Progress credits-needed total before this item could be placed.",
      });
      continue;
    }

    let placed = false;

    while (!placed) {
      if (currentTermIndex >= preferences.maxTerms) {
        unplacedItems.push({
          label: item.label,
          neededText: item.requirementLabel,
          requirementType: item.requirementType,
          courseOptions: item.courseCodes,
          credits: item.credits,
          reason:
            "The generated path reached the configured term limit before this item could be placed.",
        });
        break;
      }

      const term = terms[currentTermIndex] ?? buildTerm(currentTermIndex, preferences);
      terms[currentTermIndex] = term;
      const cap = creditCapForTerm(term.label, preferences);
      const wouldExceedCap =
        item.credits > 0 &&
        term.items.length > 0 &&
        term.plannedCredits + item.credits > cap;

      if (wouldExceedCap) {
        currentTermIndex += 1;
        continue;
      }

      term.items.push(stripSortOrder(item));
      term.plannedCredits += item.credits;
      term.draftCredits += item.credits;
      draftCreditsPlaced += item.credits;
      if (item.credits > cap) {
        term.warnings.push(
          `${item.label} is larger than the selected credit cap for this term.`,
        );
      }
      placed = true;
    }
  }

  return terms
    .filter((term) => term.items.length > 0)
    .map((term) => ({
      ...term,
      plannedCredits: Number(term.plannedCredits.toFixed(1)),
      warnings: termWarnings(term, preferences),
    }));
}

function buildTerm(
  index: number,
  preferences: ResolvedGeneratedPathPreferences,
): GeneratedPlannedPathTerm {
  return {
    label: termLabelAtIndex(index, preferences),
    index,
    plannedCredits: 0,
    lockedCredits: 0,
    draftCredits: 0,
    items: [],
    warnings: [],
  };
}

function termWarnings(
  term: GeneratedPlannedPathTerm,
  preferences: ResolvedGeneratedPathPreferences,
) {
  const warnings = [...term.warnings];
  const cap = creditCapForTerm(term.label, preferences);

  if (term.plannedCredits > cap) {
    warnings.push("This term is above the selected credit cap; review workload.");
  }

  if (term.items.some((item) => item.kind === "placeholder")) {
    warnings.push(
      "One or more items is an advisor-choice placeholder, not a specific registered course.",
    );
  }

  return Array.from(new Set(warnings));
}

function stripSortOrder(item: PlaceableItem): GeneratedPlannedPathItem {
  return {
    kind: item.kind,
    label: item.label,
    courseCodes: item.courseCodes,
    credits: item.credits,
    requirementLabel: item.requirementLabel,
    requirementType: item.requirementType,
    sourceBlockName: item.sourceBlockName,
    reason: item.reason,
    locked: item.locked,
    sourceStatus: item.sourceStatus,
    advisorVerificationRequired: item.advisorVerificationRequired,
  };
}

function summarizeCreditTotals(terms: GeneratedPlannedPathTerm[]) {
  const lockedCurrentCredits = terms.reduce(
    (sum, term) => sum + term.lockedCredits,
    0,
  );
  const draftCredits = terms.reduce((sum, term) => sum + term.draftCredits, 0);

  return {
    lockedCurrentCredits: Number(lockedCurrentCredits.toFixed(1)),
    draftCredits: Number(draftCredits.toFixed(1)),
    totalDisplayedCredits: Number((lockedCurrentCredits + draftCredits).toFixed(1)),
  };
}

function selectOptionCourse({
  item,
  ordering,
  unavailable,
}: {
  item: DegreeWorksStillNeededItem;
  ordering: BulletinSamplePlanOrdering | null;
  unavailable: Set<string>;
}) {
  const options = item.courseOptions
    .map(normalizeCourseCode)
    .filter((code) => courseCodePattern.test(code) && !unavailable.has(code));

  if (options.length === 0) {
    return null;
  }

  return options.sort((left, right) => {
    const leftOrder = ordering?.coursesByCode[left]?.order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = ordering?.coursesByCode[right]?.order ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return options.indexOf(left) - options.indexOf(right);
  })[0];
}

function currentOptionMatches(
  item: DegreeWorksStillNeededItem,
  unavailable: Set<string>,
) {
  return item.courseOptions
    .map(normalizeCourseCode)
    .filter((code) => courseCodePattern.test(code) && unavailable.has(code));
}

function estimateCredits({
  code,
  item,
  ordering,
}: {
  code: string;
  item: DegreeWorksStillNeededItem;
  ordering: BulletinSamplePlanOrdering | null;
}) {
  if (typeof item.creditAmount === "number") {
    return item.creditAmount;
  }

  const orderCredits = ordering?.coursesByCode[code]?.credits;
  if (typeof orderCredits === "number") {
    return orderCredits;
  }

  if (/^(?:UNIV\s+4AA0|ENGR\s+1100|COMP\s+4810)$/i.test(code)) {
    return 0;
  }

  return defaultCourseCredits;
}

function advisorReviewItemForRequirement({
  item,
  reason,
}: {
  item: DegreeWorksStillNeededItem;
  reason: string;
}): GeneratedPathAdvisorReviewItem {
  return {
    label: formatStillNeededItemForDisplay(item),
    neededText: item.neededText,
    requirementType: item.requirementType,
    courseOptions: item.courseOptions,
    credits: item.creditAmount ?? null,
    reason,
  };
}

function currentCourseCodes(audit: CurrentDegreeAuditAnalysis) {
  return Array.from(
    new Set(
      [
        ...audit.completedCourseCodes,
        ...audit.transferOrApCourseCodes,
        ...audit.inProgressCourseCodes,
        ...audit.preregisteredCourseCodes,
      ].map(normalizeCourseCode),
    ),
  );
}

function generatedPathConfidence({
  advisorReviewItems,
  audit,
  ordering,
  placedItems,
  unplacedItems,
}: {
  advisorReviewItems: GeneratedPathAdvisorReviewItem[];
  audit: CurrentDegreeAuditAnalysis;
  ordering: BulletinSamplePlanOrdering | null;
  placedItems: GeneratedPlannedPathItem[];
  unplacedItems: GeneratedPathAdvisorReviewItem[];
}): DegreeWorksParserConfidence {
  if (audit.confidence === "low" || placedItems.length === 0) {
    return "low";
  }

  if (
    !ordering ||
    ordering.confidence !== "high" ||
    advisorReviewItems.length > 0 ||
    unplacedItems.length > 0
  ) {
    return "medium";
  }

  return audit.confidence;
}

function generatedPathNotes({
  ordering,
}: {
  ordering: BulletinSamplePlanOrdering | null;
}) {
  return [
    "Generated from Degree Works Current Progress evidence; it is not an official degree audit.",
    ordering
      ? `A checked-in Auburn Bulletin sample plan for ${ordering.matchedMajorTitle} was used only to order matching Degree Works-backed items.`
      : "No matching Auburn Bulletin sample plan was found, so remaining Degree Works-backed items were ordered from the audit.",
    "Course availability, prerequisites, substitutions, AP/transfer, Fall Through, electives, and advisor-approved alternatives require advisor verification.",
  ];
}

function dedupeAdvisorItems(items: GeneratedPathAdvisorReviewItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.label}|${item.neededText}|${item.reason}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function termLabelAtIndex(
  index: number,
  preferences: ResolvedGeneratedPathPreferences,
) {
  let { term, year } = parseTerm(preferences.startTerm);
  for (let step = 0; step < index; step += 1) {
    ({ term, year } = nextTerm({ includeSummer: preferences.includeSummer, term, year }));
  }

  return `${term} ${year}`;
}

function termIndexForLabel(
  label: string,
  preferences: ResolvedGeneratedPathPreferences,
) {
  if (!/\b(?:Fall|Spring|Summer)\s+20\d{2}\b/i.test(label)) {
    return null;
  }

  const normalizedLabel = normalizeStartTerm(label);

  for (let index = 0; index < preferences.maxTerms; index += 1) {
    if (termLabelAtIndex(index, preferences) === normalizedLabel) {
      return index;
    }
  }

  return null;
}

function nextTerm({
  includeSummer,
  term,
  year,
}: {
  includeSummer: boolean;
  term: string;
  year: number;
}) {
  if (term === "Fall") {
    return { term: "Spring", year: year + 1 };
  }

  if (term === "Spring") {
    return includeSummer ? { term: "Summer", year } : { term: "Fall", year };
  }

  return { term: "Fall", year };
}

function creditCapForTerm(
  termLabel: string,
  preferences: ResolvedGeneratedPathPreferences,
) {
  return /^Summer\b/i.test(termLabel)
    ? preferences.maxSummerCredits
    : preferences.maxCreditsPerTerm;
}

function normalizeStartTerm(value?: string | null) {
  const parsed = value ? parseTerm(value) : defaultStartTerm();
  return `${parsed.term} ${parsed.year}`;
}

function parseTerm(value: string) {
  const match = /\b(Fall|Spring|Summer)\s+(20\d{2})\b/i.exec(value);
  if (!match) {
    return defaultStartTerm();
  }

  return {
    term: capitalizeTerm(match[1]),
    year: Number(match[2]),
  };
}

function defaultStartTerm() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (month <= 3) {
    return { term: "Summer", year };
  }

  if (month <= 7) {
    return { term: "Fall", year };
  }

  return { term: "Spring", year: year + 1 };
}

function clampInteger(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function capitalizeTerm(value: string) {
  const lower = value.toLowerCase();
  return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
}

function normalizeCourseCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, " ");
}
