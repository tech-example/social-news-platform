import "server-only";
import { getAdminClient } from "@/server/admin-client";
import { requireRole } from "@/server/auth";

export function getDateRanges(rangePreset = "30d", customFrom = null, customTo = null) {
  const now = new Date();
  let from = new Date();
  let prevFrom = new Date();
  let prevTo = new Date();

  if (rangePreset === "today") {
    from.setHours(0, 0, 0, 0);
    const duration = now.getTime() - from.getTime();
    prevTo = new Date(from.getTime());
    prevFrom = new Date(prevTo.getTime() - duration);
  } else if (rangePreset === "7d") {
    from.setDate(now.getDate() - 7);
    prevTo = new Date(from.getTime());
    prevFrom.setDate(now.getDate() - 14);
  } else if (rangePreset === "90d") {
    from.setDate(now.getDate() - 90);
    prevTo = new Date(from.getTime());
    prevFrom.setDate(now.getDate() - 180);
  } else if (rangePreset === "custom" && customFrom && customTo) {
    from = new Date(customFrom);
    const to = new Date(customTo);
    const duration = to.getTime() - from.getTime();
    prevTo = new Date(from.getTime());
    prevFrom = new Date(from.getTime() - duration);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      prevFrom: prevFrom.toISOString(),
      prevTo: prevTo.toISOString(),
    };
  } else {
    // Default 30d
    from.setDate(now.getDate() - 30);
    prevTo = new Date(from.getTime());
    prevFrom.setDate(now.getDate() - 60);
  }

  return {
    from: from.toISOString(),
    to: now.toISOString(),
    prevFrom: prevFrom.toISOString(),
    prevTo: prevTo.toISOString(),
  };
}

export async function getAdminKPIs(rangePreset = "30d") {
  await requireRole("admin");
  const { from, to, prevFrom, prevTo } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  // Try stats_kpis RPC first
  const { data: kpiData, error: kpiErr } = await adminSupabase.rpc("stats_kpis", {
    p_from: from,
    p_to: to,
    p_prev_from: prevFrom,
    p_prev_to: prevTo,
  });

  if (!kpiErr && kpiData) {
    const res = Array.isArray(kpiData) ? kpiData[0] : kpiData;
    if (res) return res;
  }

  // Fallback to stats_overview RPC
  const { data: overviewData, error: overviewErr } = await adminSupabase.rpc("stats_overview", {
    p_from: from,
    p_to: to,
  });

  if (!overviewErr && overviewData) {
    const ov = Array.isArray(overviewData) ? overviewData[0] : overviewData;
    return {
      total_users: ov.total_users || 0,
      new_users: ov.new_users || 0,
      prev_new_users: ov.prev_new_users || 0,
      total_posts: ov.total_posts || 0,
      new_posts: ov.new_posts || 0,
      prev_new_posts: ov.prev_new_posts || 0,
      total_engagement: ov.total_engagement || 0,
      prev_total_engagement: ov.prev_total_engagement || 0,
      active_users_dau: 0,
      active_users_wau: 0,
      active_users_mau: 0,
      open_reports: ov.open_reports || 0,
      escalated_reports: ov.escalated_reports || 0,
      suspended_users: ov.suspended_users || 0,
    };
  }

  return {
    total_users: 0,
    new_users: 0,
    prev_new_users: 0,
    total_posts: 0,
    new_posts: 0,
    prev_new_posts: 0,
    total_engagement: 0,
    prev_total_engagement: 0,
    active_users_dau: 0,
    active_users_wau: 0,
    active_users_mau: 0,
    open_reports: 0,
    escalated_reports: 0,
    suspended_users: 0,
  };
}

export async function getTimeseries(metric = "posts", bucket = "day", rangePreset = "30d") {
  await requireRole("admin");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_timeseries", {
    p_metric: metric,
    p_bucket: bucket,
    p_from: from,
    p_to: to,
  });

  if (error || !data) return [];
  return data;
}

export async function getEngagementComposition(bucket = "day", rangePreset = "30d") {
  await requireRole("admin");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_engagement_by_day", {
    p_from: from,
    p_to: to,
  });

  if (error || !data) return [];
  return data;
}

export async function getTopPosts(limit = 10, rangePreset = "30d") {
  await requireRole("admin");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_top_posts", {
    p_from: from,
    p_to: to,
    p_limit: limit,
  });

  if (error || !data) return [];
  return data;
}

export async function getTopUsers(limit = 10, rangePreset = "30d") {
  await requireRole("admin");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_top_users", {
    p_from: from,
    p_to: to,
    p_limit: limit,
  });

  if (error || !data) return [];
  return data;
}

export async function getTopTags(limit = 10, rangePreset = "30d") {
  await requireRole("admin");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_top_tags", {
    p_from: from,
    p_to: to,
    p_limit: limit,
  });

  if (error || !data) return [];
  return data;
}

export async function getContentMix(rangePreset = "30d") {
  await requireRole("admin");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_content_mix", {
    p_from: from,
    p_to: to,
  });

  if (error || !data || data.length === 0) {
    return {
      total_posts: 0,
      posts_with_images: 0,
      pct_with_images: 0,
      posts_with_tags: 0,
      pct_with_tags: 0,
      avg_tags_per_post: 0,
    };
  }

  return data[0];
}

export async function getReportsByStatus(rangePreset = "30d") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_reports_by_status", {
    p_from: from,
    p_to: to,
  });

  if (error || !data) return [];
  return data;
}

export async function getReportsByReason(rangePreset = "30d") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_reports_by_reason", {
    p_from: from,
    p_to: to,
  });

  if (error || !data) return [];
  return data;
}

export async function getModerationResolutionTime(rangePreset = "30d") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  // Try section 6.6 stats_report_resolution_time first
  let { data, error } = await adminSupabase.rpc("stats_report_resolution_time", {
    p_from: from,
    p_to: to,
  });

  if (error || !data) {
    const fallback = await adminSupabase.rpc("stats_moderation_resolution_time", {
      p_from: from,
      p_to: to,
    });
    data = fallback.data;
  }

  if (!data) {
    return {
      resolved_count: 0,
      median_minutes: 0,
      p90_minutes: 0,
    };
  }

  const res = Array.isArray(data) ? data[0] : data;
  return res || { resolved_count: 0, median_minutes: 0, p90_minutes: 0 };
}

export async function getModeratorWorkload(rangePreset = "30d") {
  await requireRole("admin");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_moderator_workload", {
    p_from: from,
    p_to: to,
  });

  if (error || !data) return [];
  return data;
}

export async function getSearchAnalytics(limit = 10, rangePreset = "30d") {
  await requireRole("admin");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  // Try section 6.6 stats_search_terms first
  let { data, error } = await adminSupabase.rpc("stats_search_terms", {
    p_from: from,
    p_to: to,
    p_limit: limit,
  });

  if (error || !data) {
    const fallback = await adminSupabase.rpc("stats_search_analytics", {
      p_from: from,
      p_to: to,
      p_limit: limit,
    });
    data = fallback.data;
  }

  if (!data) return [];
  return data;
}

export async function getSystemSummary() {
  await requireRole("admin");
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_system_summary");
  if (error || !data || data.length === 0) {
    return {
      table_counts: {},
      db_size_bytes: 0,
      db_size_pretty: "0 MB",
    };
  }

  return data[0];
}

export async function getModeratorKPIs(rangePreset = "30d") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_moderator_kpis", {
    p_from: from,
    p_to: to,
  });

  if (error || !data || data.length === 0) {
    return {
      awaiting_action: 0,
      awaiting_final: 0,
      resolved_in_range: 0,
    };
  }

  return data[0];
}
