export type ImportRecord = Record<string, unknown>;

const EXERCISE_FIELD_MAPPING: Record<string, string> = {
  id: "id",
  name: "name",
  category: "category",
  difficulty: "difficulty",
  muscle_groups: "muscle_groups",
  musclegroups: "muscle_groups",
  equipment: "equipment",
  image_url: "image_url",
  imageurl: "image_url",
  video_url: "video_url",
  videourl: "video_url",
  instructions: "instructions",
  default_sets: "default_sets",
  defaultsets: "default_sets",
  default_reps: "default_reps",
  defaultreps: "default_reps",
  default_rest_time: "default_rest_time",
  defaultresttime: "default_rest_time",
};

const WORKOUT_FIELD_MAPPING: Record<string, string> = {
  id: "id",
  name: "name",
  difficulty: "difficulty",
  image_url: "image_url",
  imageurl: "image_url",
  exercises: "exercises",
  workout_type: "workout_type",
};

function asRecord(value: unknown): ImportRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid item format (must be an object)");
  }

  return value as ImportRecord;
}

function mapFields(data: unknown, mapping: Record<string, string>): ImportRecord {
  const input = asRecord(data);
  const normalized: ImportRecord = {};

  for (const [key, value] of Object.entries(input)) {
    const normalizedKey = key.toLowerCase();
    normalized[mapping[normalizedKey] || normalizedKey] = value;
  }

  return normalized;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseInteger(value: unknown, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number.parseInt(String(value), 10);
  return parsed || fallback;
}

function firstTruthy(record: ImportRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key]) return record[key];
  }

  return undefined;
}

export function parseImportCSV(csvText: string): ImportRecord[] {
  const lines = csvText.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0]
    .split(",")
    .map((header) => header.trim().replace(/"/g, ""));

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim().replace(/"/g, ""));
    const record: ImportRecord = {};

    headers.forEach((header, index) => {
      record[header.toLowerCase().replace(/\s+/g, "_")] = values[index] || "";
    });

    return record;
  });
}

export function parseImportJSON(jsonText: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(jsonText);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    throw new Error("Invalid JSON format");
  }
}

export function normalizeExerciseImport(data: unknown): ImportRecord {
  const normalized = mapFields(data, EXERCISE_FIELD_MAPPING);

  if (!normalized.name) {
    throw new Error("Missing required field: name");
  }

  if (typeof normalized.muscle_groups === "string") {
    normalized.muscle_groups = splitList(normalized.muscle_groups);
  }
  if (typeof normalized.equipment === "string") {
    normalized.equipment = splitList(normalized.equipment);
  }
  if (typeof normalized.default_sets === "string") {
    normalized.default_sets = parseInteger(normalized.default_sets, 3);
  }
  if (typeof normalized.default_reps === "string") {
    normalized.default_reps = parseInteger(normalized.default_reps, 10);
  }
  if (typeof normalized.default_rest_time === "string") {
    normalized.default_rest_time = parseInteger(normalized.default_rest_time, 60);
  }

  delete normalized.id;
  return normalized;
}

export function normalizeWorkoutImport(data: unknown): ImportRecord {
  const normalized = mapFields(data, WORKOUT_FIELD_MAPPING);

  if (!normalized.name) {
    throw new Error("Missing required field: name");
  }

  let exercises = normalized.exercises;
  if (!Array.isArray(exercises)) {
    if (typeof exercises !== "string") {
      throw new Error("Missing or invalid exercises field (must be an array)");
    }

    try {
      exercises = JSON.parse(exercises) as unknown;
    } catch {
      throw new Error("Invalid exercises format (must be an array)");
    }
  }

  if (!Array.isArray(exercises)) {
    throw new Error("Invalid exercises format (must be an array)");
  }

  normalized.exercises = exercises.map((exercise, index) => {
    const input = asRecord(exercise);
    return {
      exercise_id: firstTruthy(input, ["exercise_id", "id", "exerciseId"]),
      sets: parseInteger(firstTruthy(input, ["sets", "default_sets"]), 3),
      reps: String(firstTruthy(input, ["reps", "default_reps"]) || "10"),
      rest_time: parseInteger(
        firstTruthy(input, ["rest_time", "default_rest_time", "restTime"]),
        60
      ),
      day: input.day || null,
      exercise_order:
        input.exercise_order !== undefined ? input.exercise_order : index,
    };
  });

  delete normalized.id;
  normalized.workout_type = "native";
  return normalized;
}
