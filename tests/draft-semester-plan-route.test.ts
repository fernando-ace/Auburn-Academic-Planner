import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../src/app/api/plan/draft-semester-plan/route.ts";

test("POST builds a normalized deterministic draft semester plan", async () => {
  const response = await POST(
    new Request("http://localhost/api/plan/draft-semester-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseCodes: ["comp 1210", "COMP   1210"],
        targetPath: "software_engineering",
        maxCreditsPerSemester: 6,
        maxSemesters: 2,
      }),
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.targetPath, "software_engineering");
  assert.ok(result.semesters.length <= 2);
  assert.ok(
    result.semesters.every(
      (semester: { estimatedCredits: number }) => semester.estimatedCredits <= 6,
    ),
  );
});

test("POST defaults target path and settings", async () => {
  const response = await POST(
    new Request("http://localhost/api/plan/draft-semester-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseCodes: ["COMP 5130", "COMP 5600"] }),
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.match(
    result.targetPath,
    /^(software_engineering|computer_science|ai_certificate|mixed_or_unclear)$/,
  );
  assert.ok(Array.isArray(result.semesters));
});

test("POST rejects invalid settings", async () => {
  const response = await POST(
    new Request("http://localhost/api/plan/draft-semester-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseCodes: ["COMP 1210"],
        targetPath: "unsupported",
        maxCreditsPerSemester: 0,
      }),
    }),
  );

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /targetPath/);
});
