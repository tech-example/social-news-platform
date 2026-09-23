"use server";
import { requireRoleOrThrow, AuthError } from "@/server/auth";
import { createUserClient } from "@/server/supabase";
import { getAdminClient } from "@/server/admin-client";
import { commentSchema, shareSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { getCommentsForPost } from "@/server/dal/posts";

export async function toggleLikeAction(postId) {
  let session;
  try {
    session = await requireRoleOrThrow("user");
  } catch (err) {
    if (err instanceof AuthError && err.code === "UNAUTHENTICATED") {
      return { ok: false, error: "UNAUTHENTICATED", code: "UNAUTHENTICATED" };
    }
    return { ok: false, error: "You do not have permission.", code: "FORBIDDEN" };
  }

  const userSupabase = await createUserClient();
  const adminSupabase = getAdminClient();

  // 1. Try database RPC first using user client (where auth.uid() is populated)
  try {
    const { data, error } = await userSupabase.rpc("toggle_like", {
      p_post_id: postId,
    });

    if (!error && data !== null && data !== undefined) {
      const isLiked = typeof data === "object" ? !!data.liked : !!data;
      revalidatePath("/");
      revalidatePath(`/p/${postId}`);
      return { ok: true, liked: isLiked };
    }
  } catch (rpcErr) {
    console.warn("toggle_like RPC warning:", rpcErr);
  }

  // 2. Direct table fallback on public.likes (composite PK: user_id, post_id - no 'id' column)
  try {
    const { data: existing } = await adminSupabase
      .from("likes")
      .select("user_id")
      .eq("user_id", session.user.id)
      .eq("post_id", postId)
      .maybeSingle();

    if (existing) {
      const { error: delErr } = await adminSupabase
        .from("likes")
        .delete()
        .eq("user_id", session.user.id)
        .eq("post_id", postId);

      if (delErr) {
        console.error("Direct unlike delete error:", delErr);
        return { ok: false, error: delErr.message || "Failed to unlike post." };
      }
      revalidatePath("/");
      revalidatePath(`/p/${postId}`);
      return { ok: true, liked: false };
    } else {
      const { error: insErr } = await adminSupabase
        .from("likes")
        .insert({
          user_id: session.user.id,
          post_id: postId,
        });

      if (insErr) {
        // If already inserted concurrently, treat as liked
        if (insErr.code === "23505") {
          return { ok: true, liked: true };
        }
        console.error("Direct like insert error:", insErr);
        return { ok: false, error: insErr.message || "Failed to like post." };
      }
      revalidatePath("/");
      revalidatePath(`/p/${postId}`);
      return { ok: true, liked: true };
    }
  } catch (err) {
    console.error("Direct like fallback error:", err);
    return { ok: false, error: err.message || "Failed to update like." };
  }
}

export async function toggleFollowAction(targetUserId) {
  let session;
  try {
    session = await requireRoleOrThrow("user");
  } catch (err) {
    if (err instanceof AuthError && err.code === "UNAUTHENTICATED") {
      return { ok: false, error: "UNAUTHENTICATED", code: "UNAUTHENTICATED" };
    }
    return { ok: false, error: "You do not have permission.", code: "FORBIDDEN" };
  }
  if (!targetUserId) {
    return { ok: false, error: "Target user ID is required." };
  }
  if (session.user.id === targetUserId) {
    return { ok: false, error: "You cannot follow yourself." };
  }

  const adminSupabase = getAdminClient();

  try {
    const { data: existing, error: selectErr } = await adminSupabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", session.user.id)
      .eq("following_id", targetUserId)
      .maybeSingle();

    if (selectErr) {
      console.warn("Follow check warning:", selectErr);
    }

    if (existing) {
      const { error: delErr } = await adminSupabase
        .from("follows")
        .delete()
        .eq("follower_id", session.user.id)
        .eq("following_id", targetUserId);

      if (delErr) {
        console.error("Direct unfollow delete error:", delErr);
        return { ok: false, error: delErr.message || "Failed to unfollow." };
      }

      revalidatePath("/", "layout");
      return { ok: true, following: false };
    } else {
      const { error: insErr } = await adminSupabase
        .from("follows")
        .insert({
          follower_id: session.user.id,
          following_id: targetUserId,
        });

      if (insErr) {
        if (insErr.code === "23505") {
          revalidatePath("/", "layout");
          return { ok: true, following: true };
        }
        console.error("Direct follow insert error:", insErr);
        return { ok: false, error: insErr.message || "Failed to follow." };
      }

      revalidatePath("/", "layout");
      return { ok: true, following: true };
    }
  } catch (err) {
    console.error("Direct follow fallback error:", err);
    return { ok: false, error: err.message || "Failed to update follow status." };
  }

}

export async function createCommentAction(postId, body, parentId = null) {
  let session;
  try {
    session = await requireRoleOrThrow("user");
  } catch (err) {
    if (err instanceof AuthError && err.code === "UNAUTHENTICATED") {
      return { ok: false, error: "Please sign in to comment.", code: "UNAUTHENTICATED" };
    }
    return { ok: false, error: "You do not have permission to comment.", code: "FORBIDDEN" };
  }
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
  let session;
  try {
    session = await requireRoleOrThrow("user");
  } catch (err) {
    if (err instanceof AuthError && err.code === "UNAUTHENTICATED") {
      return { ok: false, error: "UNAUTHENTICATED", code: "UNAUTHENTICATED" };
    }
    return { ok: false, error: "You do not have permission.", code: "FORBIDDEN" };
  }
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
  let session;
  try {
    session = await requireRoleOrThrow("user");
  } catch (err) {
    if (err instanceof AuthError && err.code === "UNAUTHENTICATED") {
      return { ok: false, error: "UNAUTHENTICATED", code: "UNAUTHENTICATED" };
    }
    return { ok: false, error: "You do not have permission.", code: "FORBIDDEN" };
  }
  const parsed = shareSchema.safeParse({ postId, note: note || null });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid share input." };
  }

  const adminSupabase = getAdminClient();

  // Check if post is already shared (1 post can only have 1 reposter, 1 user can have multiple reposts, but cannot repost duplicate)
  const { data: existingShare } = await adminSupabase
    .from("shares")
    .select("id, user_id")
    .eq("post_id", postId)
    .maybeSingle();

  if (existingShare) {
    if (existingShare.user_id === session.user.id) {
      return {
        ok: false,
        alreadyShared: true,
        isOwnShare: true,
        error: "You have already reposted this post.",
      };
    } else {
      return {
        ok: false,
        alreadyShared: true,
        isOwnShare: false,
        error: "This post has already been reposted by another user (maximum 1 repost per post).",
      };
    }
  }

  const { error } = await adminSupabase.from("shares").insert({
    post_id: postId,
    user_id: session.user.id,
    note: parsed.data.note || null,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        alreadyShared: true,
        error: "This post has already been reposted by another user.",
      };
    }
    return { ok: false, error: error.message || "Failed to share post." };
  }

  revalidatePath(`/p/${postId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function unsharePostAction(postId) {
  let session;
  try {
    session = await requireRoleOrThrow("user");
  } catch (err) {
    if (err instanceof AuthError && err.code === "UNAUTHENTICATED") {
      return { ok: false, error: "UNAUTHENTICATED", code: "UNAUTHENTICATED" };
    }
    return { ok: false, error: "You do not have permission.", code: "FORBIDDEN" };
  }

  const adminSupabase = getAdminClient();
  const { error } = await adminSupabase
    .from("shares")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", session.user.id);

  if (error) {
    return { ok: false, error: error.message || "Failed to remove repost." };
  }

  revalidatePath(`/p/${postId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteShareAction(shareId) {
  let session;
  try {
    session = await requireRoleOrThrow("user");
  } catch (err) {
    if (err instanceof AuthError && err.code === "UNAUTHENTICATED") {
      return { ok: false, error: "UNAUTHENTICATED", code: "UNAUTHENTICATED" };
    }
    return { ok: false, error: "You do not have permission.", code: "FORBIDDEN" };
  }

  const adminSupabase = getAdminClient();
  const { error } = await adminSupabase
    .from("shares")
    .delete()
    .eq("id", shareId)
    .eq("user_id", session.user.id);

  if (error) {
    return { ok: false, error: error.message || "Failed to delete share." };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function getCommentsAction(postId) {
  try {
    const comments = await getCommentsForPost(postId);
    return { ok: true, comments: comments || [] };
  } catch (err) {
    console.error("Failed to load comments:", err);
    return { ok: false, error: err.message || "Failed to load comments.", comments: [] };
  }
}
