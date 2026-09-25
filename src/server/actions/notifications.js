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
