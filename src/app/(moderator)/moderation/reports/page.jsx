import Link from "next/link";
import { requireRole } from "@/server/auth";
import { getReports } from "@/server/dal/reports";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format";
import { ShieldCheck, ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Reports Queue - Moderation",
};

export default async function ReportsQueuePage({ searchParams }) {
  await requireRole("moderator");
  const resolvedParams = await searchParams;
  const status = resolvedParams?.status || "all";
  const offset = parseInt(resolvedParams?.offset || "0", 10);

  const { reports, total } = await getReports({
    status: status === "all" ? null : status,
    limit: 25,
    offset,
  });

  const statuses = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "in_review", label: "In Review" },
    { id: "escalated", label: "Escalated" },
    { id: "resolved_actioned", label: "Actioned" },
    { id: "resolved_dismissed", label: "Dismissed" },
  ];

  const getStatusVariant = (st) => {
    switch (st) {
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

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--line)]">
        <div>
          <Link
            href="/moderation"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] mb-2"
          >
            <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />
            <span>Back to overview</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
            Reports Queue
          </h1>
          <p className="text-xs text-[var(--ink-muted)]">
            Review community safety reports and take corrective action
          </p>
        </div>

        <div className="text-xs text-[var(--ink-muted)] tabular-nums">
          Total: <strong className="text-[var(--ink)]">{total}</strong> reports
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-[var(--surface)] border border-[var(--line)] rounded-lg">
        {statuses.map((s) => {
          const isActive = status === s.id;
          return (
            <Link
              key={s.id}
              href={`/moderation/reports?status=${s.id}`}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                isActive
                  ? "bg-[var(--bg)] text-[var(--ink)] font-semibold shadow-2xs border border-[var(--line)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* Reports Table */}
      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
        {reports.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--ink-muted)]">
            No reports found for this status.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
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
                  <TableCell className="text-xs text-[var(--ink-muted)] max-w-xs truncate">
                    {r.details || "No additional note"}
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
    </div>
  );
}
