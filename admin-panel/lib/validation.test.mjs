import assert from "node:assert/strict";
import test from "node:test";

import {
  validateEmail,
  validateExerciseName,
  validateNumberRange,
  validateRequired,
  validateRestTime,
  validateSetsReps,
  validateUrl,
  validateWorkoutName,
} from "./validation.ts";

test("email validation rejects empty and malformed values", () => {
  assert.deepEqual(validateEmail(""), {
    isValid: false,
    error: "Email is required",
  });
  assert.equal(validateEmail("invalid@example").isValid, false);
  assert.deepEqual(validateEmail("coach@example.com"), { isValid: true });
});

test("required and name validation reject whitespace and boundary violations", () => {
  assert.equal(validateRequired("   ", "Name").isValid, false);
  assert.equal(validateExerciseName("A").isValid, false);
  assert.equal(validateExerciseName("A".repeat(101)).isValid, false);
  assert.deepEqual(validateExerciseName("Squat"), { isValid: true });
  assert.deepEqual(validateWorkoutName("Strength Day"), { isValid: true });
});

test("numeric validators accept inclusive limits and reject out-of-range values", () => {
  assert.deepEqual(validateNumberRange(1, 1, 10, "Value"), { isValid: true });
  assert.deepEqual(validateNumberRange(10, 1, 10, "Value"), { isValid: true });
  assert.equal(validateNumberRange(0, 1, 10, "Value").isValid, false);
  assert.equal(validateSetsReps(1001, "Reps").isValid, false);
  assert.deepEqual(validateRestTime(0), { isValid: true });
  assert.equal(validateRestTime(601).isValid, false);
});

test("optional URLs remain optional while malformed URLs are rejected", () => {
  assert.deepEqual(validateUrl(undefined, "Video URL"), { isValid: true });
  assert.deepEqual(validateUrl("https://example.com/video", "Video URL"), {
    isValid: true,
  });
  assert.equal(validateUrl("not a url", "Video URL").isValid, false);
});
