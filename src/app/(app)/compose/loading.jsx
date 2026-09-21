import { Skeleton } from "@/components/ui/skeleton";

export default function ComposeLoading() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-36" />
      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-6 shadow-xs space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="flex justify-between items-center pt-3 border-t border-[var(--line)]">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
