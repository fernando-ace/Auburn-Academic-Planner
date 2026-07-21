import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  getNodeMajor,
  isSupportedNodeRuntime,
  SUPPORTED_NODE_MAJOR,
} from "../src/lib/runtime-support.ts";

test("runtime support accepts only the release Node major", () => {
  assert.equal(SUPPORTED_NODE_MAJOR, 22);
  assert.equal(getNodeMajor("22.17.1"), 22);
  assert.equal(getNodeMajor("24.0.0"), 24);
  assert.equal(getNodeMajor("not-a-version"), null);
  assert.equal(isSupportedNodeRuntime("22.17.1"), true);
  assert.equal(isSupportedNodeRuntime("24.0.0"), false);
});

test("package engines match the runtime health and smoke contract", async () => {
  const [packageJson, packageLock] = (await Promise.all([
    readFile(path.resolve("package.json"), "utf8"),
    readFile(path.resolve("package-lock.json"), "utf8"),
  ])).map((contents) => JSON.parse(contents)) as [
    { engines?: { node?: string } },
    { packages?: { ""?: { engines?: { node?: string } } } },
  ];

  assert.equal(packageJson.engines?.node, "22.x");
  assert.equal(packageLock.packages?.[""]?.engines?.node, "22.x");
});
