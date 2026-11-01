"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PostImage } from "@/components/ui/post-image";
import useSWR from "swr";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/format";
import {
  Inbox,
  CheckCheck,
  Trash2,
  Heart,
  MessageCircle,
  UserPlus,
  Repeat2,
  Newspaper,
  ShieldAlert,
  ShieldCheck,
  Bell,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  deleteNotificationAction,
  markAllReadAction,
  clearAllNotificationsAction,
} from "@/server/actions/notifications";
import { getActorProfileAction } from "@/server/actions/profile";
import { IconButton } from "@/components/ui/icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getDisplayName } from "@/lib/user";

const fetcher = (url) => fetch(url).then((r) => r.json());

function getNotificationTypeIcon(type) {
  switch (type) {
    case "like":
      return <Heart size={14} className="text-rose-500 fill-rose-500" aria-hidden="true" />;
    case "comment":
      return <MessageCircle size={14} className="text-blue-500 fill-blue-500/20" aria-hidden="true" />;
    case "follow":
      return <UserPlus size={14} className="text-purple-500" aria-hidden="true" />;
    case "share":
      return <Repeat2 size={14} className="text-emerald-500" aria-hidden="true" />;
    case "new_post":
      return <Newspaper size={14} className="text-amber-500" aria-hidden="true" />;
    case "moderation":
      return <ShieldAlert size={14} className="text-orange-500" aria-hidden="true" />;
    case "report_update":
      return <ShieldCheck size={14} className="text-green-500" aria-hidden="true" />;
    default:
      return <Bell size={14} className="text-[var(--accent)]" aria-hidden="true" />;
  }
}

export function NotificationsClient({ initialNotifications = [], userId }) {
  const { addToast } = useToast();
  const [markingRead, setMarkingRead] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [cachedActors, setCachedActors] = useState({});

  const { data, mutate } = useSWR("/api/notifications?limit=40", fetcher, {
    fallbackData: { notifications: initialNotifications, unreadCount: 0 },
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });

  const rawNotifications = data?.notifications || initialNotifications;

  // Deduplicate notifications by ID (handles Realtime + SWR duplicates)
  const notifications = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const n of rawNotifications) {
      if (n?.id && !seen.has(n.id)) {
        seen.add(n.id);
        result.push(n);
      }
    }
    return result;
  }, [rawNotifications]);

  const unreadCount = data?.unreadCount ?? 0;

  // Client-side cache: if any notification arrives without actor joined (e.g. Realtime INSERT),
  // fetch its actor profile and cache it by ID
  useEffect(() => {
    const missingActorIds = notifications
      .filter((n) => !n.actor && n.actorId && !cachedActors[n.actorId])
      .map((n) => n.actorId);

    if (missingActorIds.length > 0) {
      const uniqueMissing = [...new Set(missingActorIds)];
      uniqueMissing.forEach(async (actorId) => {
        try {
          const profile = await getActorProfileAction(actorId);
          if (profile) {
            setCachedActors((prev) => ({ ...prev, [actorId]: profile }));
          }
        } catch (err) {
          console.error("Failed to fetch actor profile for notification:", err);
        }
      });
    }
  }, [notifications, cachedActors]);

  const handleMarkAllRead = async () => {
    setMarkingRead(true);

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
        mutate();
        addToast(res.error || "Failed to mark all as read.", "error");
      }
    } catch (err) {
      console.error(err);
      mutate();
      addToast("Failed to mark all as read.", "error");
    } finally {
      setMarkingRead(false);
    }
  };

  const handleClearAll = async () => {
    setClearingAll(true);

    try {
      const res = await clearAllNotificationsAction();
      if (res.ok) {
        setShowClearConfirm(false);
        mutate(
          { ...data, notifications: [], unreadCount: 0 },
          false
        );
        addToast("All notifications cleared.");
      } else {
        addToast(res.error || "Failed to clear notifications.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Failed to clear notifications.", "error");
    } finally {
      setClearingAll(false);
    }
  };

  const handleDelete = async (notificationId) => {
    const previousNotifications = notifications;
    const previousUnread = unreadCount;
    const target = notifications.find((n) => n.id === notificationId);

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
        mutate({ ...data, notifications: previousNotifications, unreadCount: previousUnread }, false);
        addToast(res.error || "Failed to delete notification.", "error");
      } else {
        addToast("Notification deleted.");
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
      mutate({ ...data, notifications: previousNotifications, unreadCount: previousUnread }, false);
      addToast("Failed to delete notification.", "error");
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
    const actor = n.actor || (n.actorId ? cachedActors[n.actorId] : null);
    if (n.type === "follow" && actor?.username) return `/u/${actor.username}`;
    if (n.type === "moderation" && n.reportId) return `/moderation/reports/${n.reportId}`;
    if (n.type === "moderation") return "/moderation/reports";
    return null;
  };

  const renderSentence = (n) => {
    const actor = n.actor || (n.actorId ? cachedActors[n.actorId] : null);
    const actorName = getDisplayName(actor);

    const actorLink = actor?.username ? (
      <Link
        href={`/u/${actor.username}`}
        onClick={(e) => e.stopPropagation()}
        className="font-bold text-[var(--ink)] hover:underline"
      >
        {actorName}
      </Link>
    ) : (
      <strong className="font-bold text-[var(--ink)]">{actorName}</strong>
    );

    switch (n.type) {
      case "like":
        return <span>{actorLink} liked your post</span>;
      case "comment":
        return <span>{actorLink} commented on your post</span>;
      case "follow":
        return <span>{actorLink} started following you</span>;
      case "share":
        return <span>{actorLink} shared your post</span>;
      case "new_post":
        return <span>{actorLink} published a new post</span>;
      case "moderation":
        return <span>{actorLink} submitted a report requiring attention</span>;
      case "report_update":
        return <span>Your submitted report status was updated</span>;
      default:
        return <span>New activity from {actorLink}</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] min-h-[44px]">
        <h1 className="text-xl font-bold text-[var(--ink)]">Notifications</h1>
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <IconButton
              label="Mark all as read"
              onClick={handleMarkAllRead}
              disabled={markingRead || unreadCount === 0}
              className="cursor-pointer hover:bg-[var(--surface-strong)] transition-colors disabled:cursor-not-allowed"
            >
              <CheckCheck
                size={24}
                strokeWidth={1.75}
                aria-hidden="true"
                className={unreadCount > 0 ? "text-[var(--ink-muted)] hover:text-[var(--ink)]" : "text-[var(--ink-muted)] opacity-50"}
              />
            </IconButton>
            <IconButton
              label="Clear all notifications"
              onClick={() => setShowClearConfirm(true)}
              disabled={clearingAll}
              className="cursor-pointer hover:bg-[var(--danger)]/10 transition-colors disabled:cursor-not-allowed"
            >
              <Trash2 size={24} strokeWidth={1.75} aria-hidden="true" className="text-[var(--danger)]/80 hover:text-[var(--danger)]" />
            </IconButton>
          </div>
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
          {notifications.map((n) => {
            const actor = n.actor || (n.actorId ? cachedActors[n.actorId] : null);
            const actorName = getDisplayName(actor);

            return (
              <div
                key={n.id}
                className={`flex items-center justify-between p-3.5 hover:bg-[var(--surface)] transition-colors rounded-lg gap-3 ${
                  !n.isRead ? "bg-[var(--accent-soft)]/20" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    {actor?.username ? (
                      <Link href={`/u/${actor.username}`} className="shrink-0 block">
                        <Avatar
                          src={actor.avatar_url || actor.avatarUrl}
                          name={actorName}
                          size={40}
                        />
                      </Link>
                    ) : (
                      <Avatar
                        src={actor?.avatar_url || actor?.avatarUrl}
                        name={actorName}
                        size={40}
                      />
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-[var(--bg)] rounded-full p-0.5 border border-[var(--line)] shadow-xs flex items-center justify-center">
                      {getNotificationTypeIcon(n.type)}
                    </div>
                  </div>

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
                      <PostImage
                        src={n.post.imageUrl}
                        thumbnailSrc={n.post.thumbnailUrl}
                        alt="Post thumbnail"
                        fill
                        className="object-cover"
                        useThumbnail
                        fallbackText=""
                      />
                    </Link>
                  )}

                  {!n.isRead && (
                    <span
                      className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0"
                      aria-label="Unread notification"
                    />
                  )}

                  <IconButton
                    label="Delete notification"
                    onClick={() => handleDelete(n.id)}
                    className="text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                  >
                    <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Clear all notifications?"
        description="This action cannot be undone. This will permanently delete all your notifications."
        confirmLabel="Clear all"
        cancelLabel="Cancel"
        destructive={true}
        loading={clearingAll}
        onConfirm={handleClearAll}
      />
    </div>
  );
}
