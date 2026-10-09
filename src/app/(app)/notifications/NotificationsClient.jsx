"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format";
import { Inbox, CheckCheck, Trash2, FileText } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { deleteNotificationAction, markAllReadAction, clearAllNotificationsAction } from "@/server/actions/notifications";
import { createClient } from "@/utils/supabase/client";
import { IconButton } from "@/components/ui/icon-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const fetcher = (url) => fetch(url).then((r) => r.json());
const supabase = createClient();

export function NotificationsClient({ initialNotifications = [], userId }) {
  const { addToast } = useToast();
  const [markingRead, setMarkingRead] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const { data, mutate } = useSWR("/api/notifications?limit=40", fetcher, {
    fallbackData: { notifications: initialNotifications, unreadCount: 0 },
    refreshInterval: 0, // Disable SWR polling since we are using Realtime
  });

  const notifications = data?.notifications || initialNotifications;
  const unreadCount = data?.unreadCount || 0;

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, (payload) => {
        mutate((prev) => {
          if (!prev) return prev;
          if ((prev.notifications || []).some((n) => n.id === payload.new.id)) {
            return prev;
          }
          
          // Trigger a background refetch to get the missing related data (actor, post)
          setTimeout(() => mutate(), 50);

          return {
            ...prev,
            notifications: [payload.new, ...(prev.notifications || [])],
            unreadCount: (prev.unreadCount || 0) + 1
          };
        }, false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, mutate]);

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    
    // Optimistic UI update
    mutate(
      (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          notifications: (prev.notifications || []).map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        };
      },
      false
    );

    try {
      const res = await markAllReadAction();
      if (res.ok) {
        addToast("All notifications marked as read.");
      } else {
        mutate(); // Rollback on failure
        addToast(res.error || "Failed to mark all as read.");
      }
    } catch (err) {
      console.error(err);
      mutate();
      addToast("Failed to mark all as read.");
    } finally {
      setMarkingRead(false);
    }
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    setShowClearConfirm(false);
    
    const previousData = data;
    
    // Optimistic UI update
    mutate(
      { ...data, notifications: [], unreadCount: 0 },
      false
    );

    try {
      const res = await clearAllNotificationsAction();
      if (res.ok) {
        addToast("All notifications cleared.");
      } else {
        mutate(previousData, false); // Rollback on failure
        addToast(res.error || "Failed to clear notifications.");
      }
    } catch (err) {
      console.error(err);
      mutate(previousData, false);
      addToast("Failed to clear notifications.");
    } finally {
      setClearingAll(false);
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

  const markAsRead = async (notificationId) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId }),
      });
      mutate(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            notifications: (prev.notifications || []).map((n) =>
              n.id === notificationId ? { ...n, isRead: true } : n
            ),
            unreadCount: Math.max(0, (prev.unreadCount || 1) - 1),
          };
        },
        false
      );
    } catch {
      // Ignore background error
    }
  };

  const getNotificationLink = (n) => {
    if (n.post?.id) return `/p/${n.post.id}`;
    if (n.type === "follow" && n.actor?.username) return `/u/${n.actor.username}`;
    if (n.type === "moderation") return "/moderation";
    return null;
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
      case "new_post":
        return <span><strong>{actorName}</strong> shared a new post.</span>;
      case "moderation":
        return <span>A moderation update requires attention.</span>;
      default:
        return <span>You have a new activity notification.</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] min-h-[44px]">
        <h1 className="text-xl font-bold text-[var(--ink)]">Notifications</h1>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <IconButton
              label="Mark all as read"
              onClick={handleMarkAllRead}
              disabled={markingRead}
            >
              <CheckCheck size={24} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)] hover:text-[var(--ink)]" />
            </IconButton>
          )}
          {notifications.length > 0 && (
            <IconButton
              label="Clear all notifications"
              onClick={() => setShowClearConfirm(true)}
              disabled={clearingAll}
            >
              <Trash2 size={24} strokeWidth={1.75} aria-hidden="true" className="text-[var(--danger)]/80 hover:text-[var(--danger)]" />
            </IconButton>
          )}
        </div>
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
                  {getNotificationLink(n) ? (
                    <Link
                      href={getNotificationLink(n)}
                      onClick={() => !n.isRead && markAsRead(n.id)}
                      className="text-[var(--ink)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded"
                    >
                      {renderSentence(n)}
                    </Link>
                  ) : (
                    <div className="text-[var(--ink)]">{renderSentence(n)}</div>
                  )}
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

      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm} title="Clear all notifications?">
        <DialogContent>
          <p className="text-sm text-[var(--ink)]">
            This action cannot be undone. This will permanently delete all your notifications.
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowClearConfirm(false)} disabled={clearingAll}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleClearAll} disabled={clearingAll}>
            Clear all
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
