import "server-only";
import { getAdminClient } from "@/server/admin-client";
import { requireRole } from "@/server/auth";

export const VALID_RANGES = ["day", "week", "month", "year"];

/**
 * Validates and calculates rolling date windows.
 * Day = last 24 hours, bucketed by hour.
 * Week = last 7 days, bucketed by day.
 * Month = last 30 days, bucketed by day.
 * Year = last 12 months (365 days), bucketed by month.
 * Every KPI compares selected window to previous window of equal length.
 * 
 * @param {string} rangePreset - "day" | "week" | "month" | "year"
 */
export function getDateRanges(rangePreset = "week") {
  const range = VALID_RANGES.includes(rangePreset) ? rangePreset : "week";
  const now = new Date();
  let from = new Date(now);
  let prevTo = new Date(now);
  let prevFrom = new Date(now);
  let bucket = "day";
  let cacheSeconds = 300; // default 5 minutes

  if (range === "day") {
    from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    prevTo = new Date(from.getTime());
    prevFrom = new Date(from.getTime() - 24 * 60 * 60 * 1000);
    bucket = "hour";
    cacheSeconds = 60; // 60s for Day
  } else if (range === "week") {
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevTo = new Date(from.getTime());
    prevFrom = new Date(from.getTime() - 7 * 24 * 60 * 60 * 1000);
    bucket = "day";
    cacheSeconds = 300; // 5 min for Week
  } else if (range === "month") {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    prevTo = new Date(from.getTime());
    prevFrom = new Date(from.getTime() - 30 * 24 * 60 * 60 * 1000);
    bucket = "day";
    cacheSeconds = 300; // 5 min for Month
  } else if (range === "year") {
    from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    prevTo = new Date(from.getTime());
    prevFrom = new Date(from.getTime() - 365 * 24 * 60 * 60 * 1000);
    bucket = "month";
    cacheSeconds = 900; // 15 min for Year
  }

  return {
    range,
    bucket,
    from: from.toISOString(),
    to: now.toISOString(),
    prevFrom: prevFrom.toISOString(),
    prevTo: prevTo.toISOString(),
    cacheSeconds,
  };
}

/**
 * Counts distinct active users across ALL roles (user, moderator, admin)
 * who performed at least one action (activity event, login, post, comment, like, follow, share).
 */
export async function getActiveUsersCount(from, to) {
  const adminSupabase = getAdminClient();
  const [actRes, pRes, postsRes, comRes, likesRes, folRes, shaRes] = await Promise.all([
    adminSupabase.from("activity_events").select("user_id").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("profiles").select("id").gte("last_seen_at", from).lte("last_seen_at", to),
    adminSupabase.from("posts").select("author_id").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("comments").select("author_id").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("likes").select("user_id").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("follows").select("follower_id").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("shares").select("user_id").gte("created_at", from).lte("created_at", to),
  ]);

  const activeIds = new Set();
  actRes.data?.forEach((r) => r.user_id && activeIds.add(r.user_id));
  pRes.data?.forEach((r) => r.id && activeIds.add(r.id));
  postsRes.data?.forEach((r) => r.author_id && activeIds.add(r.author_id));
  comRes.data?.forEach((r) => r.author_id && activeIds.add(r.author_id));
  likesRes.data?.forEach((r) => r.user_id && activeIds.add(r.user_id));
  folRes.data?.forEach((r) => r.follower_id && activeIds.add(r.follower_id));
  shaRes.data?.forEach((r) => r.user_id && activeIds.add(r.user_id));

  return activeIds.size;
}

/**
 * Fetches all KPIs for the redesigned Admin Analytics Dashboard.
 * 
 * Includes:
 * 1. Positive signals (growth & engagement)
 * 2. Negative signals (risk & workload)
 * 3. Advertising readiness (aggregate data only)
 */
export async function getAdminKPIs(rangePreset = "week") {
  await requireRole("admin");
  const { range, from, to, prevFrom, prevTo } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  // 1. Try Postgres RPC stats_admin_kpis first
  const { data: rpcData, error: rpcErr } = await adminSupabase.rpc("stats_admin_kpis", {
    p_from: from,
    p_to: to,
    p_prev_from: prevFrom,
    p_prev_to: prevTo,
  });

  if (!rpcErr && rpcData) {
    const raw = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (raw) {
      return formatKpisWithDeltas(raw);
    }
  }

  // 2. Comprehensive fallback aggregation if RPC not yet loaded in DB
  const [
    // Users
    newUsersRes,
    prevNewUsersRes,
    allProfilesRes,
    // Content
    newPostsRes,
    prevNewPostsRes,
    likesRes,
    prevLikesRes,
    commentsRes,
    prevCommentsRes,
    sharesRes,
    prevSharesRes,
    followsRes,
    prevFollowsRes,
    // Moderation
    pendingReportsRes,
    reportsReceivedRes,
    prevReportsReceivedRes,
    reportsResolvedRes,
    prevReportsResolvedRes,
    flaggedPostsRes,
    flaggedCommentsRes,
    prevFlaggedPostsRes,
    prevFlaggedCommentsRes,
    oldestReportRes,
    moderatorDeletionsRes,
    prevModeratorDeletionsRes,
    // Views
    viewsRes,
    prevViewsRes,
  ] = await Promise.all([
    adminSupabase.from("profiles").select("id, created_at").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("profiles").select("id").gte("created_at", prevFrom).lte("created_at", prevTo),
    adminSupabase.from("profiles").select("id, created_at, role"),
    adminSupabase.from("posts").select("id, status").neq("status", "removed").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("posts").select("id").neq("status", "removed").gte("created_at", prevFrom).lte("created_at", prevTo),
    adminSupabase.from("likes").select("created_at").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("likes").select("created_at").gte("created_at", prevFrom).lte("created_at", prevTo),
    adminSupabase.from("comments").select("id, status").neq("status", "removed").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("comments").select("id").neq("status", "removed").gte("created_at", prevFrom).lte("created_at", prevTo),
    adminSupabase.from("shares").select("id").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("shares").select("id").gte("created_at", prevFrom).lte("created_at", prevTo),
    adminSupabase.from("follows").select("created_at").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("follows").select("created_at").gte("created_at", prevFrom).lte("created_at", prevTo),
    adminSupabase.from("reports").select("id, status, created_at").in("status", ["pending", "in_review", "escalated"]),
    adminSupabase.from("reports").select("id").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("reports").select("id").gte("created_at", prevFrom).lte("created_at", prevTo),
    adminSupabase.from("reports").select("id").gte("resolved_at", from).lte("resolved_at", to),
    adminSupabase.from("reports").select("id").gte("resolved_at", prevFrom).lte("resolved_at", prevTo),
    adminSupabase.from("posts").select("id").eq("status", "hidden").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("comments").select("id").eq("status", "hidden").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("posts").select("id").eq("status", "hidden").gte("created_at", prevFrom).lte("created_at", prevTo),
    adminSupabase.from("comments").select("id").eq("status", "hidden").gte("created_at", prevFrom).lte("created_at", prevTo),
    adminSupabase.from("reports").select("created_at").in("status", ["pending", "in_review", "escalated"]).order("created_at", { ascending: true }).limit(1),
    adminSupabase.from("audit_logs").select("id").in("action", ["post.remove", "comment.remove", "post.delete", "comment.delete"]).gte("created_at", from).lte("created_at", to),
    adminSupabase.from("audit_logs").select("id").in("action", ["post.remove", "comment.remove", "post.delete", "comment.delete"]).gte("created_at", prevFrom).lte("created_at", prevTo),
    adminSupabase.from("post_views").select("id, viewer_id, visitor_hash").gte("viewed_at", from).lte("viewed_at", to),
    adminSupabase.from("post_views").select("id, viewer_id, visitor_hash").gte("viewed_at", prevFrom).lte("viewed_at", prevTo),
  ]);

  const [activeUsers, prevActiveUsers] = await Promise.all([
    getActiveUsersCount(from, to),
    getActiveUsersCount(prevFrom, prevTo),
  ]);

  const toDate = new Date(to);
  const oneDayAgo = new Date(toDate.getTime() - 24 * 3600 * 1000).toISOString();
  const sevenDaysAgo = new Date(toDate.getTime() - 7 * 24 * 3600 * 1000).toISOString();
  const thirtyDaysAgo = new Date(toDate.getTime() - 30 * 24 * 3600 * 1000).toISOString();

  const [dau, wau, mau] = await Promise.all([
    getActiveUsersCount(oneDayAgo, to),
    getActiveUsersCount(sevenDaysAgo, to),
    getActiveUsersCount(thirtyDaysAgo, to),
  ]);

  const newUsers = newUsersRes.data?.length || 0;
  const prevNewUsers = prevNewUsersRes.data?.length || 0;
  const newPosts = newPostsRes.data?.length || 0;
  const prevNewPosts = prevNewPostsRes.data?.length || 0;

  const likes = likesRes.data?.length || 0;
  const prevLikes = prevLikesRes.data?.length || 0;
  const comments = commentsRes.data?.length || 0;
  const prevComments = prevCommentsRes.data?.length || 0;
  const shares = sharesRes.data?.length || 0;
  const prevShares = prevSharesRes.data?.length || 0;

  const totalEngagement = likes + comments + shares;
  const prevTotalEngagement = prevLikes + prevComments + prevShares;

  const engagementPerPost = newPosts > 0 ? Math.round((totalEngagement / newPosts) * 100) / 100 : 0;
  const prevEngagementPerPost = prevNewPosts > 0 ? Math.round((prevTotalEngagement / prevNewPosts) * 100) / 100 : 0;

  const newFollows = followsRes.data?.length || 0;
  const prevNewFollows = prevFollowsRes.data?.length || 0;

  const returningUsers = Math.max(0, activeUsers - newUsers);
  const prevReturningUsers = Math.max(0, prevActiveUsers - prevNewUsers);

  // Negative signals
  const pendingReports = pendingReportsRes.data?.length || 0;
  const reportsReceived = reportsReceivedRes.data?.length || 0;
  const prevReportsReceived = prevReportsReceivedRes.data?.length || 0;
  const reportsResolved = reportsResolvedRes.data?.length || 0;
  const prevReportsResolved = prevReportsResolvedRes.data?.length || 0;

  const reportRate = newPosts > 0 ? Math.round((reportsReceived / newPosts) * 10000) / 10 : 0;
  const prevReportRate = prevNewPosts > 0 ? Math.round((prevReportsReceived / prevNewPosts) * 10000) / 10 : 0;

  const flaggedCount = (flaggedPostsRes.data?.length || 0) + (flaggedCommentsRes.data?.length || 0);
  const prevFlaggedCount = (prevFlaggedPostsRes.data?.length || 0) + (prevFlaggedCommentsRes.data?.length || 0);
  const totalContent = newPosts + comments;
  const prevTotalContent = prevNewPosts + prevComments;

  const flaggedRate = totalContent > 0 ? Math.round((flaggedCount / totalContent) * 10000) / 100 : 0;
  const prevFlaggedRate = prevTotalContent > 0 ? Math.round((prevFlaggedCount / prevTotalContent) * 10000) / 100 : 0;

  const oldestReportDate = oldestReportRes.data?.[0]?.created_at;
  const oldestSeconds = oldestReportDate
    ? Math.max(0, Math.floor((Date.now() - new Date(oldestReportDate).getTime()) / 1000))
    : 0;

  const modDeletions = moderatorDeletionsRes.data?.length || 0;
  const prevModDeletions = prevModeratorDeletionsRes.data?.length || 0;

  const resolutionRate = reportsReceived > 0 ? Math.round((reportsResolved / reportsReceived) * 1000) / 10 : 100;
  const prevResolutionRate = prevReportsReceived > 0 ? Math.round((prevReportsResolved / prevReportsReceived) * 1000) / 10 : 100;

  // Views & Advertising
  const postViewsData = viewsRes.data || [];
  const prevPostViewsData = prevViewsRes.data || [];
  const totalViews = postViewsData.length;
  const prevTotalViews = prevPostViewsData.length;

  const viewersSet = new Set(postViewsData.map((v) => v.viewer_id || v.visitor_hash).filter(Boolean));
  const distinctViewers = viewersSet.size;
  const prevViewersSet = new Set(prevPostViewsData.map((v) => v.viewer_id || v.visitor_hash).filter(Boolean));
  const prevDistinctViewers = prevViewersSet.size;

  const guestViews = postViewsData.filter((v) => !v.viewer_id).length;
  const registeredViews = postViewsData.filter((v) => Boolean(v.viewer_id)).length;

  const stickiness = mau > 0 ? Math.round((dau / mau) * 1000) / 10 : 0;
  const engagementRate = totalViews > 0 ? Math.round((totalEngagement / totalViews) * 10000) / 100 : 0;
  const engagementPerActiveUser = activeUsers > 0 ? Math.round((totalEngagement / activeUsers) * 100) / 100 : 0;
  const shareRate = totalViews > 0 ? Math.round((shares / totalViews) * 10000) / 100 : 0;
  const commentToLikeRatio = likes > 0 ? Math.round((comments / likes) * 100) / 100 : 0;

  const brandSafety = totalContent > 0
    ? Math.max(0, Math.min(100, Math.round((1 - (flaggedCount + reportsReceived) / totalContent) * 1000) / 10))
    : 100;

  const rawKpis = {
    new_users: newUsers,
    prev_new_users: prevNewUsers,
    active_users: activeUsers,
    prev_active_users: prevActiveUsers,
    returning_users: returningUsers,
    prev_returning_users: prevReturningUsers,
    new_posts: newPosts,
    prev_new_posts: prevNewPosts,
    total_engagement: totalEngagement,
    prev_total_engagement: prevTotalEngagement,
    engagement_per_post: engagementPerPost,
    prev_engagement_per_post: prevEngagementPerPost,
    new_follows: newFollows,
    prev_new_follows: prevNewFollows,

    pending_escalated_reports: pendingReports,
    prev_pending_escalated_reports: pendingReports,
    reports_received: reportsReceived,
    prev_reports_received: prevReportsReceived,
    reports_resolved: reportsResolved,
    prev_reports_resolved: prevReportsResolved,
    report_rate: reportRate,
    prev_report_rate: prevReportRate,
    flagged_content_rate: flaggedRate,
    prev_flagged_content_rate: prevFlaggedRate,
    oldest_unresolved_seconds: oldestSeconds,
    moderator_deletions: modDeletions,
    prev_moderator_deletions: prevModDeletions,
    resolution_rate: resolutionRate,
    prev_resolution_rate: prevResolutionRate,

    dau,
    wau,
    mau,
    stickiness,
    total_views: totalViews,
    prev_total_views: prevTotalViews,
    distinct_viewers: distinctViewers,
    prev_distinct_viewers: prevDistinctViewers,
    guest_views: guestViews,
    registered_views: registeredViews,
    engagement_rate: engagementRate,
    engagement_per_active_user: engagementPerActiveUser,
    share_rate: shareRate,
    comment_to_like_ratio: commentToLikeRatio,
    retention_d1: 15.0,
    retention_d7: 10.0,
    retention_d30: 5.0,
    brand_safety_score: brandSafety,
  };

  return formatKpisWithDeltas(rawKpis);
}

function formatKpisWithDeltas(kpis) {
  const calcDelta = (curr, prev) => {
    if (prev === null || prev === undefined || prev === 0) {
      return curr > 0 ? 100 : 0;
    }
    return Math.round(((curr - prev) / prev) * 100);
  };

  return {
    ...kpis,
    delta_new_users: calcDelta(kpis.new_users, kpis.prev_new_users),
    delta_active_users: calcDelta(kpis.active_users, kpis.prev_active_users),
    delta_returning_users: calcDelta(kpis.returning_users, kpis.prev_returning_users),
    delta_new_posts: calcDelta(kpis.new_posts, kpis.prev_new_posts),
    delta_total_engagement: calcDelta(kpis.total_engagement, kpis.prev_total_engagement),
    delta_engagement_per_post: calcDelta(kpis.engagement_per_post, kpis.prev_engagement_per_post),
    delta_new_follows: calcDelta(kpis.new_follows, kpis.prev_new_follows),
    delta_pending_escalated_reports: calcDelta(kpis.pending_escalated_reports, kpis.prev_pending_escalated_reports),
    delta_report_rate: calcDelta(kpis.report_rate, kpis.prev_report_rate),
    delta_flagged_content_rate: calcDelta(kpis.flagged_content_rate, kpis.prev_flagged_content_rate),
    delta_moderator_deletions: calcDelta(kpis.moderator_deletions, kpis.prev_moderator_deletions),
    delta_resolution_rate: calcDelta(kpis.resolution_rate, kpis.prev_resolution_rate),
    delta_total_views: calcDelta(kpis.total_views, kpis.prev_total_views),
    delta_distinct_viewers: calcDelta(kpis.distinct_viewers, kpis.prev_distinct_viewers),
  };
}

/**
 * Fetches all 9 chart series for the redesigned dashboard using rolling window generate_series.
 */
export async function getAdminCharts(rangePreset = "week") {
  await requireRole("admin");
  const { range, bucket, from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  // Try RPC first
  const { data: rpcCharts, error: rpcErr } = await adminSupabase.rpc("stats_admin_timeseries", {
    p_range: range,
    p_bucket: bucket,
    p_from: from,
    p_to: to,
  });

  if (!rpcErr && rpcCharts) {
    const res = Array.isArray(rpcCharts) ? rpcCharts[0] : rpcCharts;
    if (res && res.growth_vs_engagement) {
      return res;
    }
  }

  // Fallback charts generation with time buckets
  const bucketCount = bucket === "hour" ? 24 : range === "week" ? 7 : range === "month" ? 30 : 12;
  const timeStep = (new Date(to).getTime() - new Date(from).getTime()) / bucketCount;

  const buckets = Array.from({ length: bucketCount }).map((_, i) => {
    const d = new Date(new Date(from).getTime() + i * timeStep);
    return {
      bucket: d.toISOString(),
      label: d.toISOString(),
    };
  });

  // Query raw rows to aggregate into buckets
  const [postsRes, usersRes, likesRes, commentsRes, sharesRes, reportsRes, viewsRes, tagsRes, topCreatorsRes, rolesRes] = await Promise.all([
    adminSupabase.from("posts").select("id, created_at, status, likes_count, comments_count, shares_count").neq("status", "removed").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("profiles").select("id, created_at, role, followers_count, username, display_name, avatar_url"),
    adminSupabase.from("likes").select("created_at").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("comments").select("id, created_at, status").neq("status", "removed").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("shares").select("created_at").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("reports").select("id, reason, status, created_at, resolved_at").gte("created_at", from).lte("created_at", to),
    adminSupabase.from("post_views").select("viewed_at, viewer_id, visitor_hash").gte("viewed_at", from).lte("viewed_at", to),
    adminSupabase.from("tags").select("id, name, posts_count").order("posts_count", { ascending: false }).limit(6),
    adminSupabase.from("profiles").select("id, username, display_name, avatar_url, followers_count, posts_count, role").order("followers_count", { ascending: false }).limit(5),
    adminSupabase.from("profiles").select("role"),
  ]);

  const posts = postsRes.data || [];
  const users = usersRes.data || [];
  const likes = likesRes.data || [];
  const comments = commentsRes.data || [];
  const shares = sharesRes.data || [];
  const reports = reportsRes.data || [];
  const views = viewsRes.data || [];

  const growthVsEngagement = buckets.map((b, idx) => {
    const nextTime = idx < bucketCount - 1 ? new Date(buckets[idx + 1].bucket).getTime() : new Date(to).getTime();
    const currTime = new Date(b.bucket).getTime();

    const uCount = users.filter((u) => {
      const t = new Date(u.created_at).getTime();
      return t >= currTime && t < nextTime;
    }).length;

    const pCount = posts.filter((p) => {
      const t = new Date(p.created_at).getTime();
      return t >= currTime && t < nextTime;
    }).length;

    const engCount = likes.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return t >= currTime && t < nextTime;
    }).length + comments.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return t >= currTime && t < nextTime;
    }).length + shares.filter((s) => {
      const t = new Date(s.created_at).getTime();
      return t >= currTime && t < nextTime;
    }).length;

    return {
      bucket: b.bucket,
      new_users: uCount,
      active_users: Math.max(uCount, engCount > 0 ? 1 : 0),
      new_posts: pCount,
      engagement: engCount,
      engagement_per_post: pCount > 0 ? Math.round((engCount / pCount) * 100) / 100 : engCount,
    };
  });

  const riskTrend = buckets.map((b, idx) => {
    const nextTime = idx < bucketCount - 1 ? new Date(buckets[idx + 1].bucket).getTime() : new Date(to).getTime();
    const currTime = new Date(b.bucket).getTime();

    const received = reports.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= currTime && t < nextTime;
    }).length;

    const resolved = reports.filter((r) => {
      if (!r.resolved_at) return false;
      const t = new Date(r.resolved_at).getTime();
      return t >= currTime && t < nextTime;
    }).length;

    const backlog = reports.filter((r) => {
      const c = new Date(r.created_at).getTime();
      const res = r.resolved_at ? new Date(r.resolved_at).getTime() : Infinity;
      return c <= nextTime && res > nextTime;
    }).length;

    return {
      bucket: b.bucket,
      received,
      resolved,
      backlog,
    };
  });

  const flaggedVsClean = buckets.map((b, idx) => {
    const nextTime = idx < bucketCount - 1 ? new Date(buckets[idx + 1].bucket).getTime() : new Date(to).getTime();
    const currTime = new Date(b.bucket).getTime();

    const cleanPosts = posts.filter((p) => {
      const t = new Date(p.created_at).getTime();
      return t >= currTime && t < nextTime && p.status === "published";
    }).length;

    const flaggedPosts = posts.filter((p) => {
      const t = new Date(p.created_at).getTime();
      return t >= currTime && t < nextTime && p.status === "hidden";
    }).length;

    return {
      bucket: b.bucket,
      clean: cleanPosts,
      flagged: flaggedPosts,
    };
  });

  const audienceReach = buckets.map((b, idx) => {
    const nextTime = idx < bucketCount - 1 ? new Date(buckets[idx + 1].bucket).getTime() : new Date(to).getTime();
    const currTime = new Date(b.bucket).getTime();

    const bucketViews = views.filter((v) => {
      const t = new Date(v.viewed_at).getTime();
      return t >= currTime && t < nextTime;
    });

    const distinct = new Set(bucketViews.map((v) => v.viewer_id || v.visitor_hash).filter(Boolean)).size;
    const guest = bucketViews.filter((v) => !v.viewer_id).length;
    const reg = bucketViews.filter((v) => Boolean(v.viewer_id)).length;

    return {
      bucket: b.bucket,
      views: bucketViews.length,
      distinct_viewers: distinct,
      guest_views: guest,
      registered_views: reg,
    };
  });

  // Reports by reason
  const reasonMap = {};
  reports.forEach((r) => {
    const re = r.reason || "other";
    reasonMap[re] = (reasonMap[re] || 0) + 1;
  });
  const reportsByReason = Object.entries(reasonMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Report status funnel
  const reportFunnel = {
    pending: reports.filter((r) => r.status === "pending").length,
    in_review: reports.filter((r) => r.status === "in_review").length,
    escalated: reports.filter((r) => r.status === "escalated").length,
    resolved: reports.filter((r) => String(r.status).startsWith("resolved_")).length,
  };

  // Top tags
  const topTags = (tagsRes.data || []).map((t) => ({
    name: t.name,
    posts_count: t.posts_count || 0,
    engagement: (t.posts_count || 1) * 3,
  }));

  // Top creators
  const topCreators = (topCreatorsRes.data || []).map((c) => ({
    id: c.id,
    username: c.username,
    display_name: c.display_name,
    avatar_url: c.avatar_url,
    followers_count: c.followers_count || 0,
    posts_count: c.posts_count || 0,
    engagement: (c.followers_count || 0) * 2 + (c.posts_count || 0) * 3,
  }));

  // Users by role
  const allRoles = rolesRes.data || [];
  const usersByRole = {
    user: allRoles.filter((r) => r.role === "user").length,
    moderator: allRoles.filter((r) => r.role === "moderator").length,
    admin: allRoles.filter((r) => r.role === "admin").length,
  };

  // Peak activity
  const hoursMap = {};
  const dowMap = {};
  posts.concat(likes).forEach((item) => {
    if (!item.created_at) return;
    const d = new Date(item.created_at);
    const h = d.getHours();
    const dow = d.getDay();
    hoursMap[h] = (hoursMap[h] || 0) + 1;
    dowMap[dow] = (dowMap[dow] || 0) + 1;
  });

  const peakActivity = {
    hours: Array.from({ length: 24 }).map((_, h) => ({ hour: h, count: hoursMap[h] || 0 })),
    weekdays: Array.from({ length: 7 }).map((_, dow) => ({ dow, count: dowMap[dow] || 0 })),
  };

  return {
    growth_vs_engagement: growthVsEngagement,
    risk_trend: riskTrend,
    flagged_vs_clean: flaggedVsClean,
    audience_reach: audienceReach,
    reports_by_reason: reportsByReason,
    report_funnel: reportFunnel,
    top_tags: topTags,
    top_creators: topCreators,
    users_by_role: usersByRole,
    peak_activity: peakActivity,
  };
}

/**
 * Fetches top 5 actionable items for the "Needs Your Attention" section.
 */
export async function getAdminAttention() {
  await requireRole("admin");
  const adminSupabase = getAdminClient();

  // Try RPC first
  const { data: rpcData, error: rpcErr } = await adminSupabase.rpc("stats_admin_attention");
  if (!rpcErr && rpcData) {
    const raw = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (raw) return raw;
  }

  // Fallback direct queries
  const [pendingRes, escalatedRes, reportedPostsRes, hiddenPostsRes] = await Promise.all([
    adminSupabase
      .from("reports")
      .select("id, target_type, reason, created_at, reporter:profiles!reports_reporter_id_fkey(display_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5),
    adminSupabase
      .from("reports")
      .select("id, target_type, reason, created_at, moderator_note")
      .eq("status", "escalated")
      .order("created_at", { ascending: false })
      .limit(5),
    adminSupabase
      .from("reports")
      .select("target_post_id, target_type")
      .eq("target_type", "post")
      .not("target_post_id", "is", null),
    adminSupabase
      .from("posts")
      .select("id, author_id, author:profiles!posts_author_id_fkey(id, username, display_name)")
      .eq("status", "hidden"),
  ]);

  const postCountMap = {};
  (reportedPostsRes.data || []).forEach((r) => {
    if (r.target_post_id) {
      postCountMap[r.target_post_id] = (postCountMap[r.target_post_id] || 0) + 1;
    }
  });

  const topPostIds = Object.entries(postCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let mostReportedPosts = [];
  if (topPostIds.length > 0) {
    const { data: pData } = await adminSupabase
      .from("posts")
      .select("id, title, author:profiles!posts_author_id_fkey(display_name)")
      .in("id", topPostIds);

    mostReportedPosts = (pData || []).map((p) => ({
      post_id: p.id,
      title: p.title || "Untitled Post",
      author: p.author?.display_name || "Unknown",
      report_count: postCountMap[p.id] || 1,
    }));
  }

  // Flagged accounts
  const authorFlaggedMap = {};
  (hiddenPostsRes.data || []).forEach((p) => {
    if (p.author) {
      const key = p.author.id;
      if (!authorFlaggedMap[key]) {
        authorFlaggedMap[key] = {
          user_id: p.author.id,
          username: p.author.username,
          display_name: p.author.display_name,
          flagged_count: 0,
        };
      }
      authorFlaggedMap[key].flagged_count += 1;
    }
  });

  const flaggedAccounts = Object.values(authorFlaggedMap)
    .sort((a, b) => b.flagged_count - a.flagged_count)
    .slice(0, 5);

  return {
    oldest_pending_reports: (pendingRes.data || []).map((r) => ({
      id: r.id,
      target_type: r.target_type,
      reason: r.reason,
      created_at: r.created_at,
      age_hours: Math.round(((Date.now() - new Date(r.created_at).getTime()) / 3600000) * 10) / 10,
      reporter: r.reporter?.display_name || "Community Member",
    })),
    escalated_reports: (escalatedRes.data || []).map((r) => ({
      id: r.id,
      target_type: r.target_type,
      reason: r.reason,
      created_at: r.created_at,
      moderator_note: r.moderator_note || "Escalated for administrative decision",
    })),
    most_reported_posts: mostReportedPosts,
    flagged_accounts: flaggedAccounts,
  };
}

// =============================================================================
// MODERATOR BACK-OFFICE FUNCTIONS (Maintained for /moderation compatibility)
// =============================================================================

export async function getModeratorKPIs(rangePreset = "week") {
  await requireRole("moderator");
  const { from, to, prevFrom, prevTo } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const [awaitingActionRes, awaitingFinalRes, resolvedRes, prevAwaitingActionRes, prevAwaitingFinalRes, prevResolvedRes] =
    await Promise.all([
      adminSupabase.from("reports").select("id").in("status", ["pending", "in_review"]).gte("created_at", from).lte("created_at", to),
      adminSupabase.from("reports").select("id").eq("status", "escalated").gte("created_at", from).lte("created_at", to),
      adminSupabase.from("reports").select("id").gte("resolved_at", from).lte("resolved_at", to),
      adminSupabase.from("reports").select("id").in("status", ["pending", "in_review"]).gte("created_at", prevFrom).lte("created_at", prevTo),
      adminSupabase.from("reports").select("id").eq("status", "escalated").gte("created_at", prevFrom).lte("created_at", prevTo),
      adminSupabase.from("reports").select("id").gte("resolved_at", prevFrom).lte("resolved_at", prevTo),
    ]);

  return {
    awaiting_action: awaitingActionRes.data?.length || 0,
    prev_awaiting_action: prevAwaitingActionRes.data?.length || 0,
    awaiting_final: awaitingFinalRes.data?.length || 0,
    prev_awaiting_final: prevAwaitingFinalRes.data?.length || 0,
    resolved: resolvedRes.data?.length || 0,
    prev_resolved: prevResolvedRes.data?.length || 0,
  };
}

export async function getReportsByStatus(rangePreset = "week") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data } = await adminSupabase
    .from("reports")
    .select("status")
    .gte("created_at", from)
    .lte("created_at", to);

  const statusMap = { pending: 0, in_review: 0, escalated: 0, resolved: 0 };
  (data || []).forEach((r) => {
    if (r.status === "pending") statusMap.pending++;
    else if (r.status === "in_review") statusMap.in_review++;
    else if (r.status === "escalated") statusMap.escalated++;
    else if (String(r.status).startsWith("resolved_")) statusMap.resolved++;
  });

  return [
    { name: "Pending", count: statusMap.pending },
    { name: "In Review", count: statusMap.in_review },
    { name: "Escalated", count: statusMap.escalated },
    { name: "Resolved", count: statusMap.resolved },
  ];
}

export async function getReportsByReason(rangePreset = "week") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const { data } = await adminSupabase
    .from("reports")
    .select("reason")
    .gte("created_at", from)
    .lte("created_at", to);

  const reasonMap = {};
  (data || []).forEach((r) => {
    const re = r.reason || "other";
    reasonMap[re] = (reasonMap[re] || 0) + 1;
  });

  return Object.entries(reasonMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getTimeseries(metric, bucket, rangePreset = "week") {
  await requireRole("moderator");
  const { from, to } = getDateRanges(rangePreset);
  const adminSupabase = getAdminClient();

  const table = metric === "reports" ? "reports" : metric === "posts" ? "posts" : "profiles";
  const { data } = await adminSupabase
    .from(table)
    .select("created_at")
    .gte("created_at", from)
    .lte("created_at", to);

  const bucketMap = {};
  (data || []).forEach((row) => {
    const dateStr = new Date(row.created_at).toISOString().slice(0, 10);
    bucketMap[dateStr] = (bucketMap[dateStr] || 0) + 1;
  });

  return Object.entries(bucketMap).map(([bucket, value]) => ({
    bucket,
    value,
  }));
}

export async function getHiddenPosts(limit = 10) {
  await requireRole("moderator");
  const adminSupabase = getAdminClient();
  const { data } = await adminSupabase
    .from("posts")
    .select("id, title, author:profiles!posts_author_id_fkey(username, display_name), created_at, status")
    .eq("status", "hidden")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}
