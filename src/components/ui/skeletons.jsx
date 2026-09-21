import { Skeleton } from "./skeleton";

export { Skeleton };

export function PostCardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading post..."
      className="border-b border-[var(--line)] bg-[var(--bg)] py-4 flex flex-col gap-3 max-w-[470px] w-full mx-auto"
    >
      {/* Header */}
      <div className="flex items-center px-4 gap-3">
        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>

      {/* Media or Body Block */}
      <Skeleton className="w-full aspect-4/5 max-h-[420px] rounded-none sm:rounded-sm" />

      {/* Content & Actions */}
      <div className="px-4 space-y-2 mt-1">
        <div className="flex items-center gap-3 py-1">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 3 }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading feed..."
      className="flex flex-col w-full max-w-[470px] mx-auto divide-y divide-[var(--line)]"
    >
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading profile..."
      className="bg-[var(--bg)] border border-[var(--line)] rounded-2xl p-6 sm:p-8 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10">
        <Skeleton className="w-24 h-24 sm:w-32 sm:h-32 rounded-full shrink-0" />
        <div className="flex-1 space-y-4 w-full flex flex-col items-center sm:items-start">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <div className="flex items-center gap-6 sm:gap-8">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-1.5 w-full max-w-sm flex flex-col items-center sm:items-start">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileGridSkeleton({ count = 9 }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading posts grid..."
      className="grid grid-cols-3 gap-1.5 sm:gap-4 p-3 sm:p-6"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg w-full" />
      ))}
    </div>
  );
}

export function CommentItemSkeleton() {
  return (
    <div className="flex items-start gap-3 py-2">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  );
}

export function CommentThreadSkeleton({ count = 4 }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading comments..."
      className="space-y-3 py-2"
    >
      {Array.from({ length: count }).map((_, i) => (
        <CommentItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function NotificationItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-3.5 border-b border-[var(--line)] bg-[var(--bg)]">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="space-y-1.5 flex-1 max-w-md">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <Skeleton className="w-10 h-10 rounded shrink-0 ml-2" />
    </div>
  );
}

export function NotificationListSkeleton({ count = 6 }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading notifications..."
      className="divide-y divide-[var(--line)] bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs"
    >
      {Array.from({ length: count }).map((_, i) => (
        <NotificationItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs space-y-3"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-6 w-6 rounded-md" />
      </div>
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function ChartSkeleton({ height = 280 }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading chart..."
      style={{ height }}
      className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-5 flex flex-col justify-between shadow-xs"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3.5 w-20" />
      </div>
      <div className="flex items-end justify-between gap-3 h-40 pt-4 px-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${20 + (i * 12) % 75}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between pt-2 border-t border-[var(--line)]">
        <Skeleton className="h-2.5 w-12" />
        <Skeleton className="h-2.5 w-12" />
        <Skeleton className="h-2.5 w-12" />
      </div>
    </div>
  );
}

export function BarListSkeleton({ count = 5 }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs space-y-3"
    >
      <Skeleton className="h-4 w-32 mb-4" />
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 4 }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading table data..."
      className="w-full overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs"
    >
      {/* Header row */}
      <div className="flex items-center gap-4 p-4 border-b border-[var(--line)] bg-[var(--surface)]">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Body rows */}
      <div className="divide-y divide-[var(--line)]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 p-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportCardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="p-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs space-y-3"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3.5 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading sidebar..."
      className="flex flex-col gap-6 w-[300px]"
    >
      {/* Current user mini card */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-full shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      {/* Suggested users */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-12" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            </div>
            <Skeleton className="h-6 w-14 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading dashboard..."
      className="space-y-6"
    >
      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton height={300} />
        <ChartSkeleton height={300} />
      </div>

      {/* Table section */}
      <TableSkeleton rows={5} cols={4} />
    </div>
  );
}

export function PostDetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading post details..."
      className="max-w-[935px] mx-auto px-4 py-4 sm:py-6"
    >
      <Skeleton className="h-5 w-24 mb-4" />
      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs flex flex-col md:flex-row min-h-[500px]">
        {/* Left media block */}
        <Skeleton className="flex-1 min-h-[350px] md:min-h-[500px] rounded-none" />

        {/* Right column */}
        <div className="w-full md:w-[380px] shrink-0 p-4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-[var(--line)] space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--line)]">
            <Skeleton className="w-9 h-9 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
            <div className="pt-4">
              <CommentThreadSkeleton count={3} />
            </div>
          </div>
          <div className="pt-3 border-t border-[var(--line)] space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
