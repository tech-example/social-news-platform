import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="max-w-[600px] mx-auto px-4 py-6 space-y-6">
      {/* Search Bar Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 flex-1 rounded-xl" />
        <Skeleton className="h-11 w-20 rounded-xl" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-4 border-b border-[var(--line)] pb-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
      </div>

      {/* Results Skeletons */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-[var(--bg)] border border-[var(--line)] rounded-xl">
            <Skeleton className="w-11 h-11 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-18 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
