import "server-only";
import { createUserClient } from "@/server/supabase";

export async function getPopularTags(limit = 20, excludeTag = null) {
  const supabase = await createUserClient();

  // Database-computed popular tags via RPC
  try {
    const { data, error } = await supabase.rpc("get_popular_tags", {
      p_limit: limit,
      p_exclude_tag: excludeTag,
    });
    if (!error && data) return data;
  } catch {
    // proceed to optimized SQL query fallback
  }

  // Fallback SQL query: filter & sort directly in database
  let query = supabase
    .from("tags")
    .select("id, name, posts_count")
    .order("posts_count", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit);

  if (excludeTag) {
    const clean = excludeTag.trim().toLowerCase().replace(/^#/, "");
    query = query.neq("name", clean);
  }

  const { data: tags, error: fallbackErr } = await query;
  if (fallbackErr || !tags) return [];
  return tags;
}

export async function getTrendingTags(limit = 10) {
  return getPopularTags(limit);
}

export async function searchTags(query, limit = 20) {
  if (!query?.trim()) return [];
  const supabase = await createUserClient();

  const clean = query.trim().toLowerCase().replace(/^#/, "");
  const { data: tags, error } = await supabase
    .from("tags")
    .select("id, name, posts_count")
    .ilike("name", `%${clean}%`)
    .order("posts_count", { ascending: false })
    .limit(limit);

  if (error || !tags) return [];
  return tags;
}
