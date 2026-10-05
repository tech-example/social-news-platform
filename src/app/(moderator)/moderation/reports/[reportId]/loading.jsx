import { Skeleton } from "@/components/ui/skeleton";

export default function ReportDetailLoading() {
  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">
      <div>
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--line)]">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] space-y-4">
            <Skeleton className="h-4 w-36" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] space-y-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
        <div>
          <div className="p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
