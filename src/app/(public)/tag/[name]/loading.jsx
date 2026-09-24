import { FeedSkeleton, Skeleton } from "@/components/ui/skeletons";

export default function TagLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading tag feed..."
      className="max-w-[600px] mx-auto px-4 py-4 sm:py-6 space-y-5"
    >
      {/* Back button */}
      <div>
        <Skeleton className="h-5 w-24 rounded" />
      </div>

      {/* Search & popular tags placeholder */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </div>

      {/* Tag Header Skeleton */}
      <div className="flex items-center gap-3.5 pb-4 border-b border-[var(--line)]">
        <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-36 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
        </div>
      </div>

      {/* Feed Column - child items with standalone=false */}
      <FeedSkeleton count={3} standalone={false} />
    </div>
  );
}
