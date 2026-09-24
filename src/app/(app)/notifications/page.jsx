import { Suspense } from "react";
import { requireRole } from "@/server/auth";
import { getNotifications } from "@/server/dal/notifications";
import { NotificationsClient } from "./NotificationsClient";
import { NotificationListSkeleton } from "@/components/ui/skeletons";

export const metadata = {
  title: "Notifications - SocialNews",
};

async function NotificationsStream({ userId }) {
  const { notifications } = await getNotifications(userId, 40);
  return <NotificationsClient initialNotifications={notifications} />;
}

export default async function NotificationsPage() {
  const session = await requireRole("user");

  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-8">
      <Suspense fallback={<NotificationListSkeleton count={6} />}>
        <NotificationsStream userId={session.user.id} />
      </Suspense>
    </div>
  );
}
