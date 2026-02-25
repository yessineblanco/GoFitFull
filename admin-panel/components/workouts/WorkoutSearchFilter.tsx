"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Dumbbell, Copy, Eye } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Workout, WorkoutExercise, Exercise } from "@/types/database";
import { DeleteWorkoutButton } from "@/components/workouts/DeleteWorkoutButton";
import { BulkDeleteButton } from "@/components/workouts/BulkDeleteButton";
import { ExportWorkoutsButton } from "@/components/workouts/ExportWorkoutsButton";
import DuplicateWorkoutButton from "@/components/workouts/DuplicateWorkoutButton";
import WorkoutPreviewModal from "@/components/workouts/WorkoutPreviewModal";
import { EmptySearchState } from "@/components/ui/empty-state";

type WorkoutWithExercises = Workout & {
  workout_exercises: (WorkoutExercise & {
    exercises: Exercise;
  })[];
};

interface WorkoutSearchFilterProps {
  workouts: WorkoutWithExercises[];
}

function getDifficultyBadgeColor(difficulty: string) {
  const colors: Record<string, string> = {
    Beginner: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    Intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    Advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return colors[difficulty] || "bg-gray-100 text-gray-800";
}

export default function WorkoutSearchFilter({
  workouts,
}: WorkoutSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const clearFilters = () => {
    setSearchQuery("");
    setDifficultyFilter("all");
    setSortBy("newest");
  };
  const [previewWorkout, setPreviewWorkout] = useState<WorkoutWithExercises | null>(null);

  // Filter and sort workouts
  const filteredAndSortedWorkouts = useMemo(() => {
    let filtered = [...workouts];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((workout) =>
        workout.name.toLowerCase().includes(query)
      );
    }

    // Apply difficulty filter
    if (difficultyFilter !== "all") {
      filtered = filtered.filter(
        (workout) => workout.difficulty === difficultyFilter
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [workouts, searchQuery, difficultyFilter, sortBy]);

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedWorkouts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedWorkouts.map((w) => w.id)));
    }
  };

  const handleBulkDelete = () => {
    setSelectedIds(new Set());
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search workouts..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Difficulty Filter */}
              <Select
                value={difficultyFilter}
                onValueChange={(value: any) => setDifficultyFilter(value)}
              >
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select
                value={sortBy}
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results count and bulk actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-muted-foreground">
              Showing {filteredAndSortedWorkouts.length} of {workouts.length} workouts
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.size} selected
                  </span>
                  <BulkDeleteButton
                    selectedIds={Array.from(selectedIds)}
                    onDelete={handleBulkDelete}
                  />
                </>
              )}
              <ExportWorkoutsButton workouts={filteredAndSortedWorkouts} />
            </div>
          </div>
          {filteredAndSortedWorkouts.length > 0 && (
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                checked={
                  filteredAndSortedWorkouts.length > 0 &&
                  selectedIds.size === filteredAndSortedWorkouts.length
                }
                onCheckedChange={toggleSelectAll}
                aria-label="Select all workouts"
              />
              <span className="text-sm text-muted-foreground">
                Select all
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Workouts Grid */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedWorkouts.length === 0 ? (
              <div className="col-span-full">
                <EmptySearchState 
                  searchQuery={searchQuery}
                  onClear={clearFilters}
                />
              </div>
            ) : (
              filteredAndSortedWorkouts.map((workout) => {
                const exerciseCount = workout.workout_exercises?.length || 0;
                const hasSplits = workout.workout_exercises?.some(
                  (we) => we.day && we.day > 1
                );
                const days = hasSplits
                  ? [
                      ...new Set(
                        workout.workout_exercises.map((we) => we.day)
                      ),
                    ].filter(Boolean).length
                  : 1;

                return (
                  <Card key={workout.id} className="overflow-hidden card-hover stagger-item relative">
                    <div className="absolute top-3 left-3 z-10">
                      <Checkbox
                        checked={selectedIds.has(workout.id)}
                        onCheckedChange={() => toggleSelect(workout.id)}
                        aria-label={`Select ${workout.name}`}
                        className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm"
                      />
                    </div>
                    {workout.image_url ? (
                      <img
                        src={workout.image_url}
                        alt={workout.name}
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <Dumbbell className="h-16 w-16 text-primary/40" />
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="space-y-2">
                        <h3 className="font-bold text-lg line-clamp-1">
                          {workout.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={getDifficultyBadgeColor(workout.difficulty)}
                          >
                            {workout.difficulty}
                          </Badge>
                          {hasSplits && (
                            <Badge variant="outline">
                              {days} day split
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          {exerciseCount} exercise
                          {exerciseCount !== 1 ? "s" : ""}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewWorkout(workout)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </Button>
                          <Link href={`/workouts/${workout.id}`}>
                            <Button variant="outline" size="sm" className="w-full">
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                          </Link>
                        </div>
                        <div className="flex gap-2">
                          <DuplicateWorkoutButton
                            workoutId={workout.id}
                            workoutName={workout.name}
                          />
                          <DeleteWorkoutButton
                            workoutId={workout.id}
                            workoutName={workout.name}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewWorkout && (
        <WorkoutPreviewModal
          workout={previewWorkout}
          open={!!previewWorkout}
          onClose={() => setPreviewWorkout(null)}
        />
      )}
    </>
  );
}
