import Link from "next/link";
import { requireRole } from "@/server/auth";
import { getReports } from "@/server/dal/reports";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TriangleAlert, ChevronLeft } from "lucide-react";
import { getServerAdminT } from "@/lib/i18n/server";
import { AdminLanguageSwitcher } from "@/components/dashboard/AdminLanguageSwitcher";

export const metadata = {
  title: "Escalated Reports - Admin",
};

export default async function AdminReportsPage() {
  await requireRole("admin");
  const { t, formatRelative } = await getServerAdminT();
  const { reports, total } = await getReports({
    status: "escalated",
    limit: 50,
  });

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">
      <div className="pb-4 border-b border-[var(--line)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] mb-2"
          >
            <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />
            <span>{t("reports_admin.back_dashboard")}</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <TriangleAlert size={22} strokeWidth={2} aria-hidden="true" className="text-[var(--warning)]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
              {t("reports_admin.title")}
            </h1>
          </div>
          <p className="text-xs text-[var(--ink-muted)] mt-1">
            {t("reports_admin.subtitle")}
          </p>
        </div>
        <div className="flex items-center self-end sm:self-auto">
          <AdminLanguageSwitcher />
        </div>
      </div>

      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
        {reports.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--ink-muted)]">
            {t("reports_admin.empty_reports")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports_admin.col_target")}</TableHead>
                <TableHead>{t("reports_admin.col_reason")}</TableHead>
                <TableHead>{t("reports_admin.col_reporter")}</TableHead>
                <TableHead>{t("reports_admin.col_details")}</TableHead>
                <TableHead>{t("reports_admin.col_status")}</TableHead>
                <TableHead>{t("reports_admin.col_escalated")}</TableHead>
                <TableHead className="text-right">{t("reports_admin.col_action")}</TableHead>
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
                    {r.details || t("reports_admin.no_context")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="danger" size="sm">
                      {t("moderation_reports.status_escalated")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[var(--ink-muted)]" suppressHydrationWarning>
                    {formatRelative(r.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/moderation/reports/${r.id}`}>
                      <Button variant="primary" className="text-xs h-7 px-3">
                        {t("reports_admin.btn_adjudicate")}
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
