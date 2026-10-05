import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/skeletons";

export default function ReportsQueueLoading() {
  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--line)]">
        <div>
          <Skeleton className="h-3 w-28 mb-2" />
          <Skeleton className="h-7 w-44 mb-1" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-4 w-28" />
      </div>

      <div className="flex gap-1.5 p-1 bg-[var(--surface)] border border-[var(--line)] rounded-lg">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-18" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-20" />
      </div>

      <TableSkeleton rows={8} cols={7} standalone={true} />
    </div>
  );
}
