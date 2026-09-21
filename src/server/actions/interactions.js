"use server";
import { requireRole } from "@/server/auth";
import { createUserClient } from "@/server/supabase";
import { getAdminClient } from "@/server/admin-client";
import { commentSchema, shareSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function toggleLikeAction(postId) {
  const session = await requireRole("user");
  const adminSupabase = getAdminClient();

  // Try database RPC first
  try {
    const { data, error } = await adminSupabase.rpc("toggle_like", {
      p_post_id: postId,
    });

    if (!error && data !== null && data !== undefined) {
      const isLiked = typeof data === "object" ? !!data.liked : !!data;
      return { ok: true, liked: isLiked };
    }
  } catch (rpcErr) {
    console.warn("toggle_like RPC warning:", rpcErr);
  }

  // Robust direct table fallback via adminSupabase to prevent trigger RLS errors on notifications
  try {
    const { data: existing } = await adminSupabase
      .from("likes")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("post_id", postId)
      .maybeSingle();

    if (existing) {
      const { error: delErr } = await adminSupabase
        .from("likes")
        .delete()
        .eq("id", existing.id);
      
      if (delErr) {
        return { ok: false, error: delErr.message || "Failed to unlike post." };
      }
      return { ok: true, liked: false };
    } else {
      const { error: insErr } = await adminSupabase
        .from("likes")
        .insert({
          user_id: session.user.id,
          post_id: postId,
        });

      if (insErr) {
        return { ok: false, error: insErr.message || "Failed to like post." };
      }
      return { ok: true, liked: true };
    }
  } catch (err) {
    console.error("Direct like fallback error:", err);
    return { ok: false, error: err.message || "Failed to update like." };
  }
}

export async function toggleFollowAction(targetUserId) {
  const session = await requireRole("user");
  if (session.user.id === targetUserId) {
    return { ok: false, error: "You cannot follow yourself." };
  }

  const adminSupabase = getAdminClient();

  // Try RPC with the correct parameter name p_user_id (matches PostgreSQL function)
  try {
    const { data, error } = await adminSupabase.rpc("toggle_follow", {
      p_user_id: targetUserId,
    });

    if (!error && data !== null && data !== undefined) {
      const isFollowing = typeof data === "object" ? !!data.following : !!data;
      revalidatePath("/?filter=following");
      revalidatePath("/");
      return { ok: true, following: isFollowing };
    }
  } catch (rpcErr) {
    console.warn("toggle_follow RPC warning:", rpcErr);
  }

  // Robust fallback to direct table operation on public.follows via adminSupabase
  try {
    const { data: existing } = await adminSupabase
      .from("follows")
      .select("id")
      .eq("follower_id", session.user.id)
      .eq("following_id", targetUserId)
      .maybeSingle();

    if (existing) {
      await adminSupabase
        .from("follows")
        .delete()
        .eq("follower_id", session.user.id)
        .eq("following_id", targetUserId);

      revalidatePath("/?filter=following");
      revalidatePath("/");
      return { ok: true, following: false };
    } else {
      await adminSupabase
        .from("follows")
        .insert({
          follower_id: session.user.id,
          following_id: targetUserId,
        });

      revalidatePath("/?filter=following");
      revalidatePath("/");
      return { ok: true, following: true };
    }
  } catch (err) {
    console.error("Direct follow fallback error:", err);
    return { ok: false, error: err.message || "Failed to update follow status." };
  }
}

export async function createCommentAction(postId, body, parentId = null) {
  const session = await requireRole("user");
  const parsed = commentSchema.safeParse({ postId, body, parentId });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid comment." };
  }

  const adminSupabase = getAdminClient();
  const { data: newComment, error } = await adminSupabase
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
    // Fallback to simple insert if join hint fails
    const { data: simpleComment, error: simpleError } = await adminSupabase
      .from("comments")
      .insert({
        post_id: postId,
        author_id: session.user.id,
        parent_id: parentId || null,
        body: parsed.data.body,
        status: "published",
      })
      .select("id, post_id, author_id, parent_id, body, status, created_at")
      .single();

    if (simpleError || !simpleComment) {
      return { ok: false, error: error?.message || simpleError?.message || "Failed to post comment." };
    }

    return {
      ok: true,
      comment: {
        id: simpleComment.id,
        postId: simpleComment.post_id,
        authorId: simpleComment.author_id,
        parentId: simpleComment.parent_id,
        body: simpleComment.body,
        status: simpleComment.status,
        createdAt: simpleComment.created_at,
        author: {
          id: session.profile?.id || session.user.id,
          username: session.profile?.username || "user",
          display_name: session.profile?.display_name || "User",
          avatar_url: session.profile?.avatar_url || null,
        },
      },
    };
  }

  return {
    ok: true,
    comment: {
      id: newComment.id,
      postId: newComment.post_id,
      authorId: newComment.author_id,
      parentId: newComment.parent_id,
      body: newComment.body,
      status: newComment.status,
      createdAt: newComment.created_at,
      author: newComment.author,
    },
  };
}

export async function deleteCommentAction(commentId, postId) {
  const session = await requireRole("user");
  const adminSupabase = getAdminClient();

  const { data: comment } = await adminSupabase
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

  const { error } = await adminSupabase.from("comments").delete().eq("id", commentId);
  if (error) {
    return { ok: false, error: error.message || "Failed to delete comment." };
  }

  return { ok: true };
}

export async function sharePostAction(postId, note = null) {
  const session = await requireRole("user");
  const parsed = shareSchema.safeParse({ postId, note: note || null });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid share input." };
  }

  const adminSupabase = getAdminClient();
  const { error } = await adminSupabase.from("shares").insert({
    post_id: postId,
    user_id: session.user.id,
    note: parsed.data.note || null,
  });

  if (error) {
    return { ok: false, error: error.message || "Failed to share post." };
  }

  return { ok: true };
}
