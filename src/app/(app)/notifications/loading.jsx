import { NotificationListSkeleton, Skeleton } from "@/components/ui/skeletons";

export default function NotificationsLoading() {
  return (
    <div className="max-w-[600px] mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-24" />
      </div>
      <NotificationListSkeleton count={7} />
    </div>
  );
}
