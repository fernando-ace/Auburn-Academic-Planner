import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDegreeWorksPlanAiCertificateAnswer,
  isDegreeWorksPlanAiCertificateQuestion,
} from "../src/lib/ai-certificate-plan-answer.ts";
import type { IncomingMessage } from "../src/lib/gemini-rag.ts";

function userMessage(content: string): IncomingMessage[] {
  return [{ role: "user", content }];
}

test("detects Degree Works Plan Sample AI certificate questions", () => {
  assert.equal(
    isDegreeWorksPlanAiCertificateQuestion(
      userMessage(
        "Do the courses in the Degree Works Plan Sample count toward the Artificial Intelligence Engineering certificate?",
      ),
    ),
    true,
  );
});

test("detects questions about courses in my plan counting toward the AI certificate", () => {
  assert.equal(
    isDegreeWorksPlanAiCertificateQuestion(
      userMessage("Which courses in my plan count toward the AI certificate?"),
    ),
    true,
  );
});

test("does not detect unrelated AI certificate questions", () => {
  assert.equal(
    isDegreeWorksPlanAiCertificateQuestion(
      userMessage("What are the AI Engineering certificate requirements?"),
    ),
    false,
  );
});

test("builds deterministic Degree Works Plan Sample certificate answer", () => {
  const result = buildDegreeWorksPlanAiCertificateAnswer([
    {
      title: "Degree Works Plan Sample",
      fileName: "degreeworks-plan-sample.pdf",
    },
  ]);

  assert.equal(result.confidence, "High");
  assert.equal(result.sources.length, 1);
  assert.match(result.answer, /Required courses satisfied: .*COMP 5600/);
  assert.match(result.answer, /Required courses missing: none\./);
  assert.match(result.answer, /Elective candidates found: .*COMP 5610/);
  assert.match(result.answer, /Likely complete: yes\./);
  assert.match(result.answer, /Advisor verification required: yes\./);
  assert.match(result.advisorVerificationNote, /Advisor verification required/);
});
