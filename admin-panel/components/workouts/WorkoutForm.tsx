"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X, GripVertical, ChevronDown } from "lucide-react";
import type { Exercise, Workout, WorkoutExercise } from "@/types/database";

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;

interface WorkoutExerciseConfig {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  rest_time: number;
  day: number;
  exercise_order: number;
}

interface WorkoutFormProps {
  workout?: Workout;
  workoutExercises?: (WorkoutExercise & { exercises: Exercise })[];
  isEditing?: boolean;
}

export function WorkoutForm({ workout, workoutExercises, isEditing = false }: WorkoutFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Form state
  const [name, setName] = useState(workout?.name || "");
  const [difficulty, setDifficulty] = useState<typeof DIFFICULTIES[number]>(
    workout?.difficulty === "Custom" ? "Beginner" : (workout?.difficulty as typeof DIFFICULTIES[number]) || "Beginner"
  );
  const [imageUrl, setImageUrl] = useState(workout?.image_url || "");
  const [isSplit, setIsSplit] = useState(false);
  const [numDays, setNumDays] = useState(1);
  const [selectedExercises, setSelectedExercises] = useState<WorkoutExerciseConfig[]>([]);

  // Load exercises
  useEffect(() => {
    async function loadExercises() {
      try {
        const response = await fetch("/api/exercises");
        if (response.ok) {
          const data = await response.json();
          setExercises(data.data || []);
        }
      } catch (error) {
        console.error("Failed to load exercises:", error);
      }
    }
    loadExercises();

    // Load existing workout exercises if editing
    if (isEditing && workoutExercises) {
      const days = workoutExercises.map((we) => we.day || 1);
      const maxDay = Math.max(...days);
      if (maxDay > 1) {
        setIsSplit(true);
        setNumDays(maxDay);
      }

      const configs: WorkoutExerciseConfig[] = workoutExercises.map((we) => ({
        exercise_id: we.exercise_id,
        exercise_name: we.exercises.name,
        sets: we.sets,
        reps: we.reps,
        rest_time: we.rest_time,
        day: we.day || 1,
        exercise_order: we.exercise_order,
      }));
      setSelectedExercises(configs);
    }
  }, [isEditing, workoutExercises]);

  const addExercise = (day: number) => {
    if (selectedExercises.length === 0 || selectedExercises[0].exercise_id) {
      setSelectedExercises([
        ...selectedExercises,
        {
          exercise_id: "",
          exercise_name: "",
          sets: 3,
          reps: "10",
          rest_time: 60,
          day,
          exercise_order: selectedExercises.filter((e) => e.day === day).length,
        },
      ]);
    }
  };

  const removeExercise = (index: number) => {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof WorkoutExerciseConfig, value: any) => {
    const updated = [...selectedExercises];
    updated[index] = { ...updated[index], [field]: value };

    // If exercise_id changed, update exercise_name
    if (field === "exercise_id") {
      const exercise = exercises.find((e) => e.id === value);
      if (exercise) {
        updated[index].exercise_name = exercise.name;
        updated[index].sets = exercise.default_sets || 3;
        updated[index].reps = exercise.default_reps?.toString() || "10";
        updated[index].rest_time = exercise.default_rest_time || 60;
      }
    }

    setSelectedExercises(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Validation
      if (!name.trim()) {
        throw new Error("Workout name is required");
      }
      if (selectedExercises.length === 0) {
        throw new Error("At least one exercise is required");
      }
      if (selectedExercises.some((e) => !e.exercise_id)) {
        throw new Error("Please select all exercises");
      }

      const payload = {
        name: name.trim(),
        difficulty,
        image_url: imageUrl.trim() || null,
        workout_type: "native" as const,
        exercises: selectedExercises.map((e, index) => ({
          exercise_id: e.exercise_id,
          sets: e.sets,
          reps: e.reps,
          rest_time: e.rest_time,
          day: isSplit ? e.day : null,
          exercise_order: index,
        })),
      };

      const url = isEditing ? `/api/workouts/${workout?.id}` : "/api/workouts";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save workout");
      }

      router.push("/workouts");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const renderDayExercises = (day: number) => {
    const dayExercises = selectedExercises.filter((e) => e.day === day);

    return (
      <div key={day} className="space-y-4">
        {isSplit && (
          <h3 className="text-lg font-semibold">Day {day}</h3>
        )}

        {dayExercises.map((exerciseConfig, index) => {
          const globalIndex = selectedExercises.indexOf(exerciseConfig);
          return (
            <div key={globalIndex} className="flex gap-2 items-start p-4 border rounded-lg">
              <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />

              <div className="flex-1 space-y-3">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Exercise</Label>
                    <select
                      value={exerciseConfig.exercise_id}
                      onChange={(e) => updateExercise(globalIndex, "exercise_id", e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select exercise...</option>
                      {exercises.map((exercise) => (
                        <option key={exercise.id} value={exercise.id}>
                          {exercise.name} ({exercise.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label>Sets</Label>
                      <Input
                        type="number"
                        min="1"
                        value={exerciseConfig.sets}
                        onChange={(e) =>
                          updateExercise(globalIndex, "sets", parseInt(e.target.value) || 1)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Reps</Label>
                      <Input
                        value={exerciseConfig.reps}
                        onChange={(e) => updateExercise(globalIndex, "reps", e.target.value)}
                        placeholder="10 or 12,10,8"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Rest (s)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={exerciseConfig.rest_time}
                        onChange={(e) =>
                          updateExercise(globalIndex, "rest_time", parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeExercise(globalIndex)}
                className="text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          onClick={() => addExercise(day)}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Exercise to Day {day}
        </Button>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      {/* Basic Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">
            Workout Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Push Pull Legs"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
        </div>
      </div>

      {/* Difficulty */}
      <div className="space-y-2">
        <Label>
          Difficulty <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-2">
          {DIFFICULTIES.map((diff) => (
            <Button
              key={diff}
              type="button"
              variant={difficulty === diff ? "default" : "outline"}
              onClick={() => setDifficulty(diff)}
            >
              {diff}
            </Button>
          ))}
        </div>
      </div>

      {/* Workout Split */}
      <div className="space-y-2">
        <Label>Workout Type</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={!isSplit ? "default" : "outline"}
            onClick={() => {
              setIsSplit(false);
              setNumDays(1);
              setSelectedExercises(selectedExercises.map((e) => ({ ...e, day: 1 })));
            }}
          >
            Single Day
          </Button>
          <Button
            type="button"
            variant={isSplit ? "default" : "outline"}
            onClick={() => setIsSplit(true)}
          >
            Multi-Day Split
          </Button>
        </div>
      </div>

      {isSplit && (
        <div className="space-y-2">
          <Label htmlFor="numDays">Number of Days</Label>
          <select
            id="numDays"
            value={numDays}
            onChange={(e) => setNumDays(parseInt(e.target.value))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm max-w-xs"
          >
            {[2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n} days
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Exercises */}
      <div className="space-y-4">
        <Label>
          Exercises <span className="text-red-500">*</span>
        </Label>

        {isSplit ? (
          <div className="space-y-6">
            {Array.from({ length: numDays }, (_, i) => i + 1).map((day) =>
              renderDayExercises(day)
            )}
          </div>
        ) : (
          renderDayExercises(1)
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Workout" : "Create Workout"}
        </Button>
        <Link href="/workouts">
          <Button type="button" variant="outline" disabled={isLoading}>
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}
