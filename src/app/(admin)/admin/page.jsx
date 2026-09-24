import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/server/auth";
import {
  getAdminKPIs,
  getTimeseries,
  getEngagementComposition,
  getTopPosts,
  getTopUsers,
  getTopTags,
  getContentMix,
  getReportsByStatus,
  getReportsByReason,
  getModerationResolutionTime,
  getModeratorWorkload,
  getSearchAnalytics,
  getFollowerDistribution,
  getPostingHeatmap,
  getRolesDistribution,
  getRecentAuditLogs,
  getRecentSignups,
  getSystemSummary,
} from "@/server/dal/stats";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardControls } from "@/components/dashboard/DashboardControls";
import {
  TimeseriesChart,
  EngagementBarChart,
  DonutChart,
  HorizontalBarChart,
  FollowerDistributionChart,
} from "@/components/dashboard/Charts";
import { PostingHeatmap } from "@/components/dashboard/PostingHeatmap";
import { BarList } from "@/components/dashboard/BarList";
import { BenefitsPanel } from "@/components/dashboard/BenefitsPanel";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  StatCardSkeleton,
  ChartSkeleton,
  TableSkeleton,
  BarListSkeleton,
} from "@/components/ui/skeletons";
import { SKELETON_SIZES } from "@/lib/constants";
import { formatCompactNumber, formatRelativeTime } from "@/lib/format";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  Activity,
  CheckCircle2,
  TriangleAlert,
  ShieldAlert,
  Ban,
  Search,
  Database,
  ScrollText,
  UserCheck,
  TrendingUp,
} from "lucide-react";

export const metadata = {
  title: "Admin Analytics Dashboard - SocialNews",
};

// ==========================================
// ROW 1: KPI STAT CARDS (9 cards with deltas)
// ==========================================
async function AdminKPISection({ range }) {
  const [kpis, postsSeries, usersSeries, engagementSeries] = await Promise.all([
    getAdminKPIs(range),
    getTimeseries("posts", "day", range),
    getTimeseries("users", "day", range),
    getEngagementComposition("day", range),
  ]);

  const postsSparkline = postsSeries.map((d) => Number(d.value || d.count) || 0);
  const usersSparkline = usersSeries.map((d) => Number(d.value || d.count) || 0);
  const engSparkline = engagementSeries.map((d) => Number(d.total || (d.likes + d.comments + d.shares)) || 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
      {/* 1. Total Users */}
      <StatCard
        title="Total Users"
        value={kpis.total_users || 0}
        previousValue={kpis.total_users - (kpis.new_users || 0)}
        subtitle="All accounts"
        icon={Users}
        sparkline={usersSparkline}
        tooltip="Total registered user accounts across the entire platform"
      />

      {/* 2. New Users in Range */}
      <StatCard
        title="New Users"
        value={kpis.new_users || 0}
        previousValue={kpis.prev_new_users}
        subtitle="In selected period"
        icon={UserPlus}
        sparkline={usersSparkline}
        tooltip="New accounts created within this date range"
      />

      {/* 3. Total Posts */}
      <StatCard
        title="Total Posts"
        value={kpis.total_posts || 0}
        previousValue={kpis.total_posts - (kpis.new_posts || 0)}
        subtitle="Published posts"
        icon={FileText}
        sparkline={postsSparkline}
        tooltip="All active, published posts on the platform"
      />

      {/* 4. New Posts in Range */}
      <StatCard
        title="New Posts"
        value={kpis.new_posts || 0}
        previousValue={kpis.prev_new_posts}
        subtitle="Published in range"
        icon={TrendingUp}
        sparkline={postsSparkline}
        tooltip="Posts published within the current date range"
      />

      {/* 5. Total Engagement */}
      <StatCard
        title="Engagement"
        value={kpis.total_engagement || 0}
        previousValue={kpis.prev_total_engagement}
        subtitle="Likes, comments, shares"
        icon={Activity}
        sparkline={engSparkline}
        tooltip="Sum of all likes, comments, and shares within the period"
      />

      {/* 6. Active Users (DAU) */}
      <StatCard
        title="Active (DAU)"
        value={kpis.active_users_dau || 0}
        subtitle={`WAU ${kpis.active_users_wau || 0} · MAU ${kpis.active_users_mau || 0}`}
        icon={CheckCircle2}
        tooltip="Daily Active Users (last 24h), plus WAU (7d) and MAU (30d) based on activity log"
      />

      {/* 7. Open Reports */}
      <StatCard
        title="Open Reports"
        value={kpis.open_reports || 0}
        previousValue={kpis.prev_open_reports}
        subtitle="Pending & review"
        icon={TriangleAlert}
        tooltip="Reports awaiting initial moderator review"
      />

      {/* 8. Escalated Reports */}
      <StatCard
        title="Escalated"
        value={kpis.escalated_reports || 0}
        previousValue={kpis.prev_escalated_reports}
        subtitle="Awaiting admin action"
        icon={ShieldAlert}
        tooltip="High-severity reports escalated to administrator for final disposition"
      />

      {/* 9. Suspended Users */}
      <StatCard
        title="Suspended"
        value={kpis.suspended_users || 0}
        subtitle="Enforced restrictions"
        icon={Ban}
        tooltip="Total accounts currently under administrative suspension"
      />
    </div>
  );
}

// ==========================================
// ROW 2: GROWTH & ACTIVITY CHARTS
// ==========================================
async function AdminGrowthChartsSection({ range, bucket }) {
  const [usersSeries, postsSeries, engagementSeries, dauSeries] = await Promise.all([
    getTimeseries("users", bucket, range),
    getTimeseries("posts", bucket, range),
    getEngagementComposition(bucket, range),
    getTimeseries("active_users", bucket, range),
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <TimeseriesChart
        data={usersSeries}
        title="New Users Over Time"
        metricLabel="Users"
        color="#0095F6"
        tooltip="Daily or weekly user sign-up trajectory"
      />
      <TimeseriesChart
        data={postsSeries}
        title="Posts Published Over Time"
        metricLabel="Posts"
        color="#0E8F8F"
        tooltip="Volume of news posts published by users and organizations"
      />
      <EngagementBarChart
        data={engagementSeries}
        title="Engagement Composition (Stacked)"
        tooltip="Daily breakdown of likes, comments, and shares"
      />
      <TimeseriesChart
        data={dauSeries}
        title="Daily Active Users (DAU)"
        metricLabel="Active Users"
        color="#6D4FD1"
        tooltip="Unique users with sign-in or view actions per day"
      />
    </div>
  );
}

// ==========================================
// ROW 3: CONTENT PERFORMANCE & MIX
// ==========================================
async function AdminContentPerformanceSection({ range }) {
  const [topPosts, topUsers, topTags, contentMix] = await Promise.all([
    getTopPosts(5, range),
    getTopUsers(5, range),
    getTopTags(5, range),
    getContentMix(range),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Top Posts Table (5 cols) */}
      <div className="lg:col-span-5 border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[var(--ink)]">Top Posts by Engagement</h2>
            <p className="text-xs text-[var(--ink-muted)]">Score = Likes + 2x Comments + 3x Shares</p>
          </div>
          <Link href="/explore" className="text-xs font-semibold text-[var(--accent)] hover:underline">
            Explore
          </Link>
        </div>

        {topPosts.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--ink-muted)]">
            No published posts recorded for this range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)]">
                <tr>
                  <th className="py-2 px-2.5 font-semibold">Post Title</th>
                  <th className="py-2 px-2 font-semibold">Author</th>
                  <th className="py-2 px-2 text-right">Likes</th>
                  <th className="py-2 px-2 text-right">Comms</th>
                  <th className="py-2 px-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {topPosts.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--surface)]">
                    <td className="py-2.5 px-2.5 font-medium max-w-[140px] truncate">
                      <Link href={`/p/${p.id}`} className="hover:underline text-[var(--ink)]">
                        {p.title || "Untitled Post"}
                      </Link>
                    </td>
                    <td className="py-2.5 px-2 text-[var(--ink-muted)] truncate max-w-[90px]">
                      @{p.author_username || "unknown"}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums">
                      {formatCompactNumber(p.likes_count || 0)}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums">
                      {formatCompactNumber(p.comments_count || 0)}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums font-bold text-[var(--accent)]">
                      {formatCompactNumber(p.engagement_score || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Users Table (4 cols) */}
      <div className="lg:col-span-4 border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-[var(--ink)]">Top Creators by Engagement</h2>
        {topUsers.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--ink-muted)]">
            No active creators in this window.
          </p>
        ) : (
          <div className="space-y-2.5">
            {topUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-[var(--surface)]">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar src={u.avatar_url} name={u.display_name || u.username} size="sm" />
                  <div className="truncate">
                    <Link href={`/u/${u.username}`} className="font-semibold text-[var(--ink)] hover:underline truncate block">
                      {u.display_name || u.username}
                    </Link>
                    <span className="text-[11px] text-[var(--ink-muted)] block">@{u.username}</span>
                  </div>
                </div>
                <div className="text-right tabular-nums shrink-0 pl-2">
                  <span className="font-bold text-[var(--ink)] block">
                    {formatCompactNumber(u.followers_count || 0)} followers
                  </span>
                  <span className="text-[11px] text-[var(--ink-muted)]">
                    {formatCompactNumber(u.posts_count || 0)} posts
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Tags BarList & Content Mix Card (3 cols) */}
      <div className="lg:col-span-3 space-y-4 flex flex-col justify-between">
        <BarList data={topTags} title="Top Hashtags" limit={5} />

        {/* Content Mix Card */}
        <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs space-y-2.5">
          <h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
            Content Mix & Adoption
          </h3>
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>With Images</span>
                <span className="tabular-nums">{contentMix.pct_with_images || 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-[var(--surface-strong)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)]"
                  style={{ width: `${Math.min(contentMix.pct_with_images || 0, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>With Hashtags</span>
                <span className="tabular-nums">{contentMix.pct_with_tags || 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-[var(--surface-strong)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--success)]"
                  style={{ width: `${Math.min(contentMix.pct_with_tags || 0, 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--line)] flex justify-between items-center text-[11px]">
              <span className="text-[var(--ink-muted)]">Avg Tags / Post</span>
              <span className="font-bold text-[var(--ink)] tabular-nums">
                {contentMix.avg_tags_per_post || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ROW 4: MODERATION & SAFETY
// ==========================================
async function AdminModerationSafetySection({ range }) {
  const [reportsStatus, reportsReason, resolutionTime, moderatorWorkload, recentAudit] =
    await Promise.all([
      getReportsByStatus(range),
      getReportsByReason(range),
      getModerationResolutionTime(range),
      getModeratorWorkload(range),
      getRecentAuditLogs(5),
    ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Reports by status donut */}
      <DonutChart
        data={reportsStatus}
        title="Reports by Status"
        tooltip="Proportion of reports in pending, review, escalated, and resolved states"
      />

      {/* Reports by reason */}
      <HorizontalBarChart
        data={reportsReason}
        title="Reports by Alleged Reason"
        metricLabel="Reports"
        tooltip="Breakdown of user reports by category of violation"
      />

      {/* Resolution Turnaround & Workload */}
      <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--ink)]">Resolution Turnaround</h3>
          <p className="text-xs text-[var(--ink-muted)]">Median and 90th percentile handling time</p>
        </div>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-center">
            <span className="text-[11px] text-[var(--ink-muted)] block">Median SLA</span>
            <span className="text-lg font-bold text-[var(--ink)] tabular-nums">
              {resolutionTime.median_hours || 0}h
            </span>
          </div>
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-center">
            <span className="text-[11px] text-[var(--ink-muted)] block">P90 SLA</span>
            <span className="text-lg font-bold text-[var(--ink)] tabular-nums">
              {resolutionTime.p90_hours || 0}h
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-[var(--ink)] mb-1.5">Moderator Workload</h4>
          {moderatorWorkload.length === 0 ? (
            <p className="text-[11px] text-[var(--ink-muted)]">No review activity recorded.</p>
          ) : (
            <div className="space-y-1.5 text-xs">
              {moderatorWorkload.slice(0, 3).map((m) => (
                <div key={m.moderator_id} className="flex justify-between py-1 border-b border-[var(--line)]/50">
                  <span className="truncate max-w-[120px]">@{m.username}</span>
                  <span className="font-semibold tabular-nums text-[var(--accent)]">
                    {m.handled_count} handled
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Moderation Actions */}
      <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--ink)]">Recent Safety Actions</h3>
          <p className="text-xs text-[var(--ink-muted)]">Enforcement timeline from audit log</p>
        </div>

        {recentAudit.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)] py-6 text-center">No moderation actions in log.</p>
        ) : (
          <div className="space-y-2 text-xs">
            {recentAudit.slice(0, 4).map((a) => (
              <div key={a.id} className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--line)]">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-semibold text-[var(--ink)] capitalize">
                    {a.action.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-[var(--ink-muted)]" suppressHydrationWarning>
                    {formatRelativeTime(a.created_at)}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--ink-muted)] block truncate">
                  By @{a.actor?.username || "system"} · {a.entity}
                </span>
              </div>
            ))}
          </div>
        )}

        <Link
          href="/moderation/reports"
          className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
        >
          <span>Open moderation center</span>
        </Link>
      </div>
    </div>
  );
}

// ==========================================
// ROW 5: SEARCH & DISCOVERY
// ==========================================
async function AdminSearchDiscoverySection({ range, bucket }) {
  const [searchAnalytics, followsSeries, followerDist] = await Promise.all([
    getSearchAnalytics(6, range),
    getTimeseries("follows", bucket, range),
    getFollowerDistribution(),
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Top Search Terms + Zero Result Rate */}
      <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Search size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
          <div>
            <h3 className="text-sm font-bold text-[var(--ink)]">Search Terms & Zero-Result Rate</h3>
            <p className="text-xs text-[var(--ink-muted)]">Identifies missing content and failed queries</p>
          </div>
        </div>

        {searchAnalytics.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)] py-8 text-center">
            No search events recorded for this range.
          </p>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)]">
              <tr>
                <th className="py-2 px-2.5 font-semibold">Query</th>
                <th className="py-2 px-2 font-semibold text-right">Searches</th>
                <th className="py-2 px-2 font-semibold text-right">Zero-Res %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {searchAnalytics.map((s, idx) => (
                <tr key={idx} className="hover:bg-[var(--surface)]">
                  <td className="py-2 px-2.5 font-medium max-w-[120px] truncate text-[var(--ink)]">
                    &quot;{s.query}&quot;
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">{s.search_count}</td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    <span
                      className={`font-semibold ${
                        s.zero_result_rate > 50 ? "text-[var(--danger)]" : "text-[var(--ink-muted)]"
                      }`}
                    >
                      {s.zero_result_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Follows Created Over Time */}
      <TimeseriesChart
        data={followsSeries}
        title="Follows Created Over Time"
        metricLabel="Follows"
        color="#ED4956"
        tooltip="Growth in peer connections and community following"
      />

      {/* Follower Distribution Chart */}
      <FollowerDistributionChart
        data={followerDist}
        title="Follower Distribution (Tiers)"
        tooltip="How many accounts have 0, 1-9, 10-99, or 100+ followers"
      />
    </div>
  );
}

// ==========================================
// ROW 6: GOVERNANCE & SECURITY
// ==========================================
async function AdminGovernanceSecuritySection() {
  const [rolesDist, recentAudit, recentSignups, systemSummary] = await Promise.all([
    getRolesDistribution(),
    getRecentAuditLogs(6),
    getRecentSignups(6),
    getSystemSummary(),
  ]);

  const rolesChartData = [
    { name: "Users", count: rolesDist.users || 0 },
    { name: "Moderators", count: rolesDist.moderators || 0 },
    { name: "Admins", count: rolesDist.admins || 0 },
    { name: "Suspended", count: rolesDist.suspended || 0 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 1. Role Distribution */}
      <DonutChart
        data={rolesChartData}
        title="Role Distribution"
        tooltip="Breakdown of accounts by access tier and suspension status"
      />

      {/* 2. Recent Audit Log */}
      <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <ScrollText size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)]" />
          <h3 className="text-sm font-bold text-[var(--ink)]">Recent Audit Trail</h3>
        </div>

        {recentAudit.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)] py-6 text-center">No audit records available.</p>
        ) : (
          <div className="space-y-2 text-xs">
            {recentAudit.slice(0, 5).map((log) => (
              <div key={log.id} className="py-1.5 border-b border-[var(--line)] last:border-none">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[var(--ink)] capitalize">
                    {log.action.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-[var(--ink-muted)] tabular-nums" suppressHydrationWarning>
                    {formatRelativeTime(log.created_at)}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--ink-muted)] block truncate">
                  By @{log.actor?.username || "system"} · {log.entity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Recent Sign-Ups */}
      <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
          <h3 className="text-sm font-bold text-[var(--ink)]">Recent Sign-ups</h3>
        </div>

        {recentSignups.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)] py-6 text-center">No signups found.</p>
        ) : (
          <div className="space-y-2 text-xs">
            {recentSignups.slice(0, 5).map((u) => (
              <div key={u.id} className="flex items-center justify-between py-1 border-b border-[var(--line)] last:border-none">
                <div className="flex items-center gap-2 truncate">
                  <Avatar src={u.avatar_url} name={u.display_name || u.username} size="xs" />
                  <div className="truncate">
                    <span className="font-semibold text-[var(--ink)] block truncate">
                      {u.display_name || u.username}
                    </span>
                    <span className="text-[10px] text-[var(--ink-muted)] block">@{u.username}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant={u.role === "admin" ? "danger" : u.role === "moderator" ? "warning" : "neutral"} size="sm">
                    {u.role}
                  </Badge>
                  {u.is_suspended && <Badge variant="danger" size="sm">Banned</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Database System Summary */}
      <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Database size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--ink)]">Database System Summary</h3>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-[var(--line)]">
              <span className="text-[var(--ink-muted)]">Database Storage</span>
              <span className="font-bold text-[var(--ink)] tabular-nums">
                {systemSummary.db_size_pretty || "Active"}
              </span>
            </div>
            {systemSummary.table_counts &&
              Object.entries(systemSummary.table_counts).slice(0, 5).map(([tbl, cnt]) => (
                <div key={tbl} className="flex justify-between py-0.5 text-[11px]">
                  <span className="text-[var(--ink-muted)] capitalize">{tbl}</span>
                  <span className="font-semibold tabular-nums">{cnt} rows</span>
                </div>
              ))}
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--line)] text-[10px] text-[var(--ink-muted)] space-y-0.5">
          <div className="flex justify-between">
            <span>Commit:</span>
            <span className="font-mono">{systemSummary.deployment_commit}</span>
          </div>
          <div className="flex justify-between">
            <span>Environment:</span>
            <span className="capitalize">{systemSummary.deployment_env}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// IMPACT PANEL WIDGET (B1-B6 + Heatmap)
// ==========================================
async function AdminImpactSection({ range }) {
  const heatmapData = await getPostingHeatmap(range);
  return <BenefitsPanel heatmapData={heatmapData} />;
}

// ==========================================
// MAIN ADMIN DASHBOARD PAGE
// ==========================================
export default async function AdminDashboardPage({ searchParams }) {
  await requireRole("admin");
  const resolvedParams = await searchParams;
  const range = resolvedParams?.range || "30d";
  const bucket =
    resolvedParams?.bucket ||
    (range === "today" ? "day" : range === "90d" ? "week" : "day");

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--surface-strong)] border border-[var(--line)]">
            <LayoutDashboard size={24} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
              Admin Analytics Dashboard
            </h1>
            <p className="text-xs text-[var(--ink-muted)]">
              Executive KPI oversight, growth metrics, moderation safety, search discovery, and platform governance
            </p>
          </div>
        </div>
      </div>

      {/* Global Controls */}
      <DashboardControls isAdmin={true} showBucket={true} showCompare={true} />

      {/* Section: Expected Benefits (B1–B6) & Impact Mapping */}
      <Suspense fallback={<TableSkeleton rows={3} cols={3} standalone={false} />}>
        <AdminImpactSection range={range} />
      </Suspense>

      {/* ROW 1: KPI Stat Cards */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider">
          Row 1 · Executive Key Performance Indicators
        </h2>
        <Suspense
          fallback={
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <StatCardSkeleton key={i} standalone={false} />
              ))}
            </div>
          }
        >
          <AdminKPISection range={range} />
        </Suspense>
      </div>

      {/* ROW 2: Growth and Activity Charts */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider">
          Row 2 · Growth & Platform Activity
        </h2>
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <ChartSkeleton key={i} height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />
              ))}
            </div>
          }
        >
          <AdminGrowthChartsSection range={range} bucket={bucket} />
        </Suspense>
      </div>

      {/* ROW 3: Content Performance */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider">
          Row 3 · Content Performance & Mix
        </h2>
        <Suspense
          fallback={
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5"><TableSkeleton rows={5} cols={5} standalone={false} /></div>
              <div className="lg:col-span-4"><TableSkeleton rows={5} cols={3} standalone={false} /></div>
              <div className="lg:col-span-3"><BarListSkeleton count={4} standalone={false} /></div>
            </div>
          }
        >
          <AdminContentPerformanceSection range={range} />
        </Suspense>
      </div>

      {/* ROW 4: Moderation and Safety */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider">
          Row 4 · Moderation & Platform Safety
        </h2>
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />
              <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />
              <StatCardSkeleton standalone={false} />
              <TableSkeleton rows={4} cols={2} standalone={false} />
            </div>
          }
        >
          <AdminModerationSafetySection range={range} />
        </Suspense>
      </div>

      {/* ROW 5: Search and Discovery */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider">
          Row 5 · Search & Discovery
        </h2>
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TableSkeleton rows={5} cols={3} standalone={false} />
              <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />
              <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />
            </div>
          }
        >
          <AdminSearchDiscoverySection range={range} bucket={bucket} />
        </Suspense>
      </div>

      {/* ROW 6: Governance and Security */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider">
          Row 6 · Governance & Security
        </h2>
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />
              <TableSkeleton rows={5} cols={2} standalone={false} />
              <TableSkeleton rows={5} cols={3} standalone={false} />
              <StatCardSkeleton standalone={false} />
            </div>
          }
        >
          <AdminGovernanceSecuritySection />
        </Suspense>
      </div>
    </div>
  );
}
