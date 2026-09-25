"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { transitionReportAction } from "@/server/actions/reports";
import { hidePostAction, restorePostAction, hideCommentAction, restoreCommentAction } from "@/server/actions/moderation";
import { useToast } from "@/components/ui/toast";
import { ShieldCheck, EyeOff, Eye, ArrowUpRight, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export function ModeratorActionPanel({ report: initialReport, currentRole = "moderator", onStatusChange }) {
  const { addToast } = useToast();
  const [note, setNote] = useState("");
  const [actionTaken, setActionTaken] = useState("content_hidden");
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState(initialReport);

  const isAdmin = currentRole === "admin";

  const handleTransition = (nextStatus, extraAction) => {
    startTransition(async () => {
      const res = await transitionReportAction({
        reportId: report.id,
        nextStatus,
        actionTaken: extraAction || (nextStatus.startsWith("resolved") ? actionTaken : undefined),
        note: note.trim() || undefined,
      });

      if (res.ok) {
        addToast(`Report marked as ${nextStatus.replace("_", " ")}.`);
        setReport((prev) => ({ ...prev, status: nextStatus }));
        if (onStatusChange) onStatusChange(report.id, nextStatus);
      } else {
        addToast(res.error || "Failed to update report.", "error");
      }
    });
  };

  const handleToggleContentVisibility = async (hide) => {
    startTransition(async () => {
      let res;
      if (report.target_type === "post") {
        res = hide ? await hidePostAction(report.target_id) : await restorePostAction(report.target_id);
      } else if (report.target_type === "comment") {
        res = hide ? await hideCommentAction(report.target_id) : await restoreCommentAction(report.target_id);
      }

      if (res?.ok) {
        addToast(hide ? "Content hidden from public view." : "Content restored.");
      } else {
        addToast(res?.error || "Failed to update content status.", "error");
      }
    });
  };

  const isResolved = report.status.startsWith("resolved");

  return (
    <div className="flex flex-col gap-4 p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
        <h2 className="text-base font-bold text-[var(--ink)]">Moderation Actions</h2>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="moderator-note" className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
          Decision Notes & Justification
        </label>
        <textarea
          id="moderator-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Document the moderation findings and reasoning..."
          className="w-full px-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
        />
      </div>

      {/* Target Content Visibility Quick Toggles (Preliminary action for moderators and admins) */}
      {(report.target_type === "post" || report.target_type === "comment") && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--line)]">
          <Button
            variant="secondary"
            type="button"
            onClick={() => handleToggleContentVisibility(true)}
            disabled={isPending}
            className="text-xs"
          >
            <EyeOff size={14} strokeWidth={1.75} aria-hidden="true" className="mr-1.5 text-[var(--danger)]" />
            Hide Target Content
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => handleToggleContentVisibility(false)}
            disabled={isPending}
            className="text-xs"
          >
            <Eye size={14} strokeWidth={1.75} aria-hidden="true" className="mr-1.5 text-[var(--success)]" />
            Restore Target Content
          </Button>
        </div>
      )}

      {/* State Machine Transition Buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--line)]">
        {report.status === "pending" && (
          <Button
            variant="secondary"
            type="button"
            onClick={() => handleTransition("in_review")}
            disabled={isPending}
          >
            Mark In Review
          </Button>
        )}

        {(report.status === "pending" || report.status === "in_review") && (
          <Button
            variant="secondary"
            type="button"
            onClick={() => handleTransition("escalated")}
            disabled={isPending}
          >
            <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" className="mr-1.5 text-[var(--warning)]" />
            Escalate to Admin
          </Button>
        )}

        {/* Dismiss Report: Allowed for moderator if in_review, or admin anytime before resolution */}
        {!isResolved && (isAdmin || report.status === "in_review") && (
          <Button
            variant="ghost"
            type="button"
            onClick={() => handleTransition("resolved_dismissed")}
            disabled={isPending}
          >
            <XCircle size={16} strokeWidth={1.75} aria-hidden="true" className="mr-1.5 text-[var(--ink-muted)]" />
            Dismiss Report
          </Button>
        )}

        {/* Final Decision (Resolve & Action): ADMIN ONLY */}
        {!isResolved && isAdmin && (
          <Button
            variant="danger"
            type="button"
            onClick={() => handleTransition("resolved_actioned")}
            disabled={isPending}
          >
            <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" className="mr-1.5" />
            Resolve & Action (Final Decision)
          </Button>
        )}
      </div>

      {/* Notice for moderators when report is escalated */}
      {!isAdmin && report.status === "escalated" && (
        <div className="flex items-center gap-2 p-3 bg-amber-50/50 border border-[var(--warning)]/30 rounded-lg text-xs text-[var(--ink)]">
          <AlertCircle size={15} strokeWidth={1.75} className="text-[var(--warning)] shrink-0" aria-hidden="true" />
          <span>This report has been escalated. Awaiting final decision from an administrator.</span>
        </div>
      )}

      {isResolved && (
        <div className="p-3 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink-muted)]">
          This report is closed as <strong className="text-[var(--ink)]">{report.status.replace("_", " ")}</strong>.
          {report.action_taken && <span> Action taken: {report.action_taken}.</span>}
        </div>
      )}
    </div>
  );
}
