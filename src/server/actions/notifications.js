"use server";
import { getSession } from "@/server/auth";
import { createUserClient } from "@/server/supabase";

export async function deleteNotificationAction(notificationId) {
  const session = await getSession();
  if (!session?.user) {
    return { ok: false, error: "Please sign in to delete notifications." };
  }

  if (!notificationId) {
    return { ok: false, error: "Invalid notification ID." };
  }

  const supabase = await createUserClient();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("recipient_id", session.user.id);

  if (error) {
    console.error("deleteNotificationAction error:", error);
    return { ok: false, error: error.message || "Failed to delete notification." };
  }

  return { ok: true };
}

export async function clearAllNotificationsAction() {
  const session = await getSession();
  if (!session?.user) {
    return { ok: false, error: "Please sign in to clear notifications." };
  }

  const supabase = await createUserClient();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("recipient_id", session.user.id);

  if (error) {
    console.error("clearAllNotificationsAction error:", error);
    return { ok: false, error: error.message || "Failed to clear notifications." };
  }

  return { ok: true };
}

export async function markAllReadAction() {
  const session = await getSession();
  if (!session?.user) {
    return { ok: false, error: "Please sign in to mark notifications as read." };
  }

  const supabase = await createUserClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", session.user.id)
    .is("read_at", null);

  if (error) {
    console.error("markAllReadAction error:", error);
    return { ok: false, error: error.message || "Failed to mark as read." };
  }

  return { ok: true };
}
