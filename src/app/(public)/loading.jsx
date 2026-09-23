import { FeedSkeleton, SidebarSkeleton, Skeleton } from "@/components/ui/skeletons";

export default function HomeLoading() {
  return (
    <div className="flex justify-center gap-8 px-0 sm:px-4 py-0 sm:py-6">
      <div className="w-full max-w-[470px] shrink-0">
        {/* Feed Filter Tabs placeholder */}
        <div className="flex border-b border-[var(--line)] bg-[var(--bg)] mb-2">
          <div className="flex-1 py-3 flex justify-center">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex-1 py-3 flex justify-center">
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        <FeedSkeleton count={3} />
      </div>
      <aside className="hidden lg:flex flex-col w-[300px] shrink-0 pt-4 select-none">
        <SidebarSkeleton />
      </aside>
    </div>
  );
}
