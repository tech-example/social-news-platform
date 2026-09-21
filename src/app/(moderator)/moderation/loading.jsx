import { StatCardSkeleton, TableSkeleton, Skeleton } from "@/components/ui/skeletons";

export default function ModerationLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}
