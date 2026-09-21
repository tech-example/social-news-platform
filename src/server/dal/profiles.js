import "server-only";
import { createUserClient } from "@/server/supabase";

export async function getProfileByUsername(username, viewerId = null) {
  if (!username) return null;
  const supabase = await createUserClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      id,
      username,
      display_name,
      avatar_url,
      bio,
      role,
      is_suspended,
      posts_count,
      followers_count,
      following_count,
      created_at
    `)
    .ilike("username", username.trim())
    .maybeSingle();

  if (error || !profile) return null;

  let isFollowing = false;
  let isViewer = false;

  if (viewerId) {
    isViewer = viewerId === profile.id;
    if (!isViewer) {
      const { data: followRecord } = await supabase
        .from("follows")
        .select("created_at")
        .eq("follower_id", viewerId)
        .eq("following_id", profile.id)
        .maybeSingle();

      isFollowing = !!followRecord;
    }
  }

  return {
    ...profile,
    isFollowing,
    isViewer,
  };
}

export async function getProfileById(userId) {
  if (!userId) return null;
  const supabase = await createUserClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      id,
      username,
      display_name,
      avatar_url,
      bio,
      role,
      is_suspended,
      posts_count,
      followers_count,
      following_count,
      created_at
    `)
    .eq("id", userId)
    .single();

  if (error || !profile) return null;
  return profile;
}

export async function getSuggestedProfiles(viewerId = null, limit = 5) {
  const supabase = await createUserClient();

  let query = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, followers_count")
    .eq("is_suspended", false)
    .order("followers_count", { ascending: false })
    .limit(limit);

  if (viewerId) {
    query = query.neq("id", viewerId);
  }

  const { data: profiles, error } = await query;
  if (error || !profiles) return [];
  return profiles;
}

export async function searchProfiles(query, limit = 20) {
  if (!query?.trim()) return [];
  const supabase = await createUserClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, followers_count, is_suspended")
    .eq("is_suspended", false)
    .or(`username.ilike.%${query.trim()}%,display_name.ilike.%${query.trim()}%`)
    .order("followers_count", { ascending: false })
    .limit(limit);

  if (error || !profiles) return [];
  return profiles;
}
