import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { checkProjectSourceIntegrity } from "../src/lib/sources/source-integrity-filesystem.ts";

const projectRoot = process.cwd();
const checkedAt = "2026-06-21T12:00:00.000Z";

test("source integrity passes on curated checked-in sources", () => {
  const result = checkProjectSourceIntegrity({ projectRoot, checkedAt });

  assert.equal(result.status, "pass");
  assert.equal(result.warnings.length, 0);
  assert.deepEqual(result.missingFiles, []);
  assert.deepEqual(result.driftFindings, []);
});

test("detects a missing curated source file", () => {
  withFixture((fixtureRoot) => {
    rmSync(
      path.join(
        fixtureRoot,
        "sources/auburn/curated/auburn-registrar-degreeworks.html",
      ),
    );

    const result = checkProjectSourceIntegrity({ projectRoot: fixtureRoot, checkedAt });

    assert.equal(result.status, "fail");
    assert.ok(
      result.errors.some((error) =>
        error.includes("auburn-registrar-degreeworks.html"),
      ),
    );
  });
});

test("detects curated manifest size drift", () => {
  withFixture((fixtureRoot) => {
    writeFileSync(
      path.join(fixtureRoot, "sources/auburn/curated/manifest.json"),
      "[]\n",
    );

    const result = checkProjectSourceIntegrity({ projectRoot: fixtureRoot, checkedAt });

    assert.equal(result.status, "fail");
    assert.ok(
      result.errors.some((error) => error.includes("exactly 7 curated sources")),
    );
  });
});

function withFixture(run: (fixtureRoot: string) => void) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "auburn-source-integrity-"));
  try {
    cpSync(path.join(projectRoot, "sources"), path.join(fixtureRoot, "sources"), {
      recursive: true,
    });
    run(fixtureRoot);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}
