"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth";
import { getAdminClient } from "@/server/admin-client";

export async function hidePostAction(postId) {
  const session = await requireRole("moderator");
  const adminSupabase = getAdminClient();

  const { error } = await adminSupabase
    .from("posts")
    .update({ status: "hidden", updated_at: new Date().toISOString() })
    .eq("id", postId);

  if (error) return { ok: false, error: error.message };

  await adminSupabase.from("audit_logs").insert({
    actor_id: session.user.id,
    action: "hide_post",
    entity: "post",
    entity_id: postId,
    metadata: {},
  });

  revalidatePath("/");
  revalidatePath("/moderation");
  revalidatePath("/moderation/content");
  return { ok: true };
}

export async function restorePostAction(postId) {
  const session = await requireRole("moderator");
  const adminSupabase = getAdminClient();

  const { error } = await adminSupabase
    .from("posts")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", postId);

  if (error) return { ok: false, error: error.message };

  await adminSupabase.from("audit_logs").insert({
    actor_id: session.user.id,
    action: "restore_post",
    entity: "post",
    entity_id: postId,
    metadata: {},
  });

  revalidatePath("/");
  revalidatePath("/moderation");
  revalidatePath("/moderation/content");
  return { ok: true };
}

export async function hideCommentAction(commentId) {
  const session = await requireRole("moderator");
  const adminSupabase = getAdminClient();

  const { error } = await adminSupabase
    .from("comments")
    .update({ status: "hidden", updated_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) return { ok: false, error: error.message };

  await adminSupabase.from("audit_logs").insert({
    actor_id: session.user.id,
    action: "hide_comment",
    entity: "comment",
    entity_id: commentId,
    metadata: {},
  });

  revalidatePath("/moderation");
  revalidatePath("/moderation/content");
  return { ok: true };
}

export async function restoreCommentAction(commentId) {
  const session = await requireRole("moderator");
  const adminSupabase = getAdminClient();

  const { error } = await adminSupabase
    .from("comments")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) return { ok: false, error: error.message };

  await adminSupabase.from("audit_logs").insert({
    actor_id: session.user.id,
    action: "restore_comment",
    entity: "comment",
    entity_id: commentId,
    metadata: {},
  });

  revalidatePath("/moderation");
  revalidatePath("/moderation/content");
  return { ok: true };
}
