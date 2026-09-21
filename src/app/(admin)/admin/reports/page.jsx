import Link from "next/link";
import { requireRole } from "@/server/auth";
import { getReports } from "@/server/dal/reports";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format";
import { TriangleAlert, ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Escalated Reports - Admin",
};

export default async function AdminReportsPage() {
  await requireRole("admin");
  const { reports, total } = await getReports({
    status: "escalated",
    limit: 50,
  });

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">
      <div className="pb-4 border-b border-[var(--line)]">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] mb-2"
        >
          <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />
          <span>Back to dashboard</span>
        </Link>
        <div className="flex items-center gap-2.5">
          <TriangleAlert size={22} strokeWidth={2} aria-hidden="true" className="text-[var(--warning)]" />
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
            Escalated Reports Awaiting Final Decision
          </h1>
        </div>
        <p className="text-xs text-[var(--ink-muted)] mt-1">
          Reports elevated by moderators for administrator adjudication
        </p>
      </div>

      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
        {reports.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--ink-muted)]">
            No escalated reports pending admin review. All clear!
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
                <TableHead>Escalated</TableHead>
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
                    {r.details || "No additional context"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="danger" size="sm">
                      escalated
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[var(--ink-muted)]" suppressHydrationWarning>
                    {formatRelativeTime(r.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/moderation/reports/${r.id}`}>
                      <Button variant="primary" className="text-xs h-7 px-3">
                        Adjudicate
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
