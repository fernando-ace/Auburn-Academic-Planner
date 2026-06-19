import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { checkProjectSourceIntegrity } from "../src/lib/sources/source-integrity-filesystem.ts";

const projectRoot = process.cwd();
const checkedAt = "2026-06-19T12:00:00.000Z";

test("source integrity passes on current checked-in sources", () => {
  const result = checkProjectSourceIntegrity({ projectRoot, checkedAt });

  assert.equal(result.status, "pass");
  assert.equal(result.warnings.length, 0);
  assert.deepEqual(result.missingFiles, []);
  assert.deepEqual(result.driftFindings, []);
});

test("detects a missing provenance source file", () => {
  withFixture((fixtureRoot) => {
    rmSync(path.join(fixtureRoot, "sources/auburn/software-engineering-bulletin.html"));

    const result = checkProjectSourceIntegrity({ projectRoot: fixtureRoot, checkedAt });

    assert.equal(result.status, "fail");
    assert.ok(result.missingFiles.includes("sources/auburn/software-engineering-bulletin.html"));
  });
});

test("detects a catalog year mismatch", () => {
  withFixture((fixtureRoot) => {
    updateJson(fixtureRoot, "rules/auburn/computer-science-degree.json", (rule) => {
      const provenance = rule.provenance as Record<string, unknown>;
      provenance.catalogYear = "2024-2025";
    });

    const result = checkProjectSourceIntegrity({ projectRoot: fixtureRoot, checkedAt });

    assert.equal(result.status, "fail");
    assert.ok(result.catalogYearMismatches.some((mismatch) => mismatch.ruleFile.endsWith("computer-science-degree.json")));
  });
});

test("detects a source ID mismatch", () => {
  withFixture((fixtureRoot) => {
    updateJson(fixtureRoot, "rules/auburn/ai-engineering-certificate.json", (rule) => {
      rule.sourceId = "wrong-ai-source";
    });

    const result = checkProjectSourceIntegrity({ projectRoot: fixtureRoot, checkedAt });

    assert.equal(result.status, "fail");
    assert.ok(result.sourceIdMismatches.some((mismatch) => mismatch.ruleFile.endsWith("ai-engineering-certificate.json")));
  });
});

test("detects an exact rule course missing from local source text", () => {
  withFixture((fixtureRoot) => {
    const sourcePath = path.join(fixtureRoot, "sources/auburn/software-engineering-bulletin.html");
    writeFileSync(sourcePath, readFileSync(sourcePath, "utf8").replaceAll("5700", "5799"));

    const result = checkProjectSourceIntegrity({ projectRoot: fixtureRoot, checkedAt });
    const finding = result.driftFindings.find((candidate) => candidate.ruleFile.endsWith("software-engineering-degree.json"));

    assert.equal(result.status, "fail");
    assert.ok(finding?.missingCourseCodes.includes("COMP 5700"));
  });
});

test("AI certificate drift check finds required courses and credit-hour evidence", () => {
  const result = checkProjectSourceIntegrity({ projectRoot, checkedAt });
  const finding = result.driftFindings.find((candidate) => candidate.ruleFile.endsWith("ai-engineering-certificate.json"));

  assert.equal(finding, undefined);
  assert.equal(result.status, "pass");
});

function withFixture(run: (fixtureRoot: string) => void) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "auburn-source-integrity-"));
  try {
    cpSync(path.join(projectRoot, "sources"), path.join(fixtureRoot, "sources"), { recursive: true });
    cpSync(path.join(projectRoot, "rules"), path.join(fixtureRoot, "rules"), { recursive: true });
    run(fixtureRoot);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function updateJson(
  fixtureRoot: string,
  relativePath: string,
  update: (value: Record<string, unknown>) => void,
) {
  const filePath = path.join(fixtureRoot, relativePath);
  const value = JSON.parse(readFileSync(filePath, "utf8"));
  update(value);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
