"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WorkoutCompletionRate } from "@/lib/analytics";
import { CheckCircle2 } from "lucide-react";

interface WorkoutCompletionCardProps {
  workouts: WorkoutCompletionRate[];
}

export default function WorkoutCompletionCard({
  workouts,
}: WorkoutCompletionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle2 className="h-4 w-4" />
          Workout Completion Rates
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {workouts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No workout session data available
            </p>
          ) : (
            workouts.map((workout) => (
              <div key={workout.workout_id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{workout.workout_name}</span>
                  <span className="text-muted-foreground">
                    {workout.completed_sessions}/{workout.total_sessions} (
                    {Math.round(workout.completion_rate)}%)
                  </span>
                </div>
                <Progress value={workout.completion_rate} className="h-2" />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
