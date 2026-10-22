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
import { BarList } from "@/components/dashboard/BarList";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  StatCardSkeleton,
  ChartSkeleton,
  TableSkeleton,
  BarListSkeleton,
} from "@/components/ui/skeletons";
import { SKELETON_SIZES } from "@/lib/constants";
import { formatCompactNumber } from "@/lib/format";
import { getServerAdminT } from "@/lib/i18n/server";
import { AdminLanguageSwitcher } from "@/components/dashboard/AdminLanguageSwitcher";
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
async function AdminKPISection({ range, from, to }) {
  const { t, locale } = await getServerAdminT();
  const [kpis, postsSeries, usersSeries, engagementSeries] = await Promise.all([
    getAdminKPIs(range, from, to),
    getTimeseries("posts", "day", range, from, to),
    getTimeseries("users", "day", range, from, to),
    getEngagementComposition("day", range, from, to),
  ]);

  const postsSparkline = postsSeries.map((d) => Number(d.value || d.count) || 0);
  const usersSparkline = usersSeries.map((d) => Number(d.value || d.count) || 0);
  const engSparkline = engagementSeries.map((d) => Number(d.total || (d.likes + d.comments + d.shares)) || 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
      {/* 1. Total Users */}
      <StatCard
        title={t("admin.kpi_total_users", "Total Users")}
        value={kpis.total_users || 0}
        previousValue={kpis.total_users - (kpis.new_users || 0)}
        subtitle={t("admin.kpi_total_users_sub", "All accounts")}
        icon={Users}
        sparkline={usersSparkline}
        tooltip={t("admin.kpi_total_users_tip", "Total registered user accounts across the entire platform")}
        locale={locale}
      />

      {/* 2. New Users in Range */}
      <StatCard
        title={t("admin.kpi_new_users", "New Users")}
        value={kpis.new_users || 0}
        previousValue={kpis.prev_new_users}
        subtitle={t("admin.kpi_new_users_sub", "In selected period")}
        icon={UserPlus}
        sparkline={usersSparkline}
        tooltip={t("admin.kpi_new_users_tip", "New accounts created within this date range")}
        locale={locale}
      />

      {/* 3. Total Posts */}
      <StatCard
        title={t("admin.kpi_total_posts", "Total Posts")}
        value={kpis.total_posts || 0}
        previousValue={kpis.total_posts - (kpis.new_posts || 0)}
        subtitle={t("admin.kpi_total_posts_sub", "Published posts")}
        icon={FileText}
        sparkline={postsSparkline}
        tooltip={t("admin.kpi_total_posts_tip", "All active, published posts on the platform")}
        locale={locale}
      />

      {/* 4. New Posts in Range */}
      <StatCard
        title={t("admin.kpi_new_posts", "New Posts")}
        value={kpis.new_posts || 0}
        previousValue={kpis.prev_new_posts}
        subtitle={t("admin.kpi_new_posts_sub", "Published in range")}
        icon={TrendingUp}
        sparkline={postsSparkline}
        tooltip={t("admin.kpi_new_posts_tip", "Posts published within the current date range")}
        locale={locale}
      />

      {/* 5. Total Engagement */}
      <StatCard
        title={t("admin.kpi_engagement", "Engagement")}
        value={kpis.total_engagement || 0}
        previousValue={kpis.prev_total_engagement}
        subtitle={t("admin.kpi_engagement_sub", "Likes, comments, shares")}
        icon={Activity}
        sparkline={engSparkline}
        tooltip={t("admin.kpi_engagement_tip", "Sum of all likes, comments, and shares within the period")}
        locale={locale}
      />

      {/* 6. Active Users (DAU) */}
      <StatCard
        title={t("admin.kpi_dau", "Active (DAU)")}
        value={kpis.active_users_dau || 0}
        subtitle={`WAU ${kpis.active_users_wau || 0} · MAU ${kpis.active_users_mau || 0}`}
        icon={CheckCircle2}
        tooltip={t("admin.kpi_dau_tip", "Daily Active Users (last 24h), plus WAU (7d) and MAU (30d) based on activity log")}
        locale={locale}
      />

      {/* 7. Open Reports */}
      <StatCard
        title={t("admin.kpi_open_reports", "Open Reports")}
        value={kpis.open_reports || 0}
        previousValue={kpis.prev_open_reports}
        subtitle={t("admin.kpi_open_reports_sub", "Pending + in review")}
        icon={TriangleAlert}
        tooltip={t("admin.kpi_open_reports_tip", "Total unresolved community safety reports")}
        locale={locale}
      />

      {/* 8. Escalated Reports */}
      <StatCard
        title={t("admin.kpi_escalated_reports", "Escalated")}
        value={kpis.escalated_reports || 0}
        previousValue={kpis.prev_escalated_reports}
        subtitle={t("admin.kpi_escalated_reports_sub", "Awaiting admin")}
        icon={ShieldAlert}
        tooltip={t("admin.kpi_escalated_reports_tip", "High-severity reports elevated by moderators for administrator decision")}
        locale={locale}
      />

      {/* 9. Suspended Users */}
      <StatCard
        title={t("admin.kpi_suspended_users", "Suspended")}
        value={kpis.suspended_users || 0}
        subtitle={t("admin.kpi_suspended_users_sub", "Accounts restricted")}
        icon={Ban}
        tooltip={t("admin.kpi_suspended_users_tip", "User accounts currently suspended by administrators")}
        locale={locale}
      />
    </div>
  );
}

// ==========================================
// ROW 2: GROWTH & ACTIVITY CHARTS
// ==========================================
async function AdminGrowthChartsSection({ range, bucket, from, to }) {
  const { t } = await getServerAdminT();
  const [usersSeries, postsSeries, engagementSeries, dauSeries] = await Promise.all([
    getTimeseries("users", bucket, range, from, to),
    getTimeseries("posts", bucket, range, from, to),
    getEngagementComposition(bucket, range, from, to),
    getTimeseries("active_users", bucket, range, from, to),
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <TimeseriesChart
        data={usersSeries}
        title={t("admin.chart_new_users", "New User Registrations")}
        metricLabel={t("admin.top_users_col_user", "Users")}
        color="#0095F6"
        tooltip={t("admin.chart_new_users", "Daily or weekly user sign-up trajectory")}
      />
      <TimeseriesChart
        data={postsSeries}
        title={t("admin.chart_posts_published", "Posts Published Over Time")}
        metricLabel={t("admin.top_posts_col_post", "Posts")}
        color="#0E8F8F"
        tooltip={t("admin.chart_posts_published", "Volume of news posts published by users and organizations")}
      />
      <EngagementBarChart
        data={engagementSeries}
        title={t("admin.chart_engagement_comp", "Engagement Composition")}
        tooltip={t("admin.chart_engagement_comp", "Daily breakdown of likes, comments, and shares")}
      />
      <TimeseriesChart
        data={dauSeries}
        title={t("admin.chart_dau", "Daily Active Users (DAU)")}
        metricLabel={t("admin.kpi_dau", "Active Users")}
        color="#6D4FD1"
        tooltip={t("admin.chart_dau", "Unique users with sign-in or view actions per day")}
      />
    </div>
  );
}

// ==========================================
// ROW 3: CONTENT PERFORMANCE & MIX
// ==========================================
async function AdminContentPerformanceSection({ range, from, to }) {
  const { t } = await getServerAdminT();
  const [topPosts, topUsers, topTags, contentMix] = await Promise.all([
    getTopPosts(5, range, from, to),
    getTopUsers(5, range, from, to),
    getTopTags(5, range, from, to),
    getContentMix(range, from, to),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Top Posts Table (5 cols) */}
      <div className="lg:col-span-5 border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[var(--ink)]">{t("admin.top_posts_title", "Top Posts by Engagement")}</h2>
            <p className="text-xs text-[var(--ink-muted)]">Score = Likes + 2x Comments + 3x Shares</p>
          </div>
          <Link href="/explore" className="text-xs font-semibold text-[var(--accent)] hover:underline">
            Explore
          </Link>
        </div>

        {topPosts.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--ink-muted)]">
            {t("admin.top_posts_empty", "No published posts recorded for this range.")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)]">
                <tr>
                  <th className="py-2 px-2.5 font-semibold">{t("admin.top_posts_col_post", "Post Title")}</th>
                  <th className="py-2 px-2 font-semibold">{t("admin.top_posts_col_author", "Author")}</th>
                  <th className="py-2 px-2 text-right">{t("admin.top_posts_col_likes", "Likes")}</th>
                  <th className="py-2 px-2 text-right">{t("admin.top_posts_col_comments", "Comms")}</th>
                  <th className="py-2 px-2 text-right">{t("admin.top_posts_col_score", "Score")}</th>
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
        <h2 className="text-sm font-bold text-[var(--ink)]">{t("admin.top_users_title", "Top Creators by Engagement")}</h2>
        {topUsers.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--ink-muted)]">
            {t("admin.top_users_empty", "No active creators in this window.")}
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
                    {formatCompactNumber(u.followers_count || 0)} {t("admin.chart_followers_unit", "followers")}
                  </span>
                  <span className="text-[11px] text-[var(--ink-muted)]">
                    {formatCompactNumber(u.posts_count || 0)} {t("admin.top_posts_col_post", "posts")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Tags BarList & Content Mix Card (3 cols) */}
      <div className="lg:col-span-3 space-y-4 flex flex-col justify-between">
        <BarList data={topTags} title={t("admin.top_tags_title", "Top Hashtags")} limit={5} />

        {/* Content Mix Card */}
        <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs space-y-2.5">
          <h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
            {t("admin.content_mix_title", "Content Mix & Adoption")}
          </h3>
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>{t("admin.content_mix_with_images", "With Images")}</span>
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
                <span>{t("admin.content_mix_with_tags", "With Hashtags")}</span>
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
              <span className="text-[var(--ink-muted)]">{t("admin.content_mix_avg_tags", "Avg Tags / Post")}</span>
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
async function AdminModerationSafetySection({ range, from, to }) {
  const { t, formatRelative } = await getServerAdminT();
  const [reportsStatus, reportsReason, resolutionTime, moderatorWorkload, recentAudit] =
    await Promise.all([
      getReportsByStatus(range, from, to),
      getReportsByReason(range, from, to),
      getModerationResolutionTime(range, from, to),
      getModeratorWorkload(range, from, to),
      getRecentAuditLogs(5),
    ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Reports by status donut */}
      <DonutChart
        data={reportsStatus}
        title={t("admin.chart_reports_status", "Reports by Status")}
        tooltip={t("admin.chart_reports_status", "Proportion of reports in pending, review, escalated, and resolved states")}
      />

      {/* Reports by reason */}
      <HorizontalBarChart
        data={reportsReason}
        title={t("admin.chart_reports_reason", "Reports by Alleged Reason")}
        metricLabel={t("admin.chart_col_count", "Reports")}
        tooltip={t("admin.chart_reports_reason", "Breakdown of user reports by category of violation")}
      />

      {/* Resolution Turnaround & Workload */}
      <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--ink)]">{t("admin.mod_resolution_title", "Resolution Turnaround")}</h3>
          <p className="text-xs text-[var(--ink-muted)]">Median and 90th percentile handling time</p>
        </div>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-center">
            <span className="text-[11px] text-[var(--ink-muted)] block">{t("admin.mod_resolution_median", "Median SLA")}</span>
            <span className="text-lg font-bold text-[var(--ink)] tabular-nums">
              {resolutionTime.median_hours || 0}h
            </span>
          </div>
          <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-center">
            <span className="text-[11px] text-[var(--ink-muted)] block">{t("admin.mod_resolution_p90", "P90 SLA")}</span>
            <span className="text-lg font-bold text-[var(--ink)] tabular-nums">
              {resolutionTime.p90_hours || 0}h
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-[var(--ink)] mb-1.5">{t("admin.mod_workload_title", "Moderator Workload")}</h4>
          {moderatorWorkload.length === 0 ? (
            <p className="text-[11px] text-[var(--ink-muted)]">{t("admin.mod_workload_empty", "No review activity recorded.")}</p>
          ) : (
            <div className="space-y-1.5 text-xs">
              {moderatorWorkload.slice(0, 3).map((m) => (
                <div key={m.moderator_id} className="flex justify-between py-1 border-b border-[var(--line)]/50">
                  <span className="truncate max-w-[120px]">@{m.username}</span>
                  <span className="font-semibold tabular-nums text-[var(--accent)]">
                    {m.handled_count} {t("admin.mod_workload_col_handled", "handled")}
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
          <h3 className="text-sm font-bold text-[var(--ink)]">{t("admin.recent_audit_title", "Recent Privileged Audit Events")}</h3>
          <p className="text-xs text-[var(--ink-muted)]">Enforcement timeline from audit log</p>
        </div>

        {recentAudit.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)] py-6 text-center">{t("admin.recent_audit_empty", "No moderation actions in log.")}</p>
        ) : (
          <div className="space-y-2 text-xs">
            {recentAudit.slice(0, 4).map((a) => (
              <div key={a.id} className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--line)]">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-semibold text-[var(--ink)] capitalize">
                    {a.action.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-[var(--ink-muted)]" suppressHydrationWarning>
                    {formatRelative(a.created_at)}
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
          <span>{t("moderation.header_title", "Moderation Dashboard")}</span>
        </Link>
      </div>
    </div>
  );
}

// ==========================================
// ROW 5: SEARCH & DISCOVERY
// ==========================================
async function AdminSearchDiscoverySection({ range, bucket, from, to }) {
  const { t } = await getServerAdminT();
  const [searchAnalytics, followsSeries, followerDist] = await Promise.all([
    getSearchAnalytics(6, range, from, to),
    getTimeseries("follows", bucket, range, from, to),
    getFollowerDistribution(),
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Top Search Terms + Zero Result Rate */}
      <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Search size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
          <div>
            <h3 className="text-sm font-bold text-[var(--ink)]">{t("admin.search_queries_title", "Top Search Queries")}</h3>
            <p className="text-xs text-[var(--ink-muted)]">Identifies missing content and failed queries</p>
          </div>
        </div>

        {searchAnalytics.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)] py-8 text-center">
            {t("admin.search_queries_empty", "No search queries recorded yet.")}
          </p>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)]">
              <tr>
                <th className="py-2 px-2.5 font-semibold">{t("admin.search_queries_col_query", "Query")}</th>
                <th className="py-2 px-2 font-semibold text-right">{t("admin.search_queries_col_count", "Searches")}</th>
                <th className="py-2 px-2 font-semibold text-right">{t("admin.search_queries_col_results", "Zero-Res %")}</th>
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
        metricLabel={t("admin.top_users_col_followers", "Followers")}
        color="#ED4956"
        tooltip="Growth in peer connections and community following"
      />

      {/* Follower Distribution Chart */}
      <FollowerDistributionChart
        data={followerDist}
        title={t("admin.chart_follower_dist", "Follower Tier Distribution")}
        tooltip="How many accounts have 0, 1-9, 10-99, or 100+ followers"
      />
    </div>
  );
}

// ==========================================
// ROW 6: GOVERNANCE & SECURITY
// ==========================================
async function AdminGovernanceSecuritySection() {
  const { t, formatRelative } = await getServerAdminT();
  const [rolesDist, recentAudit, recentSignups, systemSummary] = await Promise.all([
    getRolesDistribution(),
    getRecentAuditLogs(6),
    getRecentSignups(6),
    getSystemSummary(),
  ]);

  const rolesChartData = [
    { name: t("users_admin.role_user", "User"), count: rolesDist.users || 0 },
    { name: t("users_admin.role_moderator", "Moderator"), count: rolesDist.moderators || 0 },
    { name: t("users_admin.role_admin", "Admin"), count: rolesDist.admins || 0 },
    { name: t("users_admin.status_suspended", "Suspended"), count: rolesDist.suspended || 0 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 1. Role Distribution */}
      <DonutChart
        data={rolesChartData}
        title={t("admin.roles_dist_title", "User Roles Distribution")}
        tooltip="Breakdown of accounts by access tier and suspension status"
      />

      {/* 2. Recent Audit Log */}
      <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <ScrollText size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)]" />
          <h3 className="text-sm font-bold text-[var(--ink)]">{t("admin.recent_audit_title", "Recent Privileged Audit Events")}</h3>
        </div>

        {recentAudit.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)] py-6 text-center">{t("admin.recent_audit_empty", "No audit records found.")}</p>
        ) : (
          <div className="space-y-2 text-xs">
            {recentAudit.slice(0, 5).map((log) => (
              <div key={log.id} className="py-1.5 border-b border-[var(--line)] last:border-none">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[var(--ink)] capitalize">
                    {log.action.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-[var(--ink-muted)] tabular-nums" suppressHydrationWarning>
                    {formatRelative(log.created_at)}
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
          <h3 className="text-sm font-bold text-[var(--ink)]">{t("admin.recent_signups_title", "Recent Registrations")}</h3>
        </div>

        {recentSignups.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)] py-6 text-center">{t("admin.recent_signups_empty", "No recent registrations found.")}</p>
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
                  {u.is_suspended && <Badge variant="danger" size="sm">{t("users_admin.status_suspended", "Suspended")}</Badge>}
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
            <h3 className="text-sm font-bold text-[var(--ink)]">{t("admin.sys_summary_title", "System & Governance Summary")}</h3>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-[var(--line)]">
              <span className="text-[var(--ink-muted)]">{t("admin.sys_summary_db_size", "Database Storage")}</span>
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
            <span>{t("admin.sys_summary_commit", "Commit:")}</span>
            <span className="font-mono">{systemSummary.deployment_commit}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("admin.sys_summary_env", "Environment:")}</span>
            <span className="capitalize">{systemSummary.deployment_env}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN ADMIN DASHBOARD PAGE
// ==========================================
export default async function AdminDashboardPage({ searchParams }) {
  await requireRole("admin");
  const { t } = await getServerAdminT();
  const resolvedParams = await searchParams;
  const range = resolvedParams?.range || "30d";
  const from = resolvedParams?.from || null;
  const to = resolvedParams?.to || null;
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
              {t("admin.header_title", "Admin Analytics Dashboard")}
            </h1>
            <p className="text-xs text-[var(--ink-muted)]">
              {t("admin.header_subtitle", "Executive KPI oversight, growth metrics, moderation safety, search discovery, and platform governance")}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <AdminLanguageSwitcher />
        </div>
      </div>

      {/* Global Controls */}
      <DashboardControls isAdmin={true} showBucket={true} showCompare={true} />

      {/* ROW 1: KPI Stat Cards */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider">
          {t("admin.row1_title", "Row 1 · KPI Executive Overview")}
        </h2>
        <Suspense
          key={`kpi-${range}-${from}-${to}`}
          fallback={
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <StatCardSkeleton key={i} standalone={false} />
              ))}
            </div>
          }
        >
          <AdminKPISection range={range} from={from} to={to} />
        </Suspense>
      </div>

      {/* ROW 2: Growth and Activity Charts */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider">
          {t("admin.row2_title", "Row 2 · Growth & Platform Activity")}
        </h2>
        <Suspense
          key={`growth-${range}-${bucket}-${from}-${to}`}
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <ChartSkeleton key={i} height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />
              ))}
            </div>
          }
        >
          <AdminGrowthChartsSection range={range} bucket={bucket} from={from} to={to} />
        </Suspense>
      </div>

      {/* ROW 3: Content Performance */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider">
          {t("admin.row3_title", "Row 3 · Content Performance & Mix")}
        </h2>
        <Suspense
          key={`content-${range}-${from}-${to}`}
          fallback={
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5"><TableSkeleton rows={5} cols={5} standalone={false} /></div>
              <div className="lg:col-span-4"><TableSkeleton rows={5} cols={3} standalone={false} /></div>
              <div className="lg:col-span-3"><BarListSkeleton count={4} standalone={false} /></div>
            </div>
          }
        >
          <AdminContentPerformanceSection range={range} from={from} to={to} />
        </Suspense>
      </div>

      {/* ROW 4: Moderation and Safety */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider">
          {t("admin.row4_title", "Row 4 · Moderation & Platform Safety")}
        </h2>
        <Suspense
          key={`moderation-${range}-${from}-${to}`}
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />
              <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />
              <StatCardSkeleton standalone={false} />
              <TableSkeleton rows={4} cols={2} standalone={false} />
            </div>
          }
        >
          <AdminModerationSafetySection range={range} from={from} to={to} />
        </Suspense>
      </div>

      {/* ROW 5: Search and Discovery */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider">
          {t("admin.row5_title", "Row 5 · Search & Discovery")}
        </h2>
        <Suspense
          key={`search-${range}-${bucket}-${from}-${to}`}
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TableSkeleton rows={5} cols={3} standalone={false} />
              <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />
              <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />
            </div>
          }
        >
          <AdminSearchDiscoverySection range={range} bucket={bucket} from={from} to={to} />
        </Suspense>
      </div>

      {/* ROW 6: Governance and Security */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider">
          {t("admin.row6_title", "Row 6 · Governance & Security")}
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
