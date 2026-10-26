import assert from "node:assert/strict";
import test from "node:test";
import { workoutInputSchema } from "./workout-input.ts";

const exerciseId = "00000000-0000-4000-8000-000000000001";
const input = (exercise = {}) => ({
  name: " QA workout ",
  exercises: [{ exercise_id: exerciseId, ...exercise }],
});

test("single-day input normalizes omitted/null day to 1 and preserves zero rest", () => {
  for (const day of [undefined, null, 1]) {
    const parsed = workoutInputSchema.parse(input({ day, rest_time: 0 }));
    assert.equal(parsed.name, "QA workout");
    assert.equal(parsed.exercises[0].day, 1);
    assert.equal(parsed.exercises[0].rest_time, 0);
  }
});

test("invalid prescriptions and malformed exercises are rejected before saving", () => {
  for (const exercise of [
    { day: 0 }, { day: 8 }, { day: 1.5 }, { sets: 0 },
    { rest_time: -1 }, { reps: " " }, { exercise_id: "invalid" },
  ]) {
    assert.equal(workoutInputSchema.safeParse(input(exercise)).success, false);
  }
  for (const exercises of [[], null, "invalid"]) {
    assert.equal(workoutInputSchema.safeParse({ name: "QA", exercises }).success, false);
  }
  assert.equal(workoutInputSchema.safeParse({ ...input(), name: " " }).success, false);
});

test("duplicate exercises on one day are rejected; different days are allowed", () => {
  const workout = input();
  workout.exercises.push({ exercise_id: exerciseId, day: 1 });
  assert.equal(workoutInputSchema.safeParse(workout).success, false);
  workout.exercises[1].day = 2;
  assert.equal(workoutInputSchema.safeParse(workout).success, true);
});

test("admin save accepts native workouts only", () => {
  assert.equal(workoutInputSchema.safeParse({ ...input(), workout_type: "custom" }).success, false);
});
