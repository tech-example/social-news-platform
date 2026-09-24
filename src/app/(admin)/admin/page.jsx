import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/server/auth";
import {
  getAdminKPIs,
  getTimeseries,
  getEngagementComposition,
  getTopPosts,
  getContentMix,
  getReportsByStatus,
  getReportsByReason,
  getModerationResolutionTime,
  getSearchAnalytics,
  getSystemSummary,
} from "@/server/dal/stats";
import { StatCard } from "@/components/dashboard/StatCard";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { TimeseriesChart, EngagementBarChart, DonutChart } from "@/components/dashboard/Charts";
import { BenefitsPanel } from "@/components/dashboard/BenefitsPanel";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeletons";
import { SKELETON_SIZES } from "@/lib/constants";
import { formatCompactNumber } from "@/lib/format";
import {
  LayoutDashboard,
  Users,
  FileText,
  Activity,
  TriangleAlert,
  Ban,
  Download,
  Database,
  Search,
  CheckCircle2,
} from "lucide-react";

export const metadata = {
  title: "Admin Analytics Dashboard - SocialNews",
};

async function AdminKPISection({ range }) {
  const kpis = await getAdminKPIs(range);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      <StatCard
        title="Total Users"
        value={kpis.total_users || 0}
        previousValue={kpis.total_users - (kpis.new_users || 0)}
        subtitle={`+${kpis.new_users || 0} in range`}
        icon={Users}
      />
      <StatCard
        title="Total Posts"
        value={kpis.total_posts || 0}
        previousValue={kpis.total_posts - (kpis.new_posts || 0)}
        subtitle={`+${kpis.new_posts || 0} in range`}
        icon={FileText}
      />
      <StatCard
        title="Engagement"
        value={kpis.total_engagement || 0}
        previousValue={kpis.prev_total_engagement}
        subtitle="Likes + comments + shares"
        icon={Activity}
      />
      <StatCard
        title="Active (DAU)"
        value={kpis.active_users_dau || 0}
        subtitle={`WAU: ${kpis.active_users_wau || 0} · MAU: ${kpis.active_users_mau || 0}`}
        icon={CheckCircle2}
      />
      <StatCard
        title="Open Reports"
        value={kpis.open_reports || 0}
        subtitle={`${kpis.escalated_reports || 0} escalated`}
        icon={TriangleAlert}
      />
      <StatCard
        title="Suspended"
        value={kpis.suspended_users || 0}
        subtitle="Enforced restrictions"
        icon={Ban}
      />
    </div>
  );
}

async function AdminTimeseriesSection({ range }) {
  const [postsTimeseries, userTimeseries, engagementData] = await Promise.all([
    getTimeseries("posts", "day", range),
    getTimeseries("users", "day", range),
    getEngagementComposition("day", range),
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <TimeseriesChart
        data={postsTimeseries}
        title="Posts Published Over Time"
        metricLabel="Posts"
      />
      <TimeseriesChart
        data={userTimeseries}
        title="New User Growth"
        metricLabel="Signups"
      />
      <EngagementBarChart
        data={engagementData}
        title="Engagement Composition (Stacked)"
      />
    </div>
  );
}

async function AdminContentSection({ range }) {
  const [topPosts, contentMix] = await Promise.all([
    getTopPosts(5, range),
    getContentMix(range),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Top Posts Table */}
      <div className="lg:col-span-2 border border-[var(--line)] rounded-xl bg-[var(--bg)] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--ink)]">Top Posts by Engagement</h2>
          <Link href="/explore" className="text-xs font-semibold text-[var(--accent)] hover:underline">
            View explore &rarr;
          </Link>
        </div>

        {topPosts.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--ink-muted)]">
            No published posts recorded for this range.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title & Post</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="text-right">Likes</TableHead>
                <TableHead className="text-right">Comments</TableHead>
                <TableHead className="text-right">Shares</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPosts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs font-medium max-w-xs truncate">
                    <Link href={`/p/${p.id}`} className="hover:underline">
                      {p.title || p.body?.slice(0, 50)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-[var(--ink-muted)]">
                    @{p.author?.username || "unknown"}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">
                    {formatCompactNumber(p.likes_count || 0)}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">
                    {formatCompactNumber(p.comments_count || 0)}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">
                    {formatCompactNumber(p.shares_count || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Content Mix Card */}
      <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-5 shadow-xs flex flex-col justify-between space-y-4">
        <div>
          <h2 className="text-base font-bold text-[var(--ink)] mb-1">Content Mix</h2>
          <p className="text-xs text-[var(--ink-muted)]">Categorization and media adoption ratios</p>
        </div>

        <div className="space-y-4">
          <div className="p-3 bg-[var(--surface)] border border-[var(--line)] rounded-lg">
            <div className="flex justify-between text-xs font-semibold text-[var(--ink)] mb-1">
              <span>Posts with Images</span>
              <span className="tabular-nums">{contentMix.pct_with_images || 0}%</span>
            </div>
            <div className="w-full h-2 bg-[var(--line)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)]"
                style={{ width: `${Math.min(contentMix.pct_with_images || 0, 100)}%` }}
              />
            </div>
          </div>

          <div className="p-3 bg-[var(--surface)] border border-[var(--line)] rounded-lg">
            <div className="flex justify-between text-xs font-semibold text-[var(--ink)] mb-1">
              <span>Posts with Hashtags</span>
              <span className="tabular-nums">{contentMix.pct_with_tags || 0}%</span>
            </div>
            <div className="w-full h-2 bg-[var(--line)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--success)]"
                style={{ width: `${Math.min(contentMix.pct_with_tags || 0, 100)}%` }}
              />
            </div>
          </div>

          <div className="p-3 bg-[var(--surface)] border border-[var(--line)] rounded-lg flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--ink)]">Average Tags per Post</span>
            <span className="font-bold text-[var(--ink)] tabular-nums">
              {contentMix.avg_tags_per_post || 0}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-[var(--ink-muted)]">
          Total posts evaluated: {formatCompactNumber(contentMix.total_posts || 0)}
        </div>
      </div>
    </div>
  );
}

async function AdminModerationMetricsSection({ range }) {
  const [reportsByStatus, reportsByReason, resolutionTime] = await Promise.all([
    getReportsByStatus(range),
    getReportsByReason(range),
    getModerationResolutionTime(range),
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <DonutChart
        data={reportsByStatus}
        title="Reports by Status"
      />

      {/* Reports by Reason List */}
      <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-[var(--ink)]">Reports by Alleged Reason</h2>
        {reportsByReason.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)] py-6 text-center">No reports in this period.</p>
        ) : (
          <div className="space-y-2">
            {reportsByReason.map((r) => (
              <div key={r.reason} className="flex items-center justify-between text-xs">
                <span className="capitalize font-medium text-[var(--ink)]">{r.reason}</span>
                <span className="font-semibold tabular-nums text-[var(--ink-muted)]">{r.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Time KPI */}
      <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-5 shadow-xs flex flex-col justify-between">
        <div>
          <h2 className="text-sm font-bold text-[var(--ink)] mb-1">Resolution Turnaround</h2>
          <p className="text-xs text-[var(--ink-muted)]">Median and 90th percentile handling times</p>
        </div>

        <div className="grid grid-cols-2 gap-3 py-4">
          <div className="p-3 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-center">
            <span className="text-xs text-[var(--ink-muted)] block">Median Time</span>
            <span className="text-xl font-bold text-[var(--ink)] tabular-nums">
              {resolutionTime.median_minutes || 0}m
            </span>
          </div>
          <div className="p-3 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-center">
            <span className="text-xs text-[var(--ink-muted)] block">P90 Time</span>
            <span className="text-xl font-bold text-[var(--ink)] tabular-nums">
              {resolutionTime.p90_minutes || 0}m
            </span>
          </div>
        </div>

        <p className="text-[11px] text-[var(--ink-muted)]">
          Based on {resolutionTime.resolved_count || 0} reports resolved in this window.
        </p>
      </div>
    </div>
  );
}

async function AdminSearchAndSystemSection({ range }) {
  const [searchAnalytics, systemSummary] = await Promise.all([
    getSearchAnalytics(5, range),
    getSystemSummary(),
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Search Analytics */}
      <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Search size={18} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
          <h2 className="text-base font-bold text-[var(--ink)]">Top Search Queries</h2>
        </div>
        {searchAnalytics.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)] py-6 text-center">
            Search term logging active. No queries recorded in this range.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Term</TableHead>
                <TableHead className="text-right">Searches</TableHead>
                <TableHead className="text-right">Zero Results</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searchAnalytics.map((s, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-xs font-semibold">{s.query}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{s.search_count}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{s.zero_results_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* System Summary */}
      <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Database size={18} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
          <h2 className="text-base font-bold text-[var(--ink)]">Database System Summary</h2>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-[var(--line)]">
            <span className="text-[var(--ink-muted)]">Database Storage Size</span>
            <span className="font-bold text-[var(--ink)] tabular-nums">
              {systemSummary.db_size_pretty || "0 MB"}
            </span>
          </div>
          {systemSummary.table_counts && typeof systemSummary.table_counts === "object" && (
            Object.entries(systemSummary.table_counts).map(([tbl, count]) => (
              <div key={tbl} className="flex justify-between py-1 border-b border-[var(--line)]">
                <span className="text-[var(--ink-muted)] capitalize">{tbl} table</span>
                <span className="font-semibold text-[var(--ink)] tabular-nums">{count}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default async function AdminDashboardPage({ searchParams }) {
  await requireRole("admin");
  const resolvedParams = await searchParams;
  const range = resolvedParams?.range || "30d";

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6 space-y-6">
      {/* Dashboard Global Header */}
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
              System health, content metrics, safety enforcement, and user insights
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker />
          <a href="/api/reports/export" download>
            <Button variant="secondary" className="text-xs">
              <Download size={14} strokeWidth={1.75} aria-hidden="true" className="mr-1.5" />
              Export CSV
            </Button>
          </a>
        </div>
      </div>

      {/* Benefits Impact Mapping Panel (Section 11.4) */}
      <BenefitsPanel />

      {/* Row 1: KPI Stat Cards */}
      <Suspense
        fallback={
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <StatCardSkeleton key={i} standalone={false} />
            ))}
          </div>
        }
      >
        <AdminKPISection range={range} />
      </Suspense>

      {/* Row 2: Timeseries Charts */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ChartSkeleton height={SKELETON_SIZES.CHART.ADMIN_HEIGHT} standalone={false} />
            <ChartSkeleton height={SKELETON_SIZES.CHART.ADMIN_HEIGHT} standalone={false} />
            <ChartSkeleton height={SKELETON_SIZES.CHART.ADMIN_HEIGHT} standalone={false} />
          </div>
        }
      >
        <AdminTimeseriesSection range={range} />
      </Suspense>

      {/* Row 3: Content Performance & Content Mix */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TableSkeleton rows={5} cols={5} standalone={false} />
            </div>
            <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-5 shadow-xs">
              <StatCardSkeleton standalone={false} />
            </div>
          </div>
        }
      >
        <AdminContentSection range={range} />
      </Suspense>

      {/* Row 4: Moderation & Resolution Metrics */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ChartSkeleton standalone={false} />
            <StatCardSkeleton standalone={false} />
            <StatCardSkeleton standalone={false} />
          </div>
        }
      >
        <AdminModerationMetricsSection range={range} />
      </Suspense>

      {/* Row 5: Search & Discovery + System Summary */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TableSkeleton rows={5} cols={3} standalone={false} />
            <TableSkeleton rows={5} cols={2} standalone={false} />
          </div>
        }
      >
        <AdminSearchAndSystemSection range={range} />
      </Suspense>
    </div>
  );
}
