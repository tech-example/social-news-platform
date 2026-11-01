import "server-only";
import { createUserClient } from "@/server/supabase";
import { getAdminClient } from "@/server/admin-client";

const PAGE_SIZE = 20;

/**
 * Batch lookup whether the viewer follows a list of user IDs.
 * Returns a Set of followed user IDs.
 */
async function getViewerFollowedSet(viewerId, userIds) {
  if (!viewerId || !userIds || userIds.length === 0) return new Set();
  const supabase = await createUserClient();
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewerId)
    .in("following_id", userIds);

  return new Set((data || []).map((f) => f.following_id));
}

/**
 * Fetch likers for a post with cursor pagination.
 * Checks post visibility so deleted/hidden posts do not leak.
 * Returns ONLY: id, username, display_name, avatar_url, is_following_by_me, created_at.
 */
export async function getPostLikers(postId, { cursor = null, limit = PAGE_SIZE, viewerId = null } = {}) {
  if (!postId) return { items: [], nextCursor: null, totalCount: 0 };
  const supabase = await createUserClient();

  // 1. Check post visibility
  const { data: post, error: postErr } = await supabase
    .from("posts")
    .select("id, status, author_id, likes_count")
    .eq("id", postId)
    .maybeSingle();

  if (postErr || !post) {
    return { items: [], nextCursor: null, totalCount: 0 };
  }

  // If post is not published, only author or staff can view
  if (post.status !== "published" && post.author_id !== viewerId) {
    return { items: [], nextCursor: null, totalCount: 0 };
  }

  // 2. Fetch likes with profiles join
  let query = supabase
    .from("likes")
    .select("post_id, user_id, created_at, user:profiles!likes_user_id_fkey(id, username, display_name, avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: rows, error: likesErr } = await query;
  if (likesErr || !rows) {
    console.error("getPostLikers error:", likesErr);
    return { items: [], nextCursor: null, totalCount: post.likes_count || 0 };
  }

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.created_at : null;

  // 3. Populate is_following_by_me
  const userIds = pageRows.map((r) => r.user?.id).filter(Boolean);
  const followedSet = await getViewerFollowedSet(viewerId, userIds);

  const items = pageRows
    .map((r) => {
      const u = r.user;
      if (!u) return null;
      return {
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        is_following_by_me: viewerId ? (viewerId === u.id ? false : followedSet.has(u.id)) : false,
        created_at: r.created_at,
      };
    })
    .filter(Boolean);

  return {
    items,
    nextCursor,
    totalCount: post.likes_count || 0,
  };
}

/**
 * Fetch followers of a user with cursor pagination.
 * Returns ONLY: id, username, display_name, avatar_url, is_following_by_me, created_at.
 */
export async function getUserFollowers(targetUserId, { cursor = null, limit = PAGE_SIZE, viewerId = null } = {}) {
  if (!targetUserId) return { items: [], nextCursor: null, totalCount: 0 };
  const supabase = await createUserClient();

  // Get total count from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("followers_count")
    .eq("id", targetUserId)
    .maybeSingle();

  let query = supabase
    .from("follows")
    .select("follower_id, following_id, created_at, user:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)")
    .eq("following_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: rows, error } = await query;
  if (error || !rows) {
    console.error("getUserFollowers error:", error);
    return { items: [], nextCursor: null, totalCount: profile?.followers_count || 0 };
  }

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.created_at : null;

  const userIds = pageRows.map((r) => r.user?.id).filter(Boolean);
  const followedSet = await getViewerFollowedSet(viewerId, userIds);

  const items = pageRows
    .map((r) => {
      const u = r.user;
      if (!u) return null;
      return {
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        is_following_by_me: viewerId ? (viewerId === u.id ? false : followedSet.has(u.id)) : false,
        created_at: r.created_at,
      };
    })
    .filter(Boolean);

  return {
    items,
    nextCursor,
    totalCount: profile?.followers_count || 0,
  };
}

/**
 * Fetch whom a user is following with cursor pagination.
 * Returns ONLY: id, username, display_name, avatar_url, is_following_by_me, created_at.
 */
export async function getUserFollowing(targetUserId, { cursor = null, limit = PAGE_SIZE, viewerId = null } = {}) {
  if (!targetUserId) return { items: [], nextCursor: null, totalCount: 0 };
  const supabase = await createUserClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("following_count")
    .eq("id", targetUserId)
    .maybeSingle();

  let query = supabase
    .from("follows")
    .select("follower_id, following_id, created_at, user:profiles!follows_following_id_fkey(id, username, display_name, avatar_url)")
    .eq("follower_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: rows, error } = await query;
  if (error || !rows) {
    console.error("getUserFollowing error:", error);
    return { items: [], nextCursor: null, totalCount: profile?.following_count || 0 };
  }

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.created_at : null;

  const userIds = pageRows.map((r) => r.user?.id).filter(Boolean);
  const followedSet = targetUserId === viewerId
    ? new Set(userIds) // If I'm viewing my own following list, I follow all of them
    : await getViewerFollowedSet(viewerId, userIds);

  const items = pageRows
    .map((r) => {
      const u = r.user;
      if (!u) return null;
      return {
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        is_following_by_me: viewerId ? (viewerId === u.id ? false : followedSet.has(u.id)) : false,
        created_at: r.created_at,
      };
    })
    .filter(Boolean);

  return {
    items,
    nextCursor,
    totalCount: profile?.following_count || 0,
  };
}

/**
 * Fetch owner's recent activity directly from likes and follows tables.
 * Grouped by day. Unaffected by the 14-day notification auto-delete.
 */
export async function getOwnerRecentActivity({ ownerId, limit = 50 } = {}) {
  if (!ownerId) return { grouped: [] };
  const supabase = await createUserClient();

  // 1. Get owner's published/non-removed posts
  const { data: myPosts } = await supabase
    .from("posts")
    .select("id, title")
    .eq("author_id", ownerId)
    .neq("status", "removed");

  const myPostIds = (myPosts || []).map((p) => p.id);
  const postMap = new Map((myPosts || []).map((p) => [p.id, p.title || "Post"]));

  // 2. Query recent likes on owner's posts
  let recentLikes = [];
  if (myPostIds.length > 0) {
    const { data: likes, error: likesErr } = await supabase
      .from("likes")
      .select("post_id, user_id, created_at, user:profiles!likes_user_id_fkey(id, username, display_name, avatar_url)")
      .in("post_id", myPostIds)
      .neq("user_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!likesErr && likes) {
      recentLikes = likes.map((l) => ({
        id: `like-${l.post_id}-${l.user_id}-${l.created_at}`,
        type: "like",
        actor: l.user,
        post: { id: l.post_id, title: postMap.get(l.post_id) },
        created_at: l.created_at,
      }));
    }
  }

  // 3. Query recent follows
  let recentFollows = [];
  const { data: follows, error: followsErr } = await supabase
    .from("follows")
    .select("follower_id, following_id, created_at, user:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)")
    .eq("following_id", ownerId)
    .neq("follower_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!followsErr && follows) {
    recentFollows = follows.map((f) => ({
      id: `follow-${f.follower_id}-${f.created_at}`,
      type: "follow",
      actor: f.user,
      post: null,
      created_at: f.created_at,
    }));
  }

  // 4. Combine and sort
  const combined = [...recentLikes, ...recentFollows].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );

  // 5. Check is_following_by_me for all actors
  const actorIds = combined.map((x) => x.actor?.id).filter(Boolean);
  const followedSet = await getViewerFollowedSet(ownerId, actorIds);

  const formattedItems = combined.map((item) => ({
    ...item,
    actor: item.actor
      ? {
          ...item.actor,
          is_following_by_me: followedSet.has(item.actor.id),
        }
      : null,
  }));

  // 6. Group by day
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

  const groupsMap = new Map();
  for (const item of formattedItems) {
    const dayKey = item.created_at.slice(0, 10);
    let label = dayKey;
    if (dayKey === todayStr) {
      label = "Today";
    } else if (dayKey === yesterdayStr) {
      label = "Yesterday";
    } else {
      const d = new Date(item.created_at);
      label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    if (!groupsMap.has(label)) {
      groupsMap.set(label, []);
    }
    groupsMap.get(label).push(item);
  }

  const grouped = Array.from(groupsMap.entries()).map(([dateLabel, items]) => ({
    date: dateLabel,
    items,
  }));

  return { grouped, totalCount: formattedItems.length };
}
