import { DashboardSkeleton, Skeleton } from "@/components/ui/skeletons";

export default function AdminLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <DashboardSkeleton />
    </div>
  );
}
