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
      target_user_id,
      target_post_id,
      target_comment_id,
      reason,
      details,
      status,
      assigned_moderator_id,
      moderator_note,
      final_decision_by,
      final_decision_note,
      created_at,
      updated_at,
      resolved_at,
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

  const formatted = (data || []).map((r) => ({
    ...r,
    target_id: r.target_post_id || r.target_comment_id || r.target_user_id,
    assigned_to: r.assigned_moderator_id,
    action_taken: r.final_decision_note || r.moderator_note || null,
    actioned_at: r.resolved_at || null,
  }));

  return { reports: formatted, total: count || 0 };
}

export async function getReportById(reportId) {
  await requireRole("moderator");
  const adminSupabase = getAdminClient();

  const { data: rawReport, error } = await adminSupabase
    .from("reports")
    .select(`
      id,
      reporter_id,
      target_type,
      target_user_id,
      target_post_id,
      target_comment_id,
      reason,
      details,
      status,
      assigned_moderator_id,
      moderator_note,
      final_decision_by,
      final_decision_note,
      created_at,
      updated_at,
      resolved_at,
      reporter:profiles!reports_reporter_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("id", reportId)
    .single();

  if (error || !rawReport) return null;

  const targetId = rawReport.target_post_id || rawReport.target_comment_id || rawReport.target_user_id;

  const report = {
    ...rawReport,
    target_id: targetId,
    assigned_to: rawReport.assigned_moderator_id,
    action_taken: rawReport.final_decision_note || rawReport.moderator_note || null,
    actioned_at: rawReport.resolved_at || null,
  };

  // Fetch target object details depending on target_type
  let targetDetails = null;
  if (report.target_type === "post" && targetId) {
    const { data: post } = await adminSupabase
      .from("posts")
      .select("id, title, body, image_url, status, author_id, author:profiles!posts_author_id_fkey(id, username, display_name)")
      .eq("id", targetId)
      .maybeSingle();
    targetDetails = post;
  } else if (report.target_type === "comment" && targetId) {
    const { data: comment } = await adminSupabase
      .from("comments")
      .select("id, body, status, post_id, author_id, author:profiles!comments_author_id_fkey(id, username, display_name)")
      .eq("id", targetId)
      .maybeSingle();
    targetDetails = comment;
  } else if (report.target_type === "user" && targetId) {
    const { data: userProfile } = await adminSupabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, role, is_suspended")
      .eq("id", targetId)
      .maybeSingle();
    targetDetails = userProfile;
  }

  return {
    ...report,
    targetDetails,
  };
}
