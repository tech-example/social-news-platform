"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Clock, TriangleAlert, ArrowRight, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format";
import { useCurrentTimestamp } from "@/lib/use-mounted";

export function ModerationQueueTable({ reports = [], now: propNow }) {
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest"
  const clientNow = useCurrentTimestamp();
  const now = propNow || clientNow;

  const sortedReports = [...reports].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
  });

  const isOverdue = (createdAt, status) => {
    if (!now || (status !== "pending" && status !== "in_review")) return false;
    const ageMs = now - new Date(createdAt).getTime();
    return ageMs >= 24 * 60 * 60 * 1000;
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

  return (
    <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header with Title, Count, and Sort Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} strokeWidth={1.75} aria-hidden="true" className="text-[var(--danger)]" />
            <h2 className="text-base font-bold text-[var(--ink)]">Moderation Queue</h2>
          </div>
          <p className="text-xs text-[var(--ink-muted)]">
            Reports awaiting moderator assessment. Overdue items (&gt;24h) highlighted.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            className="text-xs h-8 px-2.5 flex items-center gap-1.5"
          >
            <ArrowUpDown size={13} strokeWidth={2} aria-hidden="true" />
            <span>Sort: {sortOrder === "newest" ? "Newest First" : "Oldest First"}</span>
          </Button>

          <Link
            href="/moderation/reports"
            className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 ml-1"
          >
            <span>All reports</span>
            <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {sortedReports.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--ink-muted)] space-y-1">
          <p className="font-semibold text-[var(--ink)]">No pending reports in the queue</p>
          <p className="text-xs">All content reports have been reviewed. Queue is clear.</p>
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Target Type</th>
                  <th className="py-2.5 px-3 font-semibold">Reason</th>
                  <th className="py-2.5 px-3 font-semibold">Reporter</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Age / SLA</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {sortedReports.map((r) => {
                  const overdue = isOverdue(r.created_at, r.status);
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-[var(--surface)] transition-colors ${
                        overdue ? "bg-[var(--danger)]/5" : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-semibold capitalize text-[var(--ink)]">
                        {r.target_type}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--surface-strong)] text-[var(--danger)] capitalize">
                          {r.reason}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[var(--ink-muted)]">
                        @{r.reporter?.username || "anonymous"}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={getStatusVariant(r.status)} size="sm">
                          {r.status?.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 tabular-nums" suppressHydrationWarning>
                        <div className="flex items-center gap-1.5">
                          {overdue ? (
                            <span className="inline-flex items-center gap-1 text-[var(--danger)] font-bold text-xs">
                              <TriangleAlert size={13} strokeWidth={2.25} aria-hidden="true" />
                              <span>Overdue ({formatRelativeTime(r.created_at)})</span>
                            </span>
                          ) : (
                            <span className="text-[var(--ink-muted)] flex items-center gap-1 text-xs">
                              <Clock size={12} strokeWidth={1.75} aria-hidden="true" />
                              <span>{formatRelativeTime(r.created_at)}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link href={`/moderation/reports/${r.id}`}>
                          <Button variant="secondary" size="sm" className="h-7 px-3 text-xs">
                            Review
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards (< 768px per section 8.3) */}
          <div className="md:hidden space-y-3">
            {sortedReports.map((r) => {
              const overdue = isOverdue(r.created_at, r.status);
              return (
                <div
                  key={r.id}
                  className={`p-3.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] space-y-2 text-xs ${
                    overdue ? "border-[var(--danger)]/40 bg-[var(--danger)]/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--ink)] capitalize">
                      {r.target_type} Report
                    </span>
                    <Badge variant={getStatusVariant(r.status)} size="sm">
                      {r.status?.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[var(--ink-muted)]">
                    <span>
                      Reason:{" "}
                      <strong className="text-[var(--danger)] capitalize">{r.reason}</strong>
                    </span>
                    <span>By @{r.reporter?.username || "anonymous"}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[var(--line)]">
                    <div suppressHydrationWarning>
                      {overdue ? (
                        <span className="inline-flex items-center gap-1 text-[var(--danger)] font-bold text-xs">
                          <TriangleAlert size={13} strokeWidth={2.25} aria-hidden="true" />
                          <span>Overdue ({formatRelativeTime(r.created_at)})</span>
                        </span>
                      ) : (
                        <span className="text-[var(--ink-muted)] text-xs">
                          {formatRelativeTime(r.created_at)}
                        </span>
                      )}
                    </div>

                    <Link href={`/moderation/reports/${r.id}`}>
                      <Button variant="secondary" size="sm" className="h-7 px-3 text-xs">
                        Review
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
