import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/server/auth";
import { getReportById } from "@/server/dal/reports";
import { ModeratorActionPanel } from "@/components/moderation/ModeratorActionPanel";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/format";
import { ChevronLeft, Flag, User, FileText, MessageSquare } from "lucide-react";

export const metadata = {
  title: "Review Report - Moderation",
};

export default async function ReportDetailPage({ params }) {
  const session = await requireRole("moderator");
  const { reportId } = await params;

  const report = await getReportById(reportId);
  if (!report) {
    notFound();
  }

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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/moderation/reports"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)]"
        >
          <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          <span>Back to reports queue</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--line)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-[var(--ink)]">
              Report Review
            </h1>
            <Badge variant={getStatusVariant(report.status)}>
              {report.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-xs text-[var(--ink-muted)]">
            Report ID: <code className="text-[11px] text-[var(--ink)]">{report.id}</code> &bull; Created{" "}
            <span suppressHydrationWarning>{formatRelativeTime(report.created_at)}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Report Details & Target Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Metadata Card */}
          <div className="p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Flag size={16} strokeWidth={2} aria-hidden="true" className="text-[var(--danger)]" />
              <span>Report Information</span>
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold text-[var(--ink-muted)] block mb-0.5">Reporter</span>
                <span className="text-[var(--ink)] font-medium">@{report.reporter?.username || "anonymous"}</span>
              </div>
              <div>
                <span className="font-semibold text-[var(--ink-muted)] block mb-0.5">Alleged Violation</span>
                <span className="capitalize font-semibold text-[var(--danger)]">{report.reason}</span>
              </div>
              <div className="col-span-2">
                <span className="font-semibold text-[var(--ink-muted)] block mb-0.5">Reporter Statement</span>
                <p className="text-[var(--ink)] bg-[var(--surface)] p-3 rounded-lg border border-[var(--line)]">
                  {report.details || "No additional context provided."}
                </p>
              </div>
            </div>
          </div>

          {/* Target Content Snapshot */}
          <div className="p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              {report.target_type === "post" && <FileText size={16} strokeWidth={2} aria-hidden="true" className="text-[var(--accent)]" />}
              {report.target_type === "comment" && <MessageSquare size={16} strokeWidth={2} aria-hidden="true" className="text-[var(--accent)]" />}
              {report.target_type === "user" && <User size={16} strokeWidth={2} aria-hidden="true" className="text-[var(--accent)]" />}
              <span className="capitalize">Target {report.target_type} Snapshot</span>
            </h2>

            {report.targetDetails ? (
              <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--line)] space-y-2 text-sm">
                {report.target_type === "post" && (
                  <>
                    <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                      <span>Author: <strong>@{report.targetDetails.author?.username}</strong></span>
                      <span className="capitalize">Status: <strong>{report.targetDetails.status}</strong></span>
                    </div>
                    {report.targetDetails.title && (
                      <h3 className="font-bold text-[var(--ink)]">{report.targetDetails.title}</h3>
                    )}
                    <p className="text-xs text-[var(--ink)] whitespace-pre-wrap">{report.targetDetails.body}</p>
                    <div className="pt-2">
                      <Link href={`/p/${report.targetDetails.id}`} target="_blank" className="text-xs font-semibold text-[var(--accent)] hover:underline">
                        Open post in new tab &rarr;
                      </Link>
                    </div>
                  </>
                )}

                {report.target_type === "comment" && (
                  <>
                    <div className="text-xs text-[var(--ink-muted)]">
                      Author: <strong>@{report.targetDetails.author?.username}</strong>
                    </div>
                    <p className="text-xs text-[var(--ink)] whitespace-pre-wrap">{report.targetDetails.body}</p>
                  </>
                )}

                {report.target_type === "user" && (
                  <div className="space-y-1 text-xs">
                    <p><strong>Username:</strong> @{report.targetDetails.username}</p>
                    <p><strong>Display Name:</strong> {report.targetDetails.display_name}</p>
                    <p><strong>Role:</strong> {report.targetDetails.role}</p>
                    <p><strong>Suspended:</strong> {report.targetDetails.is_suspended ? "Yes" : "No"}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[var(--ink-muted)] italic">
                Target content record could not be found (may have been deleted).
              </p>
            )}
          </div>
        </div>

        {/* Right Col: Moderator Action Panel */}
        <div className="space-y-4">
          <ModeratorActionPanel report={report} currentRole={session.profile.role} />
        </div>
      </div>
    </div>
  );
}
