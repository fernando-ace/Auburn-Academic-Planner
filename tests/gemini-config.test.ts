import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  DEFAULT_GEMINI_MODEL,
  getGeminiModel,
} from "../src/lib/gemini-config.ts";

const originalModel = process.env.GEMINI_MODEL;

afterEach(() => {
  if (originalModel === undefined) {
    delete process.env.GEMINI_MODEL;
    return;
  }

  process.env.GEMINI_MODEL = originalModel;
});

test("Gemini defaults to the supported stable File Search model", () => {
  delete process.env.GEMINI_MODEL;

  assert.equal(DEFAULT_GEMINI_MODEL, "gemini-3.5-flash");
  assert.equal(getGeminiModel(), "gemini-3.5-flash");
});

test("Gemini model can be overridden explicitly", () => {
  process.env.GEMINI_MODEL = "custom-model";

  assert.equal(getGeminiModel(), "custom-model");
});
