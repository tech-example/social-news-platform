import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/server/auth";
import { getModeratorKPIs, getReportsByStatus, getTimeseries } from "@/server/dal/stats";
import { getReports } from "@/server/dal/reports";
import { StatCard } from "@/components/dashboard/StatCard";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { TimeseriesChart, DonutChart } from "@/components/dashboard/Charts";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeletons";
import { formatRelativeTime } from "@/lib/format";
import { ShieldCheck, Clock, TriangleAlert, CircleCheck, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Moderation Dashboard - SocialNews",
};

const getStatusVariant = (status) => {
  switch (status) {
    case "pending":
      return "warning";
    case "in_review":
      return "neutral";
    case "escalated":
      return "danger";
    case "resolved_actioned":
      return "success";
    case "resolved_dismissed":
      return "neutral";
    default:
      return "neutral";
  }
};

async function ModeratorKPIsSection({ range }) {
  const kpis = await getModeratorKPIs(range);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        title="Awaiting Action"
        value={kpis.awaiting_action || 0}
        subtitle="Pending or currently in review"
        icon={Clock}
      />
      <StatCard
        title="Escalated to Admin"
        value={kpis.awaiting_final || 0}
        subtitle="Awaiting administrative ruling"
        icon={TriangleAlert}
      />
      <StatCard
        title="Resolved in Period"
        value={kpis.resolved_in_range || 0}
        subtitle="Actioned or dismissed"
        icon={CircleCheck}
      />
    </div>
  );
}

async function ModeratorChartsSection({ range }) {
  const [reportsTimeseries, reportsByStatus] = await Promise.all([
    getTimeseries("reports", "day", range),
    getReportsByStatus(range),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TimeseriesChart
        data={reportsTimeseries}
        title="Reports Received Over Time"
        metricLabel="Reports"
      />
      <DonutChart
        data={reportsByStatus}
        title="Reports by Status"
      />
    </div>
  );
}

async function ModerationQueueSection() {
  const queue = await getReports({ status: "pending", limit: 5 });

  return (
    <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[var(--ink)]">Urgent Pending Reports</h2>
          <p className="text-xs text-[var(--ink-muted)]">Reports requiring moderator initial assessment</p>
        </div>
        <Link
          href="/moderation/reports?status=pending"
          className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
        >
          <span>Open queue</span>
          <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>

      {queue.reports.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--ink-muted)]">
          No pending reports in the queue. All caught up!
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Target</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reported</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold capitalize text-xs">
                  {r.target_type}
                </TableCell>
                <TableCell className="capitalize text-xs font-medium text-[var(--danger)]">
                  {r.reason}
                </TableCell>
                <TableCell className="text-xs text-[var(--ink-muted)]">
                  @{r.reporter?.username || "anonymous"}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(r.status)} size="sm">
                    {r.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-[var(--ink-muted)]" suppressHydrationWarning>
                  {formatRelativeTime(r.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/moderation/reports/${r.id}`}>
                    <Button variant="secondary" className="text-xs h-7 px-3">
                      Review
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default async function ModerationDashboardPage({ searchParams }) {
  await requireRole("moderator");
  const resolvedParams = await searchParams;
  const range = resolvedParams?.range || "30d";

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">
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
              Two-tier safety queue & platform enforcement overview
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DateRangePicker />
          <Link href="/moderation/reports">
            <Button className="text-xs">
              View All Reports
            </Button>
          </Link>
        </div>
      </div>

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
        <ModeratorKPIsSection range={range} />
      </Suspense>

      {/* Row 2: Charts */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton standalone={false} />
            <ChartSkeleton standalone={false} />
          </div>
        }
      >
        <ModeratorChartsSection range={range} />
      </Suspense>

      {/* Row 3: Pending Queue Preview */}
      <Suspense fallback={<TableSkeleton rows={5} cols={6} standalone={false} />}>
        <ModerationQueueSection />
      </Suspense>
    </div>
  );
}
