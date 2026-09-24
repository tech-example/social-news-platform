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
      likes: ov.likes || 0,
      prev_likes: ov.prev_likes || 0,
      comments: ov.comments || 0,
      prev_comments: ov.prev_comments || 0,
      shares: ov.shares || 0,
      prev_shares: ov.prev_shares || 0,
      follows: ov.follows || 0,
      prev_follows: ov.prev_follows || 0,
      active_users_dau: 0,
      active_users_wau: 0,
      active_users_mau: 0,
      open_reports: ov.open_reports || 0,
      prev_open_reports: ov.prev_open_reports || 0,
      escalated_reports: ov.escalated_reports || 0,
      prev_escalated_reports: ov.prev_escalated_reports || 0,
      suspended_users: ov.suspended_users || 0,
    };
  }

  // Direct table counts fallback if migration not run yet
  try {
    const [usersRes, postsRes, likesRes, commentsRes, sharesRes, reportsOpen, reportsEsc, suspendedRes] = await Promise.all([
      adminSupabase.from("profiles").select("id", { count: "exact", head: true }),
      adminSupabase.from("posts").select("id", { count: "exact", head: true }).neq("status", "removed"),
      adminSupabase.from("likes").select("user_id", { count: "exact", head: true }).gte("created_at", from).lte("created_at", to),
      adminSupabase.from("comments").select("id", { count: "exact", head: true }).neq("status", "removed").gte("created_at", from).lte("created_at", to),
      adminSupabase.from("shares").select("id", { count: "exact", head: true }).gte("created_at", from).lte("created_at", to),
      adminSupabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["pending", "in_review"]),
      adminSupabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "escalated"),
      adminSupabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_suspended", true),
    ]);

    const likesCount = likesRes.count || 0;
    const commentsCount = commentsRes.count || 0;
    const sharesCount = sharesRes.count || 0;

    return {
      total_users: usersRes.count || 0,
      new_users: 0,
      prev_new_users: 0,
      total_posts: postsRes.count || 0,
      new_posts: 0,
      prev_new_posts: 0,
      total_engagement: likesCount + commentsCount + sharesCount,
      prev_total_engagement: 0,
      likes: likesCount,
      prev_likes: 0,
      comments: commentsCount,
      prev_comments: 0,
      shares: sharesCount,
      prev_shares: 0,
      follows: 0,
      prev_follows: 0,
      active_users_dau: 0,
      active_users_wau: 0,
      active_users_mau: 0,
      open_reports: reportsOpen.count || 0,
      prev_open_reports: 0,
      escalated_reports: reportsEsc.count || 0,
      prev_escalated_reports: 0,
      suspended_users: suspendedRes.count || 0,
    };
  } catch (err) {
    console.error("Failed to fetch KPIs:", err);
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
    likes: 0,
    prev_likes: 0,
    comments: 0,
    prev_comments: 0,
    shares: 0,
    prev_shares: 0,
    follows: 0,
    prev_follows: 0,
    active_users_dau: 0,
    active_users_wau: 0,
    active_users_mau: 0,
    open_reports: 0,
    prev_open_reports: 0,
    escalated_reports: 0,
    prev_escalated_reports: 0,
    suspended_users: 0,
  };
}

export async function getTimeseries(metric = "posts", bucket = "day", rangePreset = "30d") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_timeseries", {
    p_metric: metric,
    p_bucket: bucket,
    p_from: from,
    p_to: to,
  });

  if (!error && Array.isArray(data)) return data;

  // Fallback query for timeseries if RPC unavailable
  try {
    const tableMap = {
      posts: "posts",
      users: "profiles",
      likes: "likes",
      comments: "comments",
      shares: "shares",
      follows: "follows",
      reports: "reports",
    };
    const tableName = tableMap[metric];
    if (tableName) {
      const { data: rows } = await adminSupabase
        .from(tableName)
        .select("created_at")
        .gte("created_at", from)
        .lte("created_at", to);

      if (rows && rows.length > 0) {
        const bucketCounts = {};
        for (const r of rows) {
          const d = new Date(r.created_at);
          let key;
          if (bucket === "week") {
            const startOfWeek = new Date(d);
            startOfWeek.setDate(d.getDate() - d.getDay());
            key = startOfWeek.toISOString().slice(0, 10);
          } else if (bucket === "month") {
            key = d.toISOString().slice(0, 7) + "-01";
          } else {
            key = d.toISOString().slice(0, 10);
          }
          bucketCounts[key] = (bucketCounts[key] || 0) + 1;
        }
        return Object.entries(bucketCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([b, val]) => ({ bucket: b, value: val }));
      }
    }
  } catch (fallbackErr) {
    console.error("Timeseries fallback error:", fallbackErr);
  }

  return [];
}

export async function getEngagementComposition(bucket = "day", rangePreset = "30d") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_engagement_by_day", {
    p_from: from,
    p_to: to,
  });

  if (!error && Array.isArray(data)) return data;

  // Fallback to stats_engagement_composition if named differently
  const fallback = await adminSupabase.rpc("stats_engagement_composition", {
    p_bucket: bucket,
    p_from: from,
    p_to: to,
  });

  if (!fallback.error && Array.isArray(fallback.data)) return fallback.data;
  return [];
}

export async function getTopPosts(limit = 10, rangePreset = "30d") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_top_posts", {
    p_from: from,
    p_to: to,
    p_limit: limit,
  });

  if (!error && Array.isArray(data)) return data;

  // Fallback direct query
  try {
    const { data: posts } = await adminSupabase
      .from("posts")
      .select("id, title, body, likes_count, comments_count, shares_count, created_at, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url)")
      .eq("status", "published")
      .gte("created_at", from)
      .lte("created_at", to)
      .order("likes_count", { ascending: false })
      .limit(limit);

    if (posts) {
      return posts.map((p) => ({
        id: p.id,
        title: p.title || p.body?.slice(0, 60),
        author_id: p.author?.id,
        author_username: p.author?.username,
        author_display_name: p.author?.display_name,
        author_avatar_url: p.author?.avatar_url,
        likes_count: p.likes_count,
        comments_count: p.comments_count,
        shares_count: p.shares_count,
        engagement_score: p.likes_count + 2 * p.comments_count + 3 * p.shares_count,
        created_at: p.created_at,
      }));
    }
  } catch (fallbackErr) {
    console.error("Top posts fallback error:", fallbackErr);
  }

  return [];
}

export async function getTopUsers(limit = 10, rangePreset = "30d") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_top_users", {
    p_from: from,
    p_to: to,
    p_limit: limit,
  });

  if (!error && Array.isArray(data)) return data;

  // Fallback direct query
  try {
    const { data: users } = await adminSupabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, posts_count, followers_count")
      .eq("is_suspended", false)
      .order("followers_count", { ascending: false })
      .limit(limit);

    if (users) {
      return users.map((u) => ({
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        posts_count: u.posts_count,
        followers_count: u.followers_count,
        total_engagement: 0,
      }));
    }
  } catch (err) {
    console.error("Top users fallback error:", err);
  }

  return [];
}

export async function getTopTags(limit = 10, rangePreset = "30d") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_top_tags", {
    p_from: from,
    p_to: to,
    p_limit: limit,
  });

  if (!error && Array.isArray(data)) return data;

  // Fallback direct tags query
  try {
    const { data: tags } = await adminSupabase
      .from("tags")
      .select("id, name, posts_count")
      .order("posts_count", { ascending: false })
      .limit(limit);

    if (tags) {
      return tags.map((t) => ({
        name: t.name,
        posts_count: t.posts_count,
        total_engagement: 0,
      }));
    }
  } catch (err) {
    console.error("Top tags fallback error:", err);
  }

  return [];
}

export async function getContentMix(rangePreset = "30d") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_content_mix", {
    p_from: from,
    p_to: to,
  });

  if (!error && data) {
    const res = Array.isArray(data) ? data[0] : data;
    if (res) return res;
  }

  // Fallback query
  try {
    const { data: posts, count: total } = await adminSupabase
      .from("posts")
      .select("id, image_url", { count: "exact" })
      .eq("status", "published")
      .gte("created_at", from)
      .lte("created_at", to);

    const totalPosts = total || (posts?.length ?? 0);
    const withImages = (posts || []).filter((p) => p.image_url).length;

    return {
      total_posts: totalPosts,
      pct_with_images: totalPosts > 0 ? Math.round((withImages / totalPosts) * 100) : 0,
      pct_with_tags: 0,
      avg_tags_per_post: 0,
    };
  } catch (err) {
    console.error("Content mix fallback error:", err);
  }

  return {
    total_posts: 0,
    pct_with_images: 0,
    pct_with_tags: 0,
    avg_tags_per_post: 0,
  };
}

export async function getReportsByStatus(rangePreset = "30d") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  // Try overloaded with range first
  let { data, error } = await adminSupabase.rpc("stats_reports_by_status", {
    p_from: from,
    p_to: to,
  });

  // Try no-param version
  if (error || !data) {
    const res = await adminSupabase.rpc("stats_reports_by_status");
    data = res.data;
    error = res.error;
  }

  if (!error && Array.isArray(data)) return data;

  // Fallback direct count query
  try {
    const { data: reports } = await adminSupabase
      .from("reports")
      .select("status");

    if (reports) {
      const counts = {};
      for (const r of reports) {
        counts[r.status] = (counts[r.status] || 0) + 1;
      }
      return Object.entries(counts).map(([status, count]) => ({ status, count }));
    }
  } catch (err) {
    console.error("Reports by status fallback error:", err);
  }

  return [];
}

export async function getReportsByReason(rangePreset = "30d") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_reports_by_reason", {
    p_from: from,
    p_to: to,
  });

  if (!error && Array.isArray(data)) return data;

  // Fallback query
  try {
    const { data: reports } = await adminSupabase
      .from("reports")
      .select("reason")
      .gte("created_at", from)
      .lte("created_at", to);

    if (reports) {
      const counts = {};
      for (const r of reports) {
        counts[r.reason] = (counts[r.reason] || 0) + 1;
      }
      return Object.entries(counts).map(([reason, count]) => ({ reason, count }));
    }
  } catch (err) {
    console.error("Reports by reason fallback error:", err);
  }

  return [];
}

export async function getModerationResolutionTime(rangePreset = "30d") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_report_resolution_time", {
    p_from: from,
    p_to: to,
  });

  if (!error && data) {
    const res = Array.isArray(data) ? data[0] : data;
    if (res) return res;
  }

  return {
    median_hours: 0,
    p90_hours: 0,
    resolved_count: 0,
  };
}

export async function getModeratorWorkload(rangePreset = "30d") {
  await requireRole("admin");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_moderator_workload", {
    p_from: from,
    p_to: to,
  });

  if (!error && Array.isArray(data)) return data;
  return [];
}

export async function getSearchAnalytics(limit = 10, rangePreset = "30d") {
  await requireRole("admin");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_search_terms", {
    p_from: from,
    p_to: to,
    p_limit: limit,
  });

  if (!error && Array.isArray(data)) {
    return data.map((d) => ({
      query: d.term || d.query,
      search_count: d.search_count || d.count || 0,
      zero_result_count: d.zero_result_count || 0,
      zero_result_rate: d.zero_result_rate || 0,
    }));
  }

  // Fallback to activity_events search queries
  try {
    const { data: events } = await adminSupabase
      .from("activity_events")
      .select("query")
      .eq("kind", "search")
      .gte("created_at", from)
      .lte("created_at", to);

    if (events && events.length > 0) {
      const counts = {};
      for (const e of events) {
        if (!e.query) continue;
        const q = e.query.trim().toLowerCase();
        counts[q] = (counts[q] || 0) + 1;
      }
      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([query, search_count]) => ({
          query,
          search_count,
          zero_result_count: 0,
          zero_result_rate: 0,
        }));
    }
  } catch (err) {
    console.error("Search analytics fallback error:", err);
  }

  return [];
}

export async function getFollowerDistribution() {
  await requireRole("admin");
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_follower_distribution");
  if (!error && Array.isArray(data) && data.length > 0) return data;

  // Fallback calculation from profiles
  try {
    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("followers_count")
      .eq("is_suspended", false);

    if (profiles) {
      const buckets = { "0": 0, "1-9": 0, "10-99": 0, "100+": 0 };
      for (const p of profiles) {
        const fc = p.followers_count || 0;
        if (fc === 0) buckets["0"]++;
        else if (fc < 10) buckets["1-9"]++;
        else if (fc < 100) buckets["10-99"]++;
        else buckets["100+"]++;
      }
      const total = profiles.length || 1;
      return Object.entries(buckets).map(([bucket, user_count]) => ({
        bucket,
        user_count,
        pct: Math.round((user_count / total) * 100 * 10) / 10,
      }));
    }
  } catch (err) {
    console.error("Follower distribution fallback error:", err);
  }

  return [
    { bucket: "0", user_count: 0, pct: 0 },
    { bucket: "1-9", user_count: 0, pct: 0 },
    { bucket: "10-99", user_count: 0, pct: 0 },
    { bucket: "100+", user_count: 0, pct: 0 },
  ];
}

export async function getPostingHeatmap(rangePreset = "30d") {
  await requireRole("admin");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_posting_heatmap", {
    p_from: from,
    p_to: to,
  });

  if (!error && Array.isArray(data)) return data;

  // Fallback query
  try {
    const { data: posts } = await adminSupabase
      .from("posts")
      .select("created_at")
      .eq("status", "published")
      .gte("created_at", from)
      .lte("created_at", to);

    if (posts) {
      const map = {};
      for (const p of posts) {
        const d = new Date(p.created_at);
        const dow = d.getDay();
        const hr = d.getHours();
        const key = `${dow}_${hr}`;
        map[key] = (map[key] || 0) + 1;
      }
      const result = [];
      for (let dow = 0; dow < 7; dow++) {
        for (let hr = 0; hr < 24; hr++) {
          const count = map[`${dow}_${hr}`] || 0;
          if (count > 0) {
            result.push({ day_of_week: dow, hour_of_day: hr, post_count: count });
          }
        }
      }
      return result;
    }
  } catch (err) {
    console.error("Posting heatmap fallback error:", err);
  }

  return [];
}

export async function getRolesDistribution() {
  await requireRole("admin");
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_roles_distribution");
  if (!error && data) {
    const res = Array.isArray(data) ? data[0] : data;
    if (res) return res;
  }

  // Fallback query
  try {
    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("role, is_suspended");

    if (profiles) {
      let users = 0;
      let moderators = 0;
      let admins = 0;
      let suspended = 0;

      for (const p of profiles) {
        if (p.is_suspended) suspended++;
        else if (p.role === "admin") admins++;
        else if (p.role === "moderator") moderators++;
        else users++;
      }

      return {
        users,
        moderators,
        admins,
        suspended,
        total: profiles.length,
      };
    }
  } catch (err) {
    console.error("Roles distribution fallback error:", err);
  }

  return { users: 0, moderators: 0, admins: 0, suspended: 0, total: 0 };
}

export async function getRecentAuditLogs(limit = 10) {
  await requireRole("moderator");
  const adminSupabase = getAdminClient();

  try {
    const { data, error } = await adminSupabase
      .from("audit_logs")
      .select(`
        id,
        action,
        entity,
        entity_id,
        metadata,
        created_at,
        actor:profiles!audit_logs_actor_id_fkey(username, display_name)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data) return data;
  } catch (err) {
    console.error("Recent audit logs error:", err);
  }

  return [];
}

export async function getRecentSignups(limit = 10) {
  await requireRole("admin");
  const adminSupabase = getAdminClient();

  try {
    const { data, error } = await adminSupabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, role, is_suspended, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data) return data;
  } catch (err) {
    console.error("Recent signups error:", err);
  }

  return [];
}

export async function getHiddenPosts(limit = 10) {
  await requireRole("moderator");
  const adminSupabase = getAdminClient();

  try {
    const { data, error } = await adminSupabase
      .from("posts")
      .select(`
        id,
        title,
        body,
        status,
        created_at,
        updated_at,
        author:profiles!posts_author_id_fkey(id, username, display_name)
      `)
      .eq("status", "hidden")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (!error && data) return data;
  } catch (err) {
    console.error("Hidden posts error:", err);
  }

  return [];
}

export async function getSystemSummary() {
  await requireRole("admin");
  const adminSupabase = getAdminClient();

  let summary = null;
  const { data, error } = await adminSupabase.rpc("stats_system_summary");
  if (!error && data) {
    summary = Array.isArray(data) ? data[0] : data;
  }

  if (!summary) {
    try {
      const [profiles, posts, comments, likes, shares, follows, tags, reports] = await Promise.all([
        adminSupabase.from("profiles").select("id", { count: "exact", head: true }),
        adminSupabase.from("posts").select("id", { count: "exact", head: true }),
        adminSupabase.from("comments").select("id", { count: "exact", head: true }),
        adminSupabase.from("likes").select("user_id", { count: "exact", head: true }),
        adminSupabase.from("shares").select("id", { count: "exact", head: true }),
        adminSupabase.from("follows").select("follower_id", { count: "exact", head: true }),
        adminSupabase.from("tags").select("id", { count: "exact", head: true }),
        adminSupabase.from("reports").select("id", { count: "exact", head: true }),
      ]);

      summary = {
        table_counts: {
          profiles: profiles.count || 0,
          posts: posts.count || 0,
          comments: comments.count || 0,
          likes: likes.count || 0,
          shares: shares.count || 0,
          follows: follows.count || 0,
          tags: tags.count || 0,
          reports: reports.count || 0,
        },
        db_size_bytes: 0,
        db_size_pretty: "Connected",
      };
    } catch (err) {
      console.error("System summary fallback error:", err);
      summary = {
        table_counts: {},
        db_size_bytes: 0,
        db_size_pretty: "Active",
      };
    }
  }

  return {
    ...summary,
    deployment_commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local-dev",
    deployment_env: process.env.VERCEL_ENV || "development",
  };
}

export async function getModeratorKPIs(rangePreset = "30d") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data, error } = await adminSupabase.rpc("stats_moderator_kpis", {
    p_from: from,
    p_to: to,
  });

  if (!error && data) {
    const res = Array.isArray(data) ? data[0] : data;
    if (res) return res;
  }

  // Fallback query directly
  try {
    const [awaitingAction, awaitingFinal, resolved] = await Promise.all([
      adminSupabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["pending", "in_review"]),
      adminSupabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "escalated"),
      adminSupabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["resolved_actioned", "resolved_dismissed"]).gte("created_at", from).lte("created_at", to),
    ]);

    return {
      awaiting_action: awaitingAction.count || 0,
      prev_awaiting_action: 0,
      awaiting_final: awaitingFinal.count || 0,
      prev_awaiting_final: 0,
      resolved_in_range: resolved.count || 0,
      prev_resolved_in_range: 0,
    };
  } catch (err) {
    console.error("Moderator KPIs fallback error:", err);
  }

  return {
    awaiting_action: 0,
    prev_awaiting_action: 0,
    awaiting_final: 0,
    prev_awaiting_final: 0,
    resolved_in_range: 0,
    prev_resolved_in_range: 0,
  };
}
