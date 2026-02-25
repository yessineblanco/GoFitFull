"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Clock, Repeat } from "lucide-react";
import type { Workout, WorkoutExercise, Exercise } from "@/types/database";

type WorkoutWithExercises = Workout & {
  workout_exercises: (WorkoutExercise & {
    exercises: Exercise;
  })[];
};

interface WorkoutPreviewModalProps {
  workout: WorkoutWithExercises;
  open: boolean;
  onClose: () => void;
}

function getDifficultyBadgeColor(difficulty: string) {
  const colors: Record<string, string> = {
    Beginner: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    Intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    Advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return colors[difficulty] || "bg-gray-100 text-gray-800";
}

export default function WorkoutPreviewModal({
  workout,
  open,
  onClose,
}: WorkoutPreviewModalProps) {
  // Group exercises by day
  const exercisesByDay = workout.workout_exercises.reduce((acc, we) => {
    const day = we.day || 1;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(we);
    return {};
  }, {} as Record<number, typeof workout.workout_exercises>);

  const days = Object.keys(exercisesByDay)
    .map(Number)
    .sort((a, b) => a - b);
  const hasSplits = days.length > 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{workout.name}</DialogTitle>
          <DialogDescription>
            Preview of workout as users see it in the mobile app
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Image */}
          {workout.image_url ? (
            <img
              src={workout.image_url}
              alt={workout.name}
              className="w-full h-48 object-cover rounded-lg"
            />
          ) : (
            <div className="flex h-48 items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
              <Dumbbell className="h-20 w-20 text-primary/40" />
            </div>
          )}

          {/* Workout Info */}
          <div className="flex items-center gap-2">
            <Badge className={getDifficultyBadgeColor(workout.difficulty)}>
              {workout.difficulty}
            </Badge>
            <Badge variant="outline">
              {workout.workout_exercises.length} exercises
            </Badge>
            {hasSplits && (
              <Badge variant="outline">{days.length} day split</Badge>
            )}
          </div>

          {/* Exercises by Day */}
          {days.map((day) => {
            const dayExercises = exercisesByDay[day].sort(
              (a, b) => a.exercise_order - b.exercise_order
            );

            return (
              <div key={day} className="space-y-3">
                {hasSplits && (
                  <h3 className="text-lg font-bold border-b pb-2">
                    Day {day}
                  </h3>
                )}

                <div className="space-y-3">
                  {dayExercises.map((we, index) => (
                    <div
                      key={we.id}
                      className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      {/* Exercise Image */}
                      <div className="flex-shrink-0">
                        {we.exercises.image_url ? (
                          <img
                            src={we.exercises.image_url}
                            alt={we.exercises.name}
                            className="w-20 h-20 object-cover rounded-md"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center bg-muted rounded-md">
                            <Dumbbell className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Exercise Details */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                #{index + 1}
                              </span>
                              <h4 className="font-semibold">
                                {we.exercises.name}
                              </h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {we.exercises.category}
                            </p>
                          </div>
                        </div>

                        {/* Sets, Reps, Rest */}
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Dumbbell className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{we.sets}</span>
                            <span className="text-muted-foreground">sets</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Repeat className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{we.reps}</span>
                            <span className="text-muted-foreground">reps</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{we.rest_time}s</span>
                            <span className="text-muted-foreground">rest</span>
                          </div>
                        </div>

                        {/* Equipment */}
                        {we.exercises.equipment &&
                          we.exercises.equipment.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {we.exercises.equipment.map((eq) => (
                                <Badge
                                  key={eq}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {eq}
                                </Badge>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
