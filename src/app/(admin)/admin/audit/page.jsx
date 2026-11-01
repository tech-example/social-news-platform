import Link from "next/link";
import { requireRole } from "@/server/auth";
import { getAuditLogs } from "@/server/dal/audit";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollText, ChevronLeft } from "lucide-react";
import { getDisplayName } from "@/lib/user";
import { getServerAdminT } from "@/lib/i18n/server";
import { AdminLanguageSwitcher } from "@/components/dashboard/AdminLanguageSwitcher";

export const metadata = {
  title: "System Audit Logs - Admin",
};

export default async function AuditLogPage({ searchParams }) {
  await requireRole("admin");
  const { t, formatRelative } = await getServerAdminT();
  const resolvedParams = await searchParams;
  const offset = parseInt(resolvedParams?.offset || "0", 10);

  const { logs, total } = await getAuditLogs({ limit: 40, offset });

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6 space-y-6">
      <div className="pb-4 border-b border-[var(--line)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] mb-2"
          >
            <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />
            <span>{t("audit_admin.back_dashboard")}</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <ScrollText size={22} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
              {t("audit_admin.title")}
            </h1>
          </div>
          <p className="text-xs text-[var(--ink-muted)] mt-1">
            {t("audit_admin.subtitle")}
          </p>
        </div>
        <div className="flex items-center self-end sm:self-auto">
          <AdminLanguageSwitcher />
        </div>
      </div>

      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
        {logs.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--ink-muted)]">
            {t("audit_admin.empty_logs")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("audit_admin.col_timestamp")}</TableHead>
                <TableHead>{t("audit_admin.col_actor")}</TableHead>
                <TableHead>{t("audit_admin.col_action")}</TableHead>
                <TableHead>{t("audit_admin.col_target")}</TableHead>
                <TableHead>{t("audit_admin.col_details")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-[var(--ink-muted)] tabular-nums" suppressHydrationWarning>
                    {formatRelative(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <strong className="text-[var(--ink)]">
                        {getDisplayName(log.actor)}
                      </strong>
                      <span className="text-[11px] text-[var(--ink-muted)] capitalize">
                        {log.actor?.role === "admin"
                          ? t("users_admin.role_admin")
                          : log.actor?.role === "moderator"
                            ? t("users_admin.role_moderator")
                            : (log.actor?.role || "internal")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral" size="sm" className="font-mono text-[11px]">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[var(--ink)]">
                    <span className="capitalize">{log.target_type}</span>{" "}
                    {log.target_id && (
                      <code className="text-[11px] text-[var(--ink-muted)]">
                        ({log.target_id.slice(0, 8)})
                      </code>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--ink-muted)] max-w-sm truncate">
                    {log.details ? JSON.stringify(log.details) : "—"}
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
