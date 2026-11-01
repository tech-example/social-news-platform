"use client";
import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  FileText,
  UserX,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAdminLocale } from "@/lib/i18n/AdminLocaleProvider";

export function NeedsAttentionList({ data = {} }) {
  const [activeTab, setActiveTab] = useState("pending");
  const { t, formatRelative } = useAdminLocale();

  const oldestPending = data.oldest_pending_reports || [];
  const escalatedReports = data.escalated_reports || [];
  const mostReportedPosts = data.most_reported_posts || [];
  const flaggedAccounts = data.flagged_accounts || [];

  const tabs = [
    {
      id: "pending",
      label: t("admin.attention_pending_tab", "Oldest Pending"),
      count: oldestPending.length,
      icon: Clock,
    },
    {
      id: "escalated",
      label: t("admin.attention_escalated_tab", "Escalated Awaiting Admin"),
      count: escalatedReports.length,
      icon: ShieldAlert,
    },
    {
      id: "reported_posts",
      label: t("admin.attention_posts_tab", "Most Reported Posts"),
      count: mostReportedPosts.length,
      icon: FileText,
    },
    {
      id: "flagged_accounts",
      label: t("admin.attention_accounts_tab", "Most Flagged Creators"),
      count: flaggedAccounts.length,
      icon: UserX,
    },
  ];

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)]">
            <AlertTriangle size={20} strokeWidth={2} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--ink)]">
              {t("admin.attention_title", "Needs Your Attention")}
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              {t("admin.attention_sub", "Top priority items requiring administrative intervention or moderator follow-up")}
            </p>
          </div>
        </div>

        <Link
          href="/moderation/reports"
          className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1 self-start sm:self-center"
        >
          <span>{t("admin.attention_view_all_queue", "Open Full Moderation Queue")}</span>
          <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--line)] bg-[var(--surface)] overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--bg)]"
                  : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              <Icon size={14} strokeWidth={2} aria-hidden="true" />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums ${
                  isActive
                    ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "bg-[var(--surface-strong)] text-[var(--ink-muted)]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content panel */}
      <div className="p-4 sm:p-5">
        {activeTab === "pending" && (
          oldestPending.length === 0 ? (
            <p className="text-xs text-[var(--ink-muted)] py-8 text-center">
              {t("admin.attention_no_pending", "No pending community reports waiting in queue.")}
            </p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {oldestPending.map((item) => (
                <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 first:pt-0 last:pb-0">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning" size="sm">
                        {item.reason}
                      </Badge>
                      <span className="text-xs font-semibold text-[var(--ink)] capitalize">
                        {item.target_type} report
                      </span>
                      <span className="text-xs text-[var(--ink-muted)]">
                        by {item.reporter}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--danger)] font-medium flex items-center gap-1">
                      <Clock size={12} strokeWidth={2} aria-hidden="true" />
                      <span>Waiting for {item.age_hours} hours</span>
                    </div>
                  </div>

                  <Link
                    href={`/moderation/reports/${item.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface)] transition-colors self-start sm:self-center shrink-0"
                  >
                    <span>Review Report</span>
                    <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                  </Link>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "escalated" && (
          escalatedReports.length === 0 ? (
            <p className="text-xs text-[var(--ink-muted)] py-8 text-center">
              {t("admin.attention_no_escalated", "No escalated reports awaiting administrator decision.")}
            </p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {escalatedReports.map((item) => (
                <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 first:pt-0 last:pb-0">
                  <div className="space-y-1 min-w-0 max-w-xl">
                    <div className="flex items-center gap-2">
                      <Badge variant="danger" size="sm">
                        Escalated
                      </Badge>
                      <span className="text-xs font-semibold text-[var(--ink)] capitalize">
                        {item.target_type} · Reason: {item.reason}
                      </span>
                    </div>
                    {item.moderator_note && (
                      <p className="text-xs text-[var(--ink-muted)] italic truncate">
                        Note: &ldquo;{item.moderator_note}&rdquo;
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/moderation/reports/${item.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--danger)] text-white text-xs font-semibold hover:opacity-90 transition-opacity self-start sm:self-center shrink-0"
                  >
                    <span>Decide Action</span>
                    <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                  </Link>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "reported_posts" && (
          mostReportedPosts.length === 0 ? (
            <p className="text-xs text-[var(--ink-muted)] py-8 text-center">
              {t("admin.attention_no_posts", "No high-frequency reported posts recorded.")}
            </p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {mostReportedPosts.map((post) => (
                <div key={post.post_id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 first:pt-0 last:pb-0">
                  <div className="space-y-1 min-w-0 max-w-xl">
                    <Link
                      href={`/p/${post.post_id}`}
                      className="text-xs font-bold text-[var(--ink)] hover:underline truncate block"
                    >
                      {post.title}
                    </Link>
                    <p className="text-xs text-[var(--ink-muted)]">
                      Author: <span className="font-medium text-[var(--ink)]">{post.author}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-[var(--danger)] tabular-nums">
                      {post.report_count} reports
                    </span>
                    <Link
                      href={`/p/${post.post_id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
                    >
                      <span>Inspect Post</span>
                      <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "flagged_accounts" && (
          flaggedAccounts.length === 0 ? (
            <p className="text-xs text-[var(--ink-muted)] py-8 text-center">
              {t("admin.attention_no_accounts", "No accounts with repeat content violations detected.")}
            </p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {flaggedAccounts.map((acc) => (
                <div key={acc.user_id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 first:pt-0 last:pb-0">
                  <div className="space-y-0.5 min-w-0">
                    <Link
                      href={`/u/${acc.username}`}
                      className="text-xs font-bold text-[var(--ink)] hover:underline block truncate"
                    >
                      {acc.display_name} (@{acc.username})
                    </Link>
                    <p className="text-[11px] text-[var(--ink-muted)]">
                      {acc.flagged_count} hidden / flagged submissions
                    </p>
                  </div>

                  <Link
                    href={`/admin/users?q=${encodeURIComponent(acc.username)}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface)] transition-colors self-start sm:self-center shrink-0"
                  >
                    <span>Manage User</span>
                    <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                  </Link>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function NeedsAttentionSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] shadow-xs animate-pulse p-5 space-y-4">
      <div className="h-5 w-48 bg-[var(--surface-strong)] rounded" />
      <div className="h-10 w-full bg-[var(--surface)] rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-[var(--surface)] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
