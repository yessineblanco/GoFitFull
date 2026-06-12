import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeExerciseImport,
  normalizeWorkoutImport,
  parseImportCSV,
  parseImportJSON,
} from "./import-parsers.ts";

test("parseImportCSV normalizes headers and preserves row values", () => {
  assert.deepEqual(parseImportCSV('Name,Muscle Groups\n"Push Up","Chest"'), [
    { name: "Push Up", muscle_groups: "Chest" },
  ]);
});

test("parseImportJSON accepts one object or an array and rejects invalid JSON", () => {
  assert.deepEqual(parseImportJSON('{"name":"Push Up"}'), [{ name: "Push Up" }]);
  assert.deepEqual(parseImportJSON('[{"name":"Push Up"}]'), [{ name: "Push Up" }]);
  assert.throws(() => parseImportJSON("{"), /Invalid JSON format/);
});

test("normalizeExerciseImport applies aliases, lists, and numeric defaults", () => {
  assert.deepEqual(
    normalizeExerciseImport({
      id: "ignored",
      name: "Push Up",
      muscleGroups: "Chest, Triceps",
      equipment: "Mat, Bodyweight",
      defaultSets: "4",
      defaultReps: "not-a-number",
      defaultRestTime: "45",
    }),
    {
      name: "Push Up",
      muscle_groups: ["Chest", "Triceps"],
      equipment: ["Mat", "Bodyweight"],
      default_sets: 4,
      default_reps: 10,
      default_rest_time: 45,
    }
  );
});

test("normalizeWorkoutImport parses exercise aliases and applies defaults", () => {
  assert.deepEqual(
    normalizeWorkoutImport({
      id: "ignored",
      name: "Full Body",
      imageUrl: "https://example.com/workout.jpg",
      exercises: JSON.stringify([
        { exerciseId: "exercise-1", default_sets: "4", restTime: "90" },
      ]),
    }),
    {
      name: "Full Body",
      image_url: "https://example.com/workout.jpg",
      exercises: [
        {
          exercise_id: "exercise-1",
          sets: 4,
          reps: "10",
          rest_time: 90,
          day: null,
          exercise_order: 0,
        },
      ],
      workout_type: "native",
    }
  );
});

test("normalizers reject missing names and invalid workout exercises", () => {
  assert.throws(() => normalizeExerciseImport({}), /Missing required field: name/);
  assert.throws(
    () => normalizeWorkoutImport({ name: "Workout", exercises: "invalid" }),
    /Invalid exercises format/
  );
});
