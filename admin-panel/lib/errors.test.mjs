import assert from "node:assert/strict";
import test from "node:test";

import { getErrorMessage } from "./errors.ts";

test("getErrorMessage accepts Error instances and structural API errors", () => {
  assert.equal(getErrorMessage(new Error("failed"), "fallback"), "failed");
  assert.equal(getErrorMessage({ message: "denied" }, "fallback"), "denied");
});

test("getErrorMessage falls back for missing or invalid messages", () => {
  assert.equal(getErrorMessage({ message: "" }, "fallback"), "fallback");
  assert.equal(getErrorMessage({ message: 500 }, "fallback"), "fallback");
  assert.equal(getErrorMessage("failed", "fallback"), "fallback");
  assert.equal(getErrorMessage(null, "fallback"), "fallback");
});
