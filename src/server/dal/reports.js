import "server-only";
import { getAdminClient } from "@/server/admin-client";
import { requireRole } from "@/server/auth";

export async function getReports({ status = null, limit = 20, offset = 0 } = {}) {
  await requireRole("moderator");
  const adminSupabase = getAdminClient();

  let query = adminSupabase
    .from("reports")
    .select(`
      id,
      reporter_id,
      target_type,
      target_id,
      reason,
      details,
      status,
      assigned_to,
      action_taken,
      actioned_at,
      created_at,
      reporter:profiles!reports_reporter_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error("Error fetching reports:", error);
    return { reports: [], total: 0 };
  }

  return { reports: data || [], total: count || 0 };
}

export async function getReportById(reportId) {
  await requireRole("moderator");
  const adminSupabase = getAdminClient();

  const { data: report, error } = await adminSupabase
    .from("reports")
    .select(`
      id,
      reporter_id,
      target_type,
      target_id,
      reason,
      details,
      status,
      assigned_to,
      action_taken,
      actioned_at,
      created_at,
      reporter:profiles!reports_reporter_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("id", reportId)
    .single();

  if (error || !report) return null;

  // Fetch target object details depending on target_type
  let targetDetails = null;
  if (report.target_type === "post") {
    const { data: post } = await adminSupabase
      .from("posts")
      .select("id, title, body, image_url, status, author_id, author:profiles!posts_author_id_fkey(id, username, display_name)")
      .eq("id", report.target_id)
      .maybeSingle();
    targetDetails = post;
  } else if (report.target_type === "comment") {
    const { data: comment } = await adminSupabase
      .from("comments")
      .select("id, body, status, post_id, author_id, author:profiles!comments_author_id_fkey(id, username, display_name)")
      .eq("id", report.target_id)
      .maybeSingle();
    targetDetails = comment;
  } else if (report.target_type === "user") {
    const { data: userProfile } = await adminSupabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, role, is_suspended")
      .eq("id", report.target_id)
      .maybeSingle();
    targetDetails = userProfile;
  }

  return {
    ...report,
    targetDetails,
  };
}
