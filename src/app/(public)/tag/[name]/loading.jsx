import { FeedSkeleton, Skeleton } from "@/components/ui/skeletons";

export default function TagLoading() {
  return (
    <div className="max-w-[470px] mx-auto px-4 py-6 space-y-4">
      {/* Tag Header Skeleton */}
      <div className="flex items-center gap-3 p-4 bg-[var(--surface)] border border-[var(--line)] rounded-xl">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      </div>

      {/* Feed Column */}
      <FeedSkeleton count={3} />
    </div>
  );
}
