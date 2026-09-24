import { ProfileGridSkeleton, Skeleton } from "@/components/ui/skeletons";

export default function ExploreLoading() {
  return (
    <div className="max-w-[935px] mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4">
      <div className="flex items-center justify-between px-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
        <ProfileGridSkeleton count={9} />
      </div>
    </div>
  );
}
