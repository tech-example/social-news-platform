import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/server/auth";
import {
  getModeratorKPIs,
  getReportsByStatus,
  getReportsByReason,
  getTimeseries,
  getHiddenPosts,
} from "@/server/dal/stats";
import { getReports } from "@/server/dal/reports";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardControls } from "@/components/dashboard/DashboardControls";
import {
  TimeseriesChart,
  DonutChart,
  HorizontalBarChart,
} from "@/components/dashboard/Charts";
import { ModerationQueueTable } from "@/components/dashboard/ModerationQueueTable";
import { HiddenContentTable } from "@/components/dashboard/HiddenContentTable";
import { Button } from "@/components/ui/button";
import {
  StatCardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/ui/skeletons";
import { SKELETON_SIZES } from "@/lib/constants";
import {
  ShieldCheck,
  Clock,
  TriangleAlert,
  CircleCheck,
  ShieldAlert,
} from "lucide-react";

export const metadata = {
  title: "Moderator Dashboard - SocialNews",
};

// 1. KPI Cards Widget
async function ModeratorKPIsWidget({ range }) {
  const kpis = await getModeratorKPIs(range);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        title="Awaiting Action"
        value={kpis.awaiting_action || 0}
        previousValue={kpis.prev_awaiting_action}
        subtitle="Pending or in initial review"
        icon={Clock}
        tooltip="Content reports requiring moderator review and initial disposition"
      />
      <StatCard
        title="Awaiting Final Decision"
        value={kpis.awaiting_final || 0}
        previousValue={kpis.prev_awaiting_final}
        subtitle="Escalated to administrator"
        icon={TriangleAlert}
        tooltip="High-severity or appeal reports awaiting administrator ruling"
      />
      <StatCard
        title="Resolved in Range"
        value={kpis.resolved_in_range || 0}
        previousValue={kpis.prev_resolved_in_range}
        subtitle="Actioned or dismissed"
        icon={CircleCheck}
        tooltip="Reports where final moderation ruling was completed within the selected period"
      />
    </div>
  );
}

// 2. Reports Over Time Widget
async function ReportsTimeseriesWidget({ range, bucket }) {
  const data = await getTimeseries("reports", bucket, range);
  return (
    <TimeseriesChart
      data={data}
      title="Reports Received Over Time"
      metricLabel="Reports"
      color="#B7791F"
      tooltip="Volume of content and account reports filed over time"
    />
  );
}

// 3. Reports By Status Donut Widget
async function ReportsStatusWidget({ range }) {
  const data = await getReportsByStatus(range);
  return (
    <DonutChart
      data={data}
      title="Reports by Status"
      tooltip="Distribution of reports across pending, review, escalation, and resolution states"
    />
  );
}

// 4. Reports By Reason Horizontal Bar Widget
async function ReportsReasonWidget({ range }) {
  const data = await getReportsByReason(range);
  return (
    <HorizontalBarChart
      data={data}
      title="Reports by Alleged Reason"
      metricLabel="Reports"
      tooltip="Breakdown of alleged violations reported by users"
    />
  );
}

// 5. Moderation Queue Widget
async function QueueWidget() {
  const res = await getReports({ limit: 20 });
  return <ModerationQueueTable reports={res.reports || []} />;
}

// 6. Hidden Content Widget
async function HiddenContentWidget() {
  const hiddenPosts = await getHiddenPosts(10);
  return <HiddenContentTable posts={hiddenPosts} />;
}

export default async function ModerationDashboardPage({ searchParams }) {
  await requireRole("moderator");
  const resolvedParams = await searchParams;
  const range = resolvedParams?.range || "30d";
  const bucket =
    resolvedParams?.bucket ||
    (range === "today" ? "day" : range === "90d" ? "week" : "day");

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--surface-strong)] border border-[var(--line)]">
            <ShieldCheck size={24} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
              Moderation Dashboard
            </h1>
            <p className="text-xs text-[var(--ink-muted)]">
              Two-tier safety enforcement, report queues, and content oversight
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/moderation/reports">
            <Button variant="secondary" size="sm" className="text-xs">
              <ShieldAlert size={14} strokeWidth={1.75} aria-hidden="true" className="mr-1.5" />
              <span>Full Report Queue</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Controls */}
      <DashboardControls isAdmin={false} showBucket={true} showCompare={true} />

      {/* Row 1: KPI Stat Cards */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCardSkeleton standalone={false} />
            <StatCardSkeleton standalone={false} />
            <StatCardSkeleton standalone={false} />
          </div>
        }
      >
        <ModeratorKPIsWidget range={range} />
      </Suspense>

      {/* Row 2: Charts (Timeseries + Donut + Reason Bars) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Suspense fallback={<ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />}>
          <ReportsTimeseriesWidget range={range} bucket={bucket} />
        </Suspense>

        <Suspense fallback={<ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />}>
          <ReportsStatusWidget range={range} />
        </Suspense>

        <Suspense fallback={<ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />}>
          <ReportsReasonWidget range={range} />
        </Suspense>
      </div>

      {/* Row 3: Report Queue Table */}
      <Suspense fallback={<TableSkeleton rows={5} cols={6} standalone={false} />}>
        <QueueWidget />
      </Suspense>

      {/* Row 4: Recently Hidden Content with Restore Action */}
      <Suspense fallback={<TableSkeleton rows={4} cols={4} standalone={false} />}>
        <HiddenContentWidget />
      </Suspense>
    </div>
  );
}
