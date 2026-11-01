import "server-only";
import { createUserClient } from "@/server/supabase";

export async function getNotifications(userId, limit = 30, cursor = null) {
  if (!userId) return { notifications: [], nextCursor: null };
  const supabase = await createUserClient();

  let query = supabase
    .from("notifications")
    .select(`
      id,
      recipient_id,
      actor_id,
      type,
      post_id,
      comment_id,
      report_id,
      read_at,
      created_at,
      actor:profiles!notifications_actor_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      ),
      post:posts(
        id,
        title,
        image_url
      )
    `)
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error || !data) return { notifications: [], nextCursor: null };

  const notifications = data.map((n) => ({
    id: n.id,
    type: n.type,
    actorId: n.actor_id,
    actor: n.actor
      ? {
          id: n.actor.id,
          username: n.actor.username,
          displayName: n.actor.display_name,
          display_name: n.actor.display_name,
          avatarUrl: n.actor.avatar_url,
          avatar_url: n.actor.avatar_url,
        }
      : null,
    isRead: !!n.read_at,
    readAt: n.read_at,
    createdAt: n.created_at,
    post: n.post
      ? {
          id: n.post.id,
          title: n.post.title,
          imageUrl: n.post.image_url,
          thumbnailUrl: n.post.image_url?.includes("-full.webp")
            ? n.post.image_url.replace("-full.webp", "-thumb.webp")
            : n.post.image_url,
        }
      : null,
    commentId: n.comment_id,
    reportId: n.report_id,
  }));

  const nextCursor =
    notifications.length === limit
      ? notifications[notifications.length - 1].createdAt
      : null;

  return { notifications, nextCursor };
}

export async function getUnreadNotificationCount(userId) {
  if (!userId) return 0;
  const supabase = await createUserClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);

  if (error) return 0;
  return count || 0;
}
