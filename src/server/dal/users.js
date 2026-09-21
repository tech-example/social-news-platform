import "server-only";
import { getAdminClient } from "@/server/admin-client";
import { requireRole } from "@/server/auth";

export async function getUsersAdmin({
  limit = 20,
  offset = 0,
  query = "",
  role = "all",
  status = "all",
} = {}) {
  await requireRole("admin");
  const adminSupabase = getAdminClient();

  let q = adminSupabase
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
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (query.trim()) {
    q = q.or(`username.ilike.%${query.trim()}%,display_name.ilike.%${query.trim()}%`);
  }

  if (role && role !== "all") {
    q = q.eq("role", role);
  }

  if (status === "suspended") {
    q = q.eq("is_suspended", true);
  } else if (status === "active") {
    q = q.eq("is_suspended", false);
  }

  const { data, count, error } = await q;
  if (error) {
    console.error("Error fetching users for admin:", error);
    return { users: [], total: 0 };
  }

  return { users: data || [], total: count || 0 };
}
