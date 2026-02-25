"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Edit, Dumbbell, Filter, X } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";
import type { Exercise } from "@/types/database";
import { DeleteExerciseButton } from "@/components/exercises/DeleteExerciseButton";
import { BulkDeleteButton } from "@/components/exercises/BulkDeleteButton";
import { ExportExercisesButton } from "@/components/exercises/ExportExercisesButton";
import { ImportExercisesButton } from "@/components/exercises/ImportExercisesButton";
import { EmptySearchState } from "@/components/ui/empty-state";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ExerciseSearchFilterProps {
  exercises: Exercise[];
}

function getCategoryBadgeColor(category: string) {
  const colors: Record<string, string> = {
    Chest: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    Back: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    Legs: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    Shoulders: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    Arms: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    Core: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    Cardio: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
    Fullbody: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  };
  return colors[category] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
}

function getDifficultyBadgeColor(difficulty: string) {
  const colors: Record<string, string> = {
    Beginner: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    Intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    Advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return colors[difficulty] || "bg-gray-100 text-gray-800";
}

export default function ExerciseSearchFilter({
  exercises,
}: ExerciseSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "difficulty" | "category" | "created">("name");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set());
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setDifficultyFilter("all");
    setSortBy("name");
    setDateRange(undefined);
    setSelectedEquipment(new Set());
    setSelectedMuscleGroups(new Set());
  };

  // Get unique categories from exercises
  const categories = useMemo(() => {
    const cats = new Set(exercises.map((e) => e.category));
    return Array.from(cats).sort();
  }, [exercises]);

  // Get unique equipment from exercises
  const allEquipment = useMemo(() => {
    const equipmentSet = new Set<string>();
    exercises.forEach((e) => {
      e.equipment?.forEach((eq) => equipmentSet.add(eq));
    });
    return Array.from(equipmentSet).sort();
  }, [exercises]);

  // Get unique muscle groups from exercises
  const allMuscleGroups = useMemo(() => {
    const muscleSet = new Set<string>();
    exercises.forEach((e) => {
      e.muscle_groups?.forEach((mg) => muscleSet.add(mg));
    });
    return Array.from(muscleSet).sort();
  }, [exercises]);

  // Filter and sort exercises
  const filteredAndSortedExercises = useMemo(() => {
    let filtered = [...exercises];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (exercise) =>
          exercise.name.toLowerCase().includes(query) ||
          exercise.category.toLowerCase().includes(query) ||
          exercise.muscle_groups?.some((mg) =>
            mg.toLowerCase().includes(query)
          )
      );
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (exercise) => exercise.category === categoryFilter
      );
    }

    // Apply difficulty filter
    if (difficultyFilter !== "all") {
      filtered = filtered.filter(
        (exercise) => exercise.difficulty === difficultyFilter
      );
    }

    // Apply date range filter
    if (dateRange?.from) {
      filtered = filtered.filter((exercise) => {
        if (!exercise.created_at) return false;
        const createdDate = new Date(exercise.created_at);
        const fromDate = dateRange.from!;
        const toDate = dateRange.to || dateRange.from!;
        return createdDate >= fromDate && createdDate <= toDate;
      });
    }

    // Apply equipment filter
    if (selectedEquipment.size > 0) {
      filtered = filtered.filter((exercise) => {
        if (!exercise.equipment || exercise.equipment.length === 0) return false;
        return Array.from(selectedEquipment).some((eq) =>
          exercise.equipment!.includes(eq)
        );
      });
    }

    // Apply muscle groups filter
    if (selectedMuscleGroups.size > 0) {
      filtered = filtered.filter((exercise) => {
        if (!exercise.muscle_groups || exercise.muscle_groups.length === 0) return false;
        return Array.from(selectedMuscleGroups).some((mg) =>
          exercise.muscle_groups!.includes(mg)
        );
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "difficulty":
          const diffOrder = { Beginner: 1, Intermediate: 2, Advanced: 3 };
          return (
            (diffOrder[a.difficulty as keyof typeof diffOrder] || 0) -
            (diffOrder[b.difficulty as keyof typeof diffOrder] || 0)
          );
        case "category":
          return a.category.localeCompare(b.category);
        case "created":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [exercises, searchQuery, categoryFilter, difficultyFilter, sortBy, dateRange, selectedEquipment, selectedMuscleGroups]);

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
    if (selectedIds.size === filteredAndSortedExercises.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedExercises.map((e) => e.id)));
    }
  };

  const handleBulkDelete = () => {
    setSelectedIds(new Set());
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>All Exercises ({filteredAndSortedExercises.length})</CardTitle>
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
              <ImportExercisesButton />
              <ExportExercisesButton exercises={filteredAndSortedExercises} />
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <Select
              value={categoryFilter}
              onValueChange={(value: any) => setCategoryFilter(value)}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="difficulty">Difficulty</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="created">Newest First</SelectItem>
              </SelectContent>
            </Select>

            {/* Advanced Filters Toggle */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Advanced
              {(dateRange || selectedEquipment.size > 0 || selectedMuscleGroups.size > 0) && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {(dateRange ? 1 : 0) + selectedEquipment.size + selectedMuscleGroups.size}
                </Badge>
              )}
            </Button>
          </div>

          {/* Advanced Filters */}
          <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <CollapsibleContent className="space-y-4 pt-4 border-t">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Created Date</label>
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                </div>

                {/* Equipment Multi-Select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Equipment</label>
                  <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                    {allEquipment.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No equipment available</p>
                    ) : (
                      <div className="space-y-2">
                        {allEquipment.map((eq) => (
                          <div key={eq} className="flex items-center space-x-2">
                            <Checkbox
                              id={`equipment-${eq}`}
                              checked={selectedEquipment.has(eq)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedEquipment);
                                if (checked) {
                                  newSet.add(eq);
                                } else {
                                  newSet.delete(eq);
                                }
                                setSelectedEquipment(newSet);
                              }}
                            />
                            <label
                              htmlFor={`equipment-${eq}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {eq}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Muscle Groups Multi-Select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Muscle Groups</label>
                  <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                    {allMuscleGroups.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No muscle groups available</p>
                    ) : (
                      <div className="space-y-2">
                        {allMuscleGroups.map((mg) => (
                          <div key={mg} className="flex items-center space-x-2">
                            <Checkbox
                              id={`muscle-${mg}`}
                              checked={selectedMuscleGroups.has(mg)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedMuscleGroups);
                                if (checked) {
                                  newSet.add(mg);
                                } else {
                                  newSet.delete(mg);
                                }
                                setSelectedMuscleGroups(newSet);
                              }}
                            />
                            <label
                              htmlFor={`muscle-${mg}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {mg}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Clear Advanced Filters */}
              {(dateRange || selectedEquipment.size > 0 || selectedMuscleGroups.size > 0) && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateRange(undefined);
                      setSelectedEquipment(new Set());
                      setSelectedMuscleGroups(new Set());
                    }}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear Advanced Filters
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Results count */}
          {(searchQuery || categoryFilter !== "all" || difficultyFilter !== "all") && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredAndSortedExercises.length} of {exercises.length} exercises
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium w-12">
                  <Checkbox
                    checked={
                      filteredAndSortedExercises.length > 0 &&
                      selectedIds.size === filteredAndSortedExercises.length
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all exercises"
                  />
                </th>
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium">Exercise</th>
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium">Category</th>
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium hidden md:table-cell">Muscle Groups</th>
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium">Difficulty</th>
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium hidden lg:table-cell">Equipment</th>
                <th className="p-3 sm:p-4 text-right text-xs sm:text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedExercises.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptySearchState 
                      searchQuery={searchQuery}
                      onClear={clearFilters}
                    />
                  </td>
                </tr>
              ) : (
                filteredAndSortedExercises.map((exercise) => (
                  <tr key={exercise.id} className="border-b table-row-hover stagger-item">
                    <td className="p-3 sm:p-4">
                      <Checkbox
                        checked={selectedIds.has(exercise.id)}
                        onCheckedChange={() => toggleSelect(exercise.id)}
                        aria-label={`Select ${exercise.name}`}
                      />
                    </td>
                    <td className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        {exercise.image_url ? (
                          <img
                            src={exercise.image_url}
                            alt={exercise.name}
                            className="h-8 w-8 sm:h-10 sm:w-10 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded bg-muted flex-shrink-0">
                            <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-sm sm:text-base truncate">{exercise.name}</div>
                          {exercise.default_sets && (
                            <div className="text-xs text-muted-foreground">
                              {exercise.default_sets} × {exercise.default_reps} reps
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 sm:p-4">
                      <Badge
                        className={getCategoryBadgeColor(exercise.category)}
                      >
                        {exercise.category}
                      </Badge>
                    </td>
                    <td className="p-3 sm:p-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {exercise.muscle_groups?.slice(0, 2).map((muscle) => (
                          <Badge
                            key={muscle}
                            variant="secondary"
                            className="text-xs"
                          >
                            {muscle}
                          </Badge>
                        ))}
                        {exercise.muscle_groups && exercise.muscle_groups.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{exercise.muscle_groups.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4">
                      <Badge
                        className={getDifficultyBadgeColor(exercise.difficulty)}
                      >
                        {exercise.difficulty}
                      </Badge>
                    </td>
                    <td className="p-3 sm:p-4 hidden lg:table-cell">
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {exercise.equipment && exercise.equipment.length > 0
                          ? exercise.equipment.join(", ")
                          : "None"}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <Link href={`/exercises/${exercise.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3">
                            <Edit className="h-4 w-4" />
                            <span className="hidden sm:inline ml-2">Edit</span>
                          </Button>
                        </Link>
                        <DeleteExerciseButton
                          exerciseId={exercise.id}
                          exerciseName={exercise.name}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
