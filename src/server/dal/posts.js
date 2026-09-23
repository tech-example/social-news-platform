import "server-only";
import { createUserClient } from "@/server/supabase";
import { getAdminClient } from "@/server/admin-client";

export async function getFeedPosts({
  cursor = null,
  limit = 10,
  viewerId = null,
  filter = "latest",
} = {}) {
  const supabase = await createUserClient();

  let query = supabase
    .from("posts")
    .select(`
      id,
      title,
      body,
      image_url,
      status,
      likes_count,
      comments_count,
      shares_count,
      created_at,
      author:profiles!posts_author_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      ),
      tags:post_tags(
        tag:tags(id, name)
      )
    `)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  if (filter === "following") {
    if (!viewerId) {
      return { posts: [], nextCursor: null };
    }
    const adminClient = getAdminClient();
    const { data: followRecords, error: followErr } = await adminClient
      .from("follows")
      .select("following_id")
      .eq("follower_id", viewerId);

    if (followErr) {
      console.error("Error querying follows:", followErr);
      return { posts: [], nextCursor: null };
    }

    const followingIds = (followRecords || [])
      .map((f) => f.following_id)
      .filter((id) => id && id !== viewerId);

    if (followingIds.length === 0) {
      return { posts: [], nextCursor: null };
    }
    query = query.in("author_id", followingIds).neq("author_id", viewerId);
  }

  const { data: rawPosts, error } = await query;
  if (error) {
    console.error("Error fetching feed posts:", error);
    return { posts: [], nextCursor: null };
  }

  let likedPostIds = new Set();
  let followedAuthorIds = new Set();
  if (viewerId && rawPosts && rawPosts.length > 0) {
    const postIds = rawPosts.map((p) => p.id);
    const authorIds = [
      ...new Set(
        rawPosts
          .map((p) => p.author?.id)
          .filter((id) => id && id !== viewerId)
      ),
    ];

    const [userLikesResult, userFollowsResult] = await Promise.all([
      supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", viewerId)
        .in("post_id", postIds),
      authorIds.length > 0
        ? supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", viewerId)
            .in("following_id", authorIds)
        : Promise.resolve({ data: [] }),
    ]);

    if (userLikesResult.data) {
      likedPostIds = new Set(userLikesResult.data.map((l) => l.post_id));
    }
    if (userFollowsResult.data) {
      followedAuthorIds = new Set(
        userFollowsResult.data.map((f) => f.following_id)
      );
    }
  }

  const posts = (rawPosts || []).map((post) => ({
    id: post.id,
    title: post.title,
    body: post.body,
    imageUrl: post.image_url,
    status: post.status,
    likesCount: post.likes_count || 0,
    commentsCount: post.comments_count || 0,
    sharesCount: post.shares_count || 0,
    createdAt: post.created_at,
    author: post.author,
    tags: (post.tags || []).map((t) => t.tag?.name).filter(Boolean),
    isLiked: likedPostIds.has(post.id),
    isFollowingAuthor: followedAuthorIds.has(post.author?.id),
  }));

  const nextCursor =
    posts.length === limit ? posts[posts.length - 1].createdAt : null;

  return { posts, nextCursor };
}

export async function getPostById(postId, viewerId = null) {
  const supabase = await createUserClient();

  const { data: post, error } = await supabase
    .from("posts")
    .select(`
      id,
      title,
      body,
      image_url,
      status,
      likes_count,
      comments_count,
      shares_count,
      created_at,
      author:profiles!posts_author_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      ),
      tags:post_tags(
        tag:tags(id, name)
      )
    `)
    .eq("id", postId)
    .single();

  if (error || !post) return null;

  let isLiked = false;
  let isFollowingAuthor = false;
  if (viewerId) {
    const authorId = post.author?.id;
    const [likeRecord, followRecord] = await Promise.all([
      supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", viewerId)
        .eq("post_id", postId)
        .maybeSingle(),
      authorId && authorId !== viewerId
        ? supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", viewerId)
            .eq("following_id", authorId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    isLiked = !!likeRecord.data;
    isFollowingAuthor = !!followRecord.data;
  }

  return {
    id: post.id,
    title: post.title,
    body: post.body,
    imageUrl: post.image_url,
    status: post.status,
    likesCount: post.likes_count || 0,
    commentsCount: post.comments_count || 0,
    sharesCount: post.shares_count || 0,
    createdAt: post.created_at,
    author: post.author,
    tags: (post.tags || []).map((t) => t.tag?.name).filter(Boolean),
    isLiked,
    isFollowingAuthor,
  };
}

export async function getCommentsForPost(postId, viewerId = null) {
  const supabase = await createUserClient();

  const { data: comments, error } = await supabase
    .from("comments")
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
    .eq("post_id", postId)
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (error || !comments) return [];

  return comments.map((c) => ({
    id: c.id,
    postId: c.post_id,
    userId: c.author_id,
    parentId: c.parent_id,
    body: c.body,
    createdAt: c.created_at,
    author: c.author,
    isOwner: viewerId ? c.author_id === viewerId : false,
  }));
}

export async function getUserPosts({
  userId,
  tab = "posts",
  cursor = null,
  limit = 12,
} = {}) {
  const supabase = await createUserClient();

  if (tab === "shares") {
    let query = supabase
      .from("shares")
      .select(`
        id,
        note,
        created_at,
        post:posts(
          id,
          title,
          body,
          image_url,
          likes_count,
          comments_count,
          shares_count,
          created_at,
          author:profiles!posts_author_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) query = query.lt("created_at", cursor);

    const { data: rawShares, error } = await query;
    if (error || !rawShares) return { posts: [], nextCursor: null };

    const items = rawShares
      .filter((s) => s.post)
      .map((s) => ({
        shareId: s.id,
        shareNote: s.note,
        shareCreatedAt: s.created_at,
        id: s.post.id,
        title: s.post.title,
        body: s.post.body,
        imageUrl: s.post.image_url,
        likesCount: s.post.likes_count || 0,
        commentsCount: s.post.comments_count || 0,
        sharesCount: s.post.shares_count || 0,
        createdAt: s.post.created_at,
        author: s.post.author,
      }));

    const nextCursor =
      items.length === limit ? items[items.length - 1].shareCreatedAt : null;
    return { posts: items, nextCursor };
  }

  let query = supabase
    .from("posts")
    .select(`
      id,
      title,
      body,
      image_url,
      likes_count,
      comments_count,
      shares_count,
      created_at
    `)
    .eq("author_id", userId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt("created_at", cursor);

  const { data: rawPosts, error } = await query;
  if (error || !rawPosts) return { posts: [], nextCursor: null };

  const posts = rawPosts.map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    imageUrl: p.image_url,
    likesCount: p.likes_count || 0,
    commentsCount: p.comments_count || 0,
    sharesCount: p.shares_count || 0,
    createdAt: p.created_at,
  }));

  const nextCursor =
    posts.length === limit ? posts[posts.length - 1].createdAt : null;
  return { posts, nextCursor };
}

export async function getTagPosts({
  tagName,
  cursor = null,
  limit = 12,
} = {}) {
  const supabase = await createUserClient();

  const { data: tagRecord } = await supabase
    .from("tags")
    .select("id, name, posts_count")
    .ilike("name", tagName.toLowerCase())
    .maybeSingle();

  if (!tagRecord) return { tag: null, posts: [], nextCursor: null };

  let query = supabase
    .from("post_tags")
    .select(`
      post:posts!inner(
        id,
        title,
        body,
        image_url,
        likes_count,
        comments_count,
        shares_count,
        created_at,
        status,
        author:profiles!posts_author_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      )
    `)
    .eq("tag_id", tagRecord.id)
    .eq("post.status", "published")
    .order("post(created_at)", { ascending: false })
    .limit(limit);

  const { data: rawPostTags, error } = await query;
  if (error || !rawPostTags) return { tag: tagRecord, posts: [], nextCursor: null };

  const posts = rawPostTags
    .filter((pt) => pt.post)
    .map((pt) => ({
      id: pt.post.id,
      title: pt.post.title,
      body: pt.post.body,
      imageUrl: pt.post.image_url,
      likesCount: pt.post.likes_count || 0,
      commentsCount: pt.post.comments_count || 0,
      sharesCount: pt.post.shares_count || 0,
      createdAt: pt.post.created_at,
      author: pt.post.author,
    }));

  return { tag: tagRecord, posts, nextCursor: null };
}

export async function getExplorePosts({ limit = 18 } = {}) {
  const supabase = await createUserClient();

  const { data: rawPosts, error } = await supabase
    .from("posts")
    .select(`
      id,
      title,
      body,
      image_url,
      likes_count,
      comments_count,
      shares_count,
      created_at,
      author:profiles!posts_author_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("status", "published")
    .order("likes_count", { ascending: false })
    .order("comments_count", { ascending: false })
    .limit(limit);

  if (error || !rawPosts) return [];

  return rawPosts.map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    imageUrl: p.image_url,
    likesCount: p.likes_count || 0,
    commentsCount: p.comments_count || 0,
    sharesCount: p.shares_count || 0,
    createdAt: p.created_at,
    author: p.author,
  }));
}

export async function searchPosts(searchQuery, limit = 20) {
  if (!searchQuery?.trim()) return [];
  const supabase = await createUserClient();

  const { data, error } = await supabase.rpc("search_posts", {
    p_query: searchQuery.trim(),
    p_limit: limit,
  });

  if (error) {
    // Fallback to ilike
    const { data: fallbackPosts } = await supabase
      .from("posts")
      .select(`
        id,
        title,
        body,
        image_url,
        likes_count,
        comments_count,
        shares_count,
        created_at,
        author:profiles!posts_author_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("status", "published")
      .or(`title.ilike.%${searchQuery}%,body.ilike.%${searchQuery}%`)
      .limit(limit);

    return fallbackPosts || [];
  }

  return data || [];
}
