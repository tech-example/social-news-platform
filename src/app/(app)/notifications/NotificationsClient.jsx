"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format";
import { Inbox, CheckCheck, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { deleteNotificationAction } from "@/server/actions/notifications";

const fetcher = (url) => fetch(url).then((r) => r.json());

export function NotificationsClient({ initialNotifications = [] }) {
  const { addToast } = useToast();
  const [markingRead, setMarkingRead] = useState(false);

  const { data, mutate } = useSWR("/api/notifications?limit=40", fetcher, {
    fallbackData: { notifications: initialNotifications, unreadCount: 0 },
    refreshInterval: 30000,
  });

  const notifications = data?.notifications || initialNotifications;
  const unreadCount = data?.unreadCount || 0;

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    try {
      const res = await fetch("/api/notifications", { method: "POST" });
      if (res.ok) {
        addToast("All notifications marked as read.");
        mutate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingRead(false);
    }
  };

  const handleDelete = async (notificationId) => {
    const previousNotifications = notifications;
    const previousUnread = unreadCount;
    const target = notifications.find((n) => n.id === notificationId);

    // Optimistic UI removal
    mutate(
      {
        ...data,
        notifications: notifications.filter((n) => n.id !== notificationId),
        unreadCount: target && !target.isRead ? Math.max(0, unreadCount - 1) : unreadCount,
      },
      false
    );

    try {
      const res = await deleteNotificationAction(notificationId);
      if (!res.ok) {
        // Rollback on failure
        mutate({ ...data, notifications: previousNotifications, unreadCount: previousUnread }, false);
        addToast(res.error || "Failed to delete notification.");
      } else {
        addToast("Notification deleted.");
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
      // Rollback on failure
      mutate({ ...data, notifications: previousNotifications, unreadCount: previousUnread }, false);
      addToast("Failed to delete notification.");
    }
  };

  const renderSentence = (n) => {
    const actorName = n.actor?.display_name || n.actor?.username || "Someone";
    switch (n.type) {
      case "like":
        return <span><strong>{actorName}</strong> liked your post.</span>;
      case "comment":
        return <span><strong>{actorName}</strong> commented on your post.</span>;
      case "follow":
        return <span><strong>{actorName}</strong> started following you.</span>;
      case "share":
        return <span><strong>{actorName}</strong> shared your post.</span>;
      case "report_update":
        return <span>Your submitted report status was updated.</span>;
      case "moderation":
        return <span>A moderation update requires attention.</span>;
      default:
        return <span>You have a new activity notification.</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
        <h1 className="text-xl font-bold text-[var(--ink)]">Notifications</h1>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            onClick={handleMarkAllRead}
            disabled={markingRead}
            className="text-xs h-8 px-3"
          >
            <CheckCheck size={14} strokeWidth={1.75} aria-hidden="true" className="mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <Inbox size={40} strokeWidth={1.5} className="text-[var(--ink-muted)]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--ink)]">No notifications yet</p>
          <p className="text-xs text-[var(--ink-muted)]">
            When people like, comment, follow, or share your posts, you will see them here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--line)]">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-center justify-between p-3.5 hover:bg-[var(--surface)] transition-colors rounded-lg gap-3 ${
                !n.isRead ? "bg-[var(--accent-soft)]/20" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {n.actor ? (
                  <Link href={`/u/${n.actor.username}`} className="shrink-0">
                    <Avatar
                      src={n.actor.avatar_url}
                      name={n.actor.display_name || n.actor.username}
                      size={40}
                    />
                  </Link>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-strong)] shrink-0" />
                )}

                <div className="text-sm leading-snug break-words">
                  <div className="text-[var(--ink)]">{renderSentence(n)}</div>
                  <div className="text-xs text-[var(--ink-muted)] mt-0.5" suppressHydrationWarning>
                    {formatRelativeTime(n.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {n.post?.imageUrl && (
                  <Link href={`/p/${n.post.id}`} className="relative w-10 h-10 rounded overflow-hidden border border-[var(--line)]">
                    <Image
                      src={n.post.imageUrl}
                      alt="Post thumbnail"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </Link>
                )}

                {!n.isRead && (
                  <span
                    className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0"
                    aria-label="Unread notification"
                  />
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(n.id)}
                  aria-label="Delete notification"
                  className="p-1.5 rounded-md text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] cursor-pointer"
                >
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
