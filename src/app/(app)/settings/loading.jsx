import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-6 shadow-xs space-y-6">
        <Skeleton className="h-5 w-32" />

        {/* Avatar row */}
        <div className="flex items-center gap-4 pb-4 border-b border-[var(--line)]">
          <Skeleton className="w-16 h-16 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[var(--line)]">
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
