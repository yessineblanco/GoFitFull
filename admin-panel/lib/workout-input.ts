import { z } from "zod";

const exerciseSchema = z.object({
  exercise_id: z.uuid(),
  sets: z.number().int().positive().default(3),
  reps: z.string().trim().min(1).default("10"),
  rest_time: z.number().int().nonnegative().default(60),
  // Older callers sent null for a single-day workout. Store it as day 1.
  day: z.number().int().min(1).max(7).nullish().transform((day) => day ?? 1),
  exercise_order: z.number().int().nonnegative().optional(),
});

export const workoutInputSchema = z.object({
  name: z.string().trim().min(1),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
  image_url: z.string().nullable().optional(),
  workout_type: z.literal("native").optional(),
  exercises: z.array(exerciseSchema).min(1),
}).superRefine((workout, ctx) => {
  const seen = new Set<string>();
  workout.exercises.forEach((exercise, index) => {
    const key = `${exercise.day}:${exercise.exercise_id}`;
    if (seen.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["exercises", index, "exercise_id"],
        message: "An exercise can appear only once per day",
      });
    }
    seen.add(key);
  });
});
