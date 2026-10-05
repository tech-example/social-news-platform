import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { requireRole } from "@/server/auth";
import { getReportById, getReportEvents } from "@/server/dal/reports";
import { ModeratorActionPanel } from "@/components/moderation/ModeratorActionPanel";
import { FlaggedContent } from "@/components/feed/FlaggedContent";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format";
import {
  ChevronLeft,
  Flag,
  Clock,
  ShieldCheck,
  ShieldAlert,
  TriangleAlert,
  CircleCheck,
  CircleX,
  ExternalLink,
  MessageCircle,
  FileText,
  User,
  History,
} from "lucide-react";

export async function generateMetadata({ params }) {
  const { reportId } = await params;
  return {
    title: `Report #${reportId.slice(0, 8)} - Moderation`,
  };
}

export default async function ReportDetailPage({ params }) {
  const session = await requireRole("moderator");
  const { reportId } = await params;

  // Basic UUID format validation
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId);
  if (!isUuid) {
    notFound();
  }

  const [report, events] = await Promise.all([
    getReportById(reportId),
    getReportEvents(reportId),
  ]);

  if (!report) {
    notFound();
  }

  const getStatusBadge = (st) => {
    switch (st) {
      case "pending":
        return (
          <Badge variant="warning" size="sm" className="inline-flex items-center gap-1">
            <Clock size={12} strokeWidth={2} aria-hidden="true" />
            <span>Pending</span>
          </Badge>
        );
      case "in_review":
        return (
          <Badge variant="neutral" size="sm" className="inline-flex items-center gap-1">
            <ShieldCheck size={12} strokeWidth={2} aria-hidden="true" />
            <span>In Review</span>
          </Badge>
        );
      case "escalated":
        return (
          <Badge variant="danger" size="sm" className="inline-flex items-center gap-1">
            <TriangleAlert size={12} strokeWidth={2} aria-hidden="true" />
            <span>Escalated to Admin</span>
          </Badge>
        );
      case "resolved_actioned":
        return (
          <Badge variant="success" size="sm" className="inline-flex items-center gap-1">
            <CircleCheck size={12} strokeWidth={2} aria-hidden="true" />
            <span>Actioned</span>
          </Badge>
        );
      case "resolved_dismissed":
        return (
          <Badge variant="neutral" size="sm" className="inline-flex items-center gap-1">
            <CircleX size={12} strokeWidth={2} aria-hidden="true" />
            <span>Dismissed</span>
          </Badge>
        );
      default:
        return <Badge variant="neutral" size="sm">{st}</Badge>;
    }
  };

  const target = report.targetDetails;

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">
      {/* Navigation & Header */}
      <div>
        <Link
          href="/moderation/reports"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] mb-3 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] rounded"
        >
          <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          <span>Back to report queue</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-strong)] text-[var(--danger)] border border-[var(--line)] shrink-0">
              <Flag size={20} strokeWidth={2} aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[var(--ink)]">
                  Report #{report.id.slice(0, 8)}
                </h1>
                {getStatusBadge(report.status)}
                {report.is_flagged && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--surface-strong)] text-[var(--warning)] border border-[var(--line)]">
                    <ShieldAlert size={12} strokeWidth={2} aria-hidden="true" />
                    <span>Language Flagged</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5" suppressHydrationWarning>
                Submitted {formatRelativeTime(report.created_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 Cols): Details & Target Content Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Information Card */}
          <div className="p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[var(--ink)] uppercase tracking-wider">
              Report Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[var(--ink-muted)] block mb-1">Target Type</span>
                <span className="font-semibold text-sm capitalize text-[var(--ink)]">
                  {report.target_type}
                </span>
              </div>
              <div>
                <span className="text-[var(--ink-muted)] block mb-1">Alleged Violation</span>
                <span className="font-semibold text-sm capitalize text-[var(--danger)]">
                  {report.reason}
                </span>
              </div>
            </div>

            {report.details && (
              <div className="pt-2 border-t border-[var(--line)]">
                <span className="text-xs font-semibold text-[var(--ink-muted)] block mb-1">
                  Reporter Note:
                </span>
                <p className="text-sm text-[var(--ink)] bg-[var(--surface)] p-3 rounded-lg border border-[var(--line)] leading-relaxed">
                  {report.details}
                </p>
              </div>
            )}

            {/* Reporter Profile */}
            <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--ink-muted)]">Filed by:</span>
              {report.reporter ? (
                <Link
                  href={`/u/${report.reporter.username}`}
                  className="flex items-center gap-2 hover:underline group"
                >
                  <Avatar
                    src={report.reporter.avatar_url}
                    name={report.reporter.display_name || report.reporter.username}
                    size={24}
                  />
                  <span className="text-xs font-semibold text-[var(--ink)]">
                    @{report.reporter.username}
                  </span>
                </Link>
              ) : (
                <span className="text-xs text-[var(--ink-muted)]">Anonymous User</span>
              )}
            </div>
          </div>

          {/* Target Content Preview */}
          <div className="p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <h2 className="text-sm font-bold text-[var(--ink)] uppercase tracking-wider flex items-center gap-1.5">
                {report.target_type === "post" && <FileText size={16} strokeWidth={2} aria-hidden="true" />}
                {report.target_type === "comment" && <MessageCircle size={16} strokeWidth={2} aria-hidden="true" />}
                {report.target_type === "user" && <User size={16} strokeWidth={2} aria-hidden="true" />}
                <span>Reported {report.target_type} Content</span>
              </h2>
              {target?.id && (
                <span className="text-[11px] text-[var(--ink-muted)] font-mono">
                  ID: {target.id.slice(0, 8)}
                </span>
              )}
            </div>

            {!target ? (
              <div className="py-8 text-center text-sm text-[var(--ink-muted)]">
                The reported target could not be found or may have been deleted.
              </div>
            ) : report.target_type === "post" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      src={target.author?.avatar_url}
                      name={target.author?.display_name || target.author?.username}
                      size={32}
                    />
                    <div>
                      <Link href={`/u/${target.author?.username}`} className="text-xs font-bold text-[var(--ink)] hover:underline block">
                        @{target.author?.username}
                      </Link>
                      <span className="text-[11px] text-[var(--ink-muted)]">
                        Status: <strong className="capitalize">{target.status}</strong>
                      </span>
                    </div>
                  </div>
                  <Link href={`/p/${target.id}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
                    <span>View post</span>
                    <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                  </Link>
                </div>

                {/* Respect FlaggedContent for language review */}
                <FlaggedContent
                  key={`report-post-${target.id}`}
                  isFlagged={Boolean(target.is_flagged)}
                  defaultHidden={false}
                  contentType="post"
                >
                  <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--line)] space-y-2">
                    {target.title && (
                      <h3 className="text-base font-bold text-[var(--ink)]">{target.title}</h3>
                    )}
                    <p className="text-sm text-[var(--ink)] whitespace-pre-wrap leading-relaxed">
                      {target.body}
                    </p>
                    {target.image_url && (
                      <div className="relative w-full aspect-16/9 rounded-md overflow-hidden bg-black/5 mt-3">
                        <Image
                          src={target.image_url}
                          alt="Post media preview"
                          fill
                          sizes="(min-width: 768px) 600px, 100vw"
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    )}
                  </div>
                </FlaggedContent>
              </div>
            ) : report.target_type === "comment" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      src={target.author?.avatar_url}
                      name={target.author?.display_name || target.author?.username}
                      size={32}
                    />
                    <div>
                      <Link href={`/u/${target.author?.username}`} className="text-xs font-bold text-[var(--ink)] hover:underline block">
                        @{target.author?.username}
                      </Link>
                      <span className="text-[11px] text-[var(--ink-muted)]">
                        Status: <strong className="capitalize">{target.status}</strong>
                      </span>
                    </div>
                  </div>
                  {target.post_id && (
                    <Link href={`/p/${target.post_id}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
                      <span>View post thread</span>
                      <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                    </Link>
                  )}
                </div>

                <FlaggedContent
                  key={`report-comment-${target.id}`}
                  isFlagged={Boolean(target.is_flagged)}
                  defaultHidden={false}
                  contentType="comment"
                >
                  <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--line)]">
                    <p className="text-sm text-[var(--ink)] whitespace-pre-wrap leading-relaxed">
                      {target.body}
                    </p>
                  </div>
                </FlaggedContent>
              </div>
            ) : (
              /* User Target */
              <div className="flex items-center gap-4 p-4 rounded-lg bg-[var(--surface)] border border-[var(--line)]">
                <Avatar
                  src={target.avatar_url}
                  name={target.display_name || target.username}
                  size={52}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[var(--ink)] truncate">
                      {target.display_name}
                    </h3>
                    <span className="text-xs text-[var(--ink-muted)]">(@{target.username})</span>
                  </div>
                  {target.bio && (
                    <p className="text-xs text-[var(--ink-muted)] mt-1 line-clamp-2">{target.bio}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span>Role: <strong className="capitalize">{target.role}</strong></span>
                    {target.is_suspended && (
                      <span className="text-[var(--danger)] font-semibold">Account Suspended</span>
                    )}
                  </div>
                </div>
                <Link href={`/u/${target.username}`} target="_blank">
                  <Button variant="secondary" size="sm" className="text-xs">
                    <span>Profile</span>
                    <ExternalLink size={12} strokeWidth={2} aria-hidden="true" className="ml-1" />
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Timeline of Report Events */}
          <div className="p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[var(--ink)] uppercase tracking-wider flex items-center gap-2">
              <History size={16} strokeWidth={2} aria-hidden="true" />
              <span>Report Timeline & Action Log</span>
            </h2>

            {events.length === 0 ? (
              <p className="text-xs text-[var(--ink-muted)] py-3">
                No state transition events recorded yet for this report.
              </p>
            ) : (
              <div className="space-y-3 relative pl-6 border-l-2 border-[var(--line)] ml-2">
                {events.map((ev) => (
                  <div key={ev.id} className="relative text-xs">
                    <div className="absolute -left-[31px] top-0.5 h-3 w-3 rounded-full bg-[var(--accent)] border-2 border-[var(--bg)]" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[var(--ink)]">
                        Status changed to {ev.to_status.replace("_", " ")}
                      </span>
                      {ev.actor && (
                        <span className="text-[var(--ink-muted)]">
                          by @{ev.actor.username} ({ev.actor.role})
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--ink-muted)] ml-auto" suppressHydrationWarning>
                        {formatRelativeTime(ev.created_at)}
                      </span>
                    </div>
                    {ev.note && (
                      <p className="text-[var(--ink)] mt-1 p-2 rounded bg-[var(--surface)] border border-[var(--line)]">
                        {ev.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Moderator Action Controls */}
        <div className="space-y-6">
          <ModeratorActionPanel
            report={report}
            currentRole={session.profile?.role || "moderator"}
          />
        </div>
      </div>
    </div>
  );
}
