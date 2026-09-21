import "server-only";
import { createUserClient } from "@/server/supabase";

export async function getTrendingTags(limit = 10) {
  const supabase = await createUserClient();

  const { data: tags, error } = await supabase
    .from("tags")
    .select("id, name, posts_count")
    .order("posts_count", { ascending: false })
    .limit(limit);

  if (error || !tags) return [];
  return tags;
}

export async function searchTags(query, limit = 20) {
  if (!query?.trim()) return [];
  const supabase = await createUserClient();

  const clean = query.trim().replace(/^#/, "");
  const { data: tags, error } = await supabase
    .from("tags")
    .select("id, name, posts_count")
    .ilike("name", `%${clean}%`)
    .order("posts_count", { ascending: false })
    .limit(limit);

  if (error || !tags) return [];
  return tags;
}
