import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default function UsersLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-[150px] bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-[250px] bg-muted animate-pulse rounded" />
        </div>
      </div>
      <TableSkeleton rows={8} columns={5} />
    </div>
  );
}
