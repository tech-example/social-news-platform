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

  // Batch-fetch flagged status of post and comment targets
  const postIds = (data || []).filter((r) => r.target_type === "post" && r.target_post_id).map((r) => r.target_post_id);
  const commentIds = (data || []).filter((r) => r.target_type === "comment" && r.target_comment_id).map((r) => r.target_comment_id);

  const flaggedMap = new Map();

  if (postIds.length > 0) {
    const { data: postsData, error: pErr } = await adminSupabase
      .from("posts")
      .select("id, title, body, is_flagged, flagged_reason")
      .in("id", postIds);

    if (pErr && pErr.code === "42703") {
      const { data: fallbackPosts } = await adminSupabase
        .from("posts")
        .select("id, title, body")
        .in("id", postIds);
      const { containsProfanity } = await import("@/lib/profanity");
      for (const p of fallbackPosts || []) {
        const check = containsProfanity(`${p.title || ""} ${p.body || ""}`);
        flaggedMap.set(p.id, { is_flagged: check.flagged, flagged_reason: check.flagged ? "profanity" : null });
      }
    } else {
      for (const p of postsData || []) {
        flaggedMap.set(p.id, { is_flagged: Boolean(p.is_flagged), flagged_reason: p.flagged_reason });
      }
    }
  }

  if (commentIds.length > 0) {
    const { data: commentsData, error: cErr } = await adminSupabase
      .from("comments")
      .select("id, body, is_flagged, flagged_reason")
      .in("id", commentIds);

    if (cErr && cErr.code === "42703") {
      const { data: fallbackComments } = await adminSupabase
        .from("comments")
        .select("id, body")
        .in("id", commentIds);
      const { containsProfanity } = await import("@/lib/profanity");
      for (const c of fallbackComments || []) {
        const check = containsProfanity(c.body || "");
        flaggedMap.set(c.id, { is_flagged: check.flagged, flagged_reason: check.flagged ? "profanity" : null });
      }
    } else {
      for (const c of commentsData || []) {
        flaggedMap.set(c.id, { is_flagged: Boolean(c.is_flagged), flagged_reason: c.flagged_reason });
      }
    }
  }

  const formatted = (data || []).map((r) => {
    const targetId = r.target_post_id || r.target_comment_id || r.target_user_id;
    const flagInfo = flaggedMap.get(targetId);
    return {
      ...r,
      target_id: targetId,
      assigned_to: r.assigned_moderator_id,
      action_taken: r.final_decision_note || r.moderator_note || null,
      actioned_at: r.resolved_at || null,
      is_flagged: flagInfo ? flagInfo.is_flagged : false,
      flagged_reason: flagInfo ? flagInfo.flagged_reason : null,
    };
  });

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
    let post = null;
    const { data: postData, error: pErr } = await adminSupabase
      .from("posts")
      .select("id, title, body, image_url, status, is_flagged, flagged_reason, author_id, author:profiles!posts_author_id_fkey(id, username, display_name)")
      .eq("id", targetId)
      .maybeSingle();

    if (pErr && pErr.code === "42703") {
      const { data: fallbackPost } = await adminSupabase
        .from("posts")
        .select("id, title, body, image_url, status, author_id, author:profiles!posts_author_id_fkey(id, username, display_name)")
        .eq("id", targetId)
        .maybeSingle();
      post = fallbackPost;
      if (post) {
        const { containsProfanity } = await import("@/lib/profanity");
        const check = containsProfanity(`${post.title || ""} ${post.body || ""}`);
        post.is_flagged = check.flagged;
        post.flagged_reason = check.flagged ? "profanity" : null;
      }
    } else {
      post = postData;
    }
    targetDetails = post;
  } else if (report.target_type === "comment" && targetId) {
    let comment = null;
    const { data: commentData, error: cErr } = await adminSupabase
      .from("comments")
      .select("id, body, status, is_flagged, flagged_reason, post_id, author_id, author:profiles!comments_author_id_fkey(id, username, display_name)")
      .eq("id", targetId)
      .maybeSingle();

    if (cErr && cErr.code === "42703") {
      const { data: fallbackComment } = await adminSupabase
        .from("comments")
        .select("id, body, status, post_id, author_id, author:profiles!comments_author_id_fkey(id, username, display_name)")
        .eq("id", targetId)
        .maybeSingle();
      comment = fallbackComment;
      if (comment) {
        const { containsProfanity } = await import("@/lib/profanity");
        const check = containsProfanity(comment.body || "");
        comment.is_flagged = check.flagged;
        comment.flagged_reason = check.flagged ? "profanity" : null;
      }
    } else {
      comment = commentData;
    }
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
    is_flagged: Boolean(targetDetails?.is_flagged),
    flagged_reason: targetDetails?.flagged_reason || null,
    targetDetails,
  };
}
