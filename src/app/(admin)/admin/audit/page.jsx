import Link from "next/link";
import { requireRole } from "@/server/auth";
import { getAuditLogs } from "@/server/dal/audit";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/format";
import { ScrollText, ChevronLeft } from "lucide-react";

export const metadata = {
  title: "System Audit Logs - Admin",
};

export default async function AuditLogPage({ searchParams }) {
  await requireRole("admin");
  const resolvedParams = await searchParams;
  const offset = parseInt(resolvedParams?.offset || "0", 10);

  const { logs, total } = await getAuditLogs({ limit: 40, offset });

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6 space-y-6">
      <div className="pb-4 border-b border-[var(--line)]">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] mb-2"
        >
          <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />
          <span>Back to dashboard</span>
        </Link>
        <div className="flex items-center gap-2.5">
          <ScrollText size={22} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
            System Audit Trail
          </h1>
        </div>
        <p className="text-xs text-[var(--ink-muted)] mt-1">
          Immutable log of privileged administrative and moderation events
        </p>
      </div>

      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
        {logs.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--ink-muted)]">
            No audit logs recorded yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-[var(--ink-muted)] tabular-nums" suppressHydrationWarning>
                    {formatRelativeTime(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <strong className="text-[var(--ink)]">
                        @{log.actor?.username || "system"}
                      </strong>
                      <span className="text-[11px] text-[var(--ink-muted)] capitalize">
                        {log.actor?.role || "internal"}
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
