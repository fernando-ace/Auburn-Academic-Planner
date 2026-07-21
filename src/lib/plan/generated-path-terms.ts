type GeneratedPathTerm = {
  term: "Fall" | "Spring" | "Summer";
  year: number;
};

export function getDefaultGeneratedPathStartTerm(
  now = new Date(),
  includeSummer = false,
) {
  const { term, year } = defaultStartTerm(now, includeSummer);
  return `${term} ${year}`;
}

export function buildGeneratedPathStartTermOptions(
  now = new Date(),
  count = 12,
) {
  const options: string[] = [];
  let current = defaultStartTerm(now, true);

  for (let index = 0; index < Math.max(1, count); index += 1) {
    options.push(`${current.term} ${current.year}`);
    current = nextGeneratedPathTerm({ includeSummer: true, ...current });
  }

  return options;
}

export function normalizeGeneratedPathStartTerm(
  value?: string | null,
  includeSummer = true,
  now = new Date(),
) {
  const parsed = value
    ? parseGeneratedPathTerm(value, includeSummer, now)
    : defaultStartTerm(now, includeSummer);
  return `${parsed.term} ${parsed.year}`;
}

export function parseGeneratedPathTerm(
  value: string,
  includeSummer = true,
  now = new Date(),
): GeneratedPathTerm {
  const match = /\b(Fall|Spring|Summer)\s+(20\d{2})\b/i.exec(value);
  if (!match) {
    return defaultStartTerm(now, includeSummer);
  }

  const normalizedTerm = `${match[1][0]?.toUpperCase()}${match[1]
    .slice(1)
    .toLowerCase()}`;

  const term = normalizedTerm as GeneratedPathTerm["term"];
  return {
    term: term === "Summer" && !includeSummer ? "Fall" : term,
    year: Number(match[2]),
  };
}

export function nextGeneratedPathTerm({
  includeSummer,
  term,
  year,
}: GeneratedPathTerm & { includeSummer: boolean }): GeneratedPathTerm {
  if (term === "Fall") {
    return { term: "Spring", year: year + 1 };
  }

  if (term === "Spring") {
    return includeSummer ? { term: "Summer", year } : { term: "Fall", year };
  }

  return { term: "Fall", year };
}

function defaultStartTerm(
  now: Date,
  includeSummer: boolean,
): GeneratedPathTerm {
  const year = now.getFullYear();
  const month = now.getMonth();

  if (month <= 3) {
    return includeSummer
      ? { term: "Summer", year }
      : { term: "Fall", year };
  }

  if (month <= 7) {
    return { term: "Fall", year };
  }

  return { term: "Spring", year: year + 1 };
}
