import { requireRole } from "@/server/auth";
import { getNotifications } from "@/server/dal/notifications";
import { NotificationsClient } from "./NotificationsClient";

export const metadata = {
  title: "Notifications - SocialNews",
};

export default async function NotificationsPage() {
  const session = await requireRole("user");
  const { notifications } = await getNotifications(session.user.id, 40);

  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-8">
      <NotificationsClient initialNotifications={notifications} />
    </div>
  );
}
