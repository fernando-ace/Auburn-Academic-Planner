import type { ExternalCreditRecord } from "./degreeworks-external-credit.ts";

export type ExternalCreditBucketDisplayItem = {
  key: string;
  primaryLabel: string;
  rawCode: string;
  sourceRecord?: ExternalCreditRecord;
  secondaryText?: string;
};

export function buildExternalCreditAwareBucketItems({
  codes,
  externalCreditRecords,
  linkedCourseVerb,
}: {
  codes: string[];
  externalCreditRecords: ExternalCreditRecord[];
  linkedCourseVerb: "associated with" | "satisfies";
}): ExternalCreditBucketDisplayItem[] {
  const seen = new Set<string>();
  const items: ExternalCreditBucketDisplayItem[] = [];

  for (const code of codes) {
    const sourceRecord = findExternalCreditRecordForCode(
      externalCreditRecords,
      code,
    );
    const key = sourceRecord
      ? `external-${sourceRecord.sourceCode}-${sourceRecord.satisfiesCourseCode ?? ""}`
      : `code-${code}`;

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    items.push({
      key,
      primaryLabel: sourceRecord?.displayName ?? code,
      rawCode: code,
      ...(sourceRecord ? { sourceRecord } : {}),
      ...(sourceRecord?.satisfiesCourseCode
        ? { secondaryText: `${linkedCourseVerb} ${sourceRecord.satisfiesCourseCode}` }
        : {}),
    });
  }

  return items;
}

export function formatExternalCreditAwareCode({
  code,
  externalCreditRecords,
}: {
  code: string;
  externalCreditRecords: ExternalCreditRecord[];
}) {
  return findExternalCreditRecordForCode(externalCreditRecords, code)?.displayName ?? code;
}

export function findExternalCreditRecordForCode(
  records: ExternalCreditRecord[],
  code: string,
) {
  const normalizedCode = normalizeComparableCode(code);

  return records.find((record) => {
    const sourceCode = normalizeComparableCode(record.sourceCode);
    const satisfiesCourseCode = record.satisfiesCourseCode
      ? normalizeComparableCode(record.satisfiesCourseCode)
      : null;

    return normalizedCode === sourceCode || normalizedCode === satisfiesCourseCode;
  });
}

function normalizeComparableCode(code: string) {
  return code.replace(/\s+/g, "").toUpperCase();
}
