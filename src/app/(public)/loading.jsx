import { FeedSkeleton, SidebarSkeleton } from "@/components/ui/skeletons";

export default function HomeLoading() {
  return (
    <div className="flex justify-center gap-8 px-0 sm:px-4 py-0 sm:py-6">
      <div className="w-full max-w-[470px] shrink-0">
        <FeedSkeleton count={3} />
      </div>
      <aside className="hidden lg:flex flex-col w-[300px] shrink-0 pt-4 select-none">
        <SidebarSkeleton />
      </aside>
    </div>
  );
}
