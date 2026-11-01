"use server";
import { getSession } from "@/server/auth";
import {
  getPostLikers,
  getUserFollowers,
  getUserFollowing,
  getOwnerRecentActivity,
} from "@/server/dal/social-lists";

/**
 * Server Action: Get likers for a post.
 * Returns { ok: true, items, nextCursor, totalCount }
 */
export async function getPostLikersAction(postId, cursor = null) {
  if (!postId) {
    return { ok: false, error: "Post ID is required." };
  }

  try {
    const session = await getSession();
    const viewerId = session?.user?.id || null;

    const res = await getPostLikers(postId, { cursor, viewerId });
    return { ok: true, ...res };
  } catch (err) {
    console.error("getPostLikersAction error:", err);
    return { ok: false, error: "Failed to load likes. Please try again." };
  }
}

/**
 * Server Action: Get followers of a user.
 * Returns { ok: true, items, nextCursor, totalCount }
 */
export async function getUserFollowersAction(targetUserId, cursor = null) {
  if (!targetUserId) {
    return { ok: false, error: "User ID is required." };
  }

  try {
    const session = await getSession();
    const viewerId = session?.user?.id || null;

    const res = await getUserFollowers(targetUserId, { cursor, viewerId });
    return { ok: true, ...res };
  } catch (err) {
    console.error("getUserFollowersAction error:", err);
    return { ok: false, error: "Failed to load followers. Please try again." };
  }
}

/**
 * Server Action: Get following of a user.
 * Returns { ok: true, items, nextCursor, totalCount }
 */
export async function getUserFollowingAction(targetUserId, cursor = null) {
  if (!targetUserId) {
    return { ok: false, error: "User ID is required." };
  }

  try {
    const session = await getSession();
    const viewerId = session?.user?.id || null;

    const res = await getUserFollowing(targetUserId, { cursor, viewerId });
    return { ok: true, ...res };
  } catch (err) {
    console.error("getUserFollowingAction error:", err);
    return { ok: false, error: "Failed to load following list. Please try again." };
  }
}

/**
 * Server Action: Get owner recent activity directly from likes and follows tables.
 * Returns { ok: true, grouped, totalCount }
 */
export async function getOwnerRecentActivityAction() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { ok: false, error: "UNAUTHENTICATED", code: "UNAUTHENTICATED" };
    }

    const res = await getOwnerRecentActivity({ ownerId: session.user.id });
    return { ok: true, ...res };
  } catch (err) {
    console.error("getOwnerRecentActivityAction error:", err);
    return { ok: false, error: "Failed to load recent activity. Please try again." };
  }
}
