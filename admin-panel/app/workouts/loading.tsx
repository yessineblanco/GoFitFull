import { Skeleton } from "@/components/ui/skeleton";
import { WorkoutCardsGridSkeleton } from "@/components/skeletons/WorkoutCardSkeleton";

export default function WorkoutsLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-[200px] mb-2" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <Skeleton className="h-10 w-[140px]" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[160px]" />
        <Skeleton className="h-10 w-[140px]" />
      </div>

      {/* Workout Cards Grid */}
      <WorkoutCardsGridSkeleton count={6} />
    </div>
  );
}
