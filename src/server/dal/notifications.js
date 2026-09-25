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
    isRead: !!n.read_at,
    readAt: n.read_at,
    createdAt: n.created_at,
    actor: n.actor,
    post: n.post,
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
