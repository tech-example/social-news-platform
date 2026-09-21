import "server-only";
import { getAdminClient } from "@/server/admin-client";
import { requireRole } from "@/server/auth";

export async function getAuditLogs({ limit = 30, offset = 0 } = {}) {
  await requireRole("admin");
  const adminSupabase = getAdminClient();

  const { data, count, error } = await adminSupabase
    .from("audit_logs")
    .select(`
      id,
      actor_id,
      action,
      target_type,
      target_id,
      details,
      created_at,
      actor:profiles!audit_logs_actor_id_fkey(
        id,
        username,
        display_name,
        avatar_url,
        role
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching audit logs:", error);
    return { logs: [], total: 0 };
  }

  return { logs: data || [], total: count || 0 };
}
