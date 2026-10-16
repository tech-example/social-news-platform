import Link from "next/link";
import { requireRole } from "@/server/auth";
import { getReports } from "@/server/dal/reports";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ChevronLeft, ShieldAlert } from "lucide-react";
import { getServerAdminT } from "@/lib/i18n/server";
import { AdminLanguageSwitcher } from "@/components/dashboard/AdminLanguageSwitcher";

export const metadata = {
  title: "Reports Queue - Moderation",
};

export default async function ReportsQueuePage({ searchParams }) {
  await requireRole("moderator");
  const { t, formatNumber, formatRelative } = await getServerAdminT();
  const resolvedParams = await searchParams;
  const status = resolvedParams?.status || "all";
  const offset = parseInt(resolvedParams?.offset || "0", 10);

  const { reports, total } = await getReports({
    status: status === "all" ? null : status,
    limit: 25,
    offset,
  });

  const statuses = [
    { id: "all", label: t("moderation.tab_all", "All") },
    { id: "pending", label: t("moderation.tab_pending", "Pending") },
    { id: "in_review", label: t("moderation.tab_in_review", "In Review") },
    { id: "escalated", label: t("moderation.tab_escalated", "Escalated") },
    { id: "resolved_actioned", label: t("moderation.tab_resolved_actioned", "Actioned") },
    { id: "resolved_dismissed", label: t("moderation.tab_resolved_dismissed", "Dismissed") },
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
            <span>{t("moderation.reports_back_overview", "Back to overview")}</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
            {t("moderation.reports_queue_title", "Reports Queue")}
          </h1>
          <p className="text-xs text-[var(--ink-muted)]">
            {t("moderation.reports_queue_subtitle", "Review community safety reports and take corrective action")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AdminLanguageSwitcher />
          <div className="text-xs text-[var(--ink-muted)] tabular-nums">
            {t("moderation.reports_total", { total: formatNumber(total) }, `Total: ${formatNumber(total)} reports`)}
          </div>
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
              prefetch
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-[var(--bg)] text-[var(--ink)] shadow-2xs border border-[var(--line)]"
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
            {t("moderation.reports_empty", "No reports found for this status.")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("moderation.reports_col_target", "Target")}</TableHead>
                <TableHead>{t("moderation.reports_col_reason", "Reason")}</TableHead>
                <TableHead>{t("moderation.reports_col_reporter", "Reporter")}</TableHead>
                <TableHead>{t("moderation.reports_col_details", "Details")}</TableHead>
                <TableHead>{t("moderation.reports_col_status", "Status")}</TableHead>
                <TableHead>{t("moderation.reports_col_reported", "Reported")}</TableHead>
                <TableHead className="text-right">{t("moderation.reports_col_action", "Action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold capitalize text-xs">
                    <div className="inline-flex items-center gap-1.5 flex-wrap">
                      <span>{r.target_type}</span>
                      {r.is_flagged && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--surface-strong)] text-[var(--warning)] border border-[var(--line)]">
                          <ShieldAlert size={10} strokeWidth={2} aria-hidden="true" />
                          <span>Flagged</span>
                        </span>
                      )}
                    </div>
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
                    {formatRelative(r.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/moderation/reports/${r.id}`}>
                      <Button variant="secondary" className="text-xs h-7 px-3">
                        {t("moderation.queue_btn_review", "Review")}
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
