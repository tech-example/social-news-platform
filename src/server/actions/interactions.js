"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth";
import { createUserClient } from "@/server/supabase";
import { commentSchema, shareSchema } from "@/lib/validators";

export async function toggleLikeAction(postId) {
  const session = await requireRole("user");
  const supabase = await createUserClient();

  const { data: liked, error } = await supabase.rpc("toggle_like", {
    p_post_id: postId,
  });

  if (error) {
    return { ok: false, error: error.message || "Failed to update like." };
  }

  revalidatePath("/");
  revalidatePath(`/p/${postId}`);
  return { ok: true, liked: !!liked };
}

export async function toggleFollowAction(targetUserId) {
  const session = await requireRole("user");
  if (session.user.id === targetUserId) {
    return { ok: false, error: "You cannot follow yourself." };
  }

  const supabase = await createUserClient();
  const { data: following, error } = await supabase.rpc("toggle_follow", {
    p_target_id: targetUserId,
  });

  if (error) {
    return { ok: false, error: error.message || "Failed to update follow status." };
  }

  revalidatePath("/");
  return { ok: true, following: !!following };
}

export async function createCommentAction(postId, body, parentId = null) {
  const session = await requireRole("user");
  const parsed = commentSchema.safeParse({ postId, body, parentId });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid comment." };
  }

  const supabase = await createUserClient();
  const { data: newComment, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      author_id: session.user.id,
      parent_id: parentId || null,
      body: parsed.data.body,
      status: "published",
    })
    .select(`
      id,
      post_id,
      author_id,
      parent_id,
      body,
      status,
      created_at,
      author:profiles!comments_author_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .single();

  if (error || !newComment) {
    return { ok: false, error: error?.message || "Failed to post comment." };
  }

  revalidatePath(`/p/${postId}`);
  return { ok: true, comment: newComment };
}

export async function deleteCommentAction(commentId, postId) {
  const session = await requireRole("user");
  const supabase = await createUserClient();

  const { data: comment } = await supabase
    .from("comments")
    .select("id, author_id")
    .eq("id", commentId)
    .single();

  if (!comment) return { ok: false, error: "Comment not found." };

  const isOwner = comment.author_id === session.user.id;
  const isStaff = session.profile.role === "moderator" || session.profile.role === "admin";

  if (!isOwner && !isStaff) {
    return { ok: false, error: "Not authorized to delete this comment." };
  }

  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) {
    return { ok: false, error: error.message || "Failed to delete comment." };
  }

  if (postId) {
    revalidatePath(`/p/${postId}`);
  }
  return { ok: true };
}

export async function sharePostAction(postId, note = null) {
  const session = await requireRole("user");
  const parsed = shareSchema.safeParse({ postId, note });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid share input." };
  }

  const supabase = await createUserClient();
  const { error } = await supabase.from("shares").insert({
    post_id: postId,
    user_id: session.user.id,
    note: parsed.data.note || null,
  });

  if (error) {
    return { ok: false, error: error.message || "Failed to share post." };
  }

  revalidatePath("/");
  revalidatePath(`/p/${postId}`);
  revalidatePath(`/u/${session.profile.username}`);
  return { ok: true };
}
