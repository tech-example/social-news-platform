"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { transitionReportAction } from "@/server/actions/reports";
import { hidePostAction, restorePostAction, hideCommentAction, restoreCommentAction } from "@/server/actions/moderation";
import { suggestProfanityTermAction } from "@/server/actions/profanity";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShieldCheck, EyeOff, Eye, ArrowUpRight, CheckCircle2, XCircle, AlertCircle, ShieldAlert } from "lucide-react";
import { useAdminLocale } from "@/lib/i18n/AdminLocaleProvider";

export function ModeratorActionPanel({ report: initialReport, currentRole = "moderator", onStatusChange }) {
  const { addToast } = useToast();
  const { t } = useAdminLocale();
  const [note, setNote] = useState("");
  const [actionTaken, setActionTaken] = useState("content_hidden");
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState(initialReport);

  // Suggest Profanity Term modal state
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [suggestTerm, setSuggestTerm] = useState("");
  const [suggestLang, setSuggestLang] = useState("th");
  const [suggestSev, setSuggestSev] = useState("moderate");

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
        addToast(t("moderation.toast_status_updated", { status: nextStatus.replace("_", " ") }, `Report marked as ${nextStatus.replace("_", " ")}.`));
        setReport((prev) => ({ ...prev, status: nextStatus }));
        if (onStatusChange) onStatusChange(report.id, nextStatus);
      } else {
        addToast(res.error || t("moderation.toast_error_update", "Failed to update report."), "error");
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
        addToast(hide ? t("moderation.toast_content_hidden", "Content hidden from public view.") : t("moderation.toast_content_restored", "Content restored."));
      } else {
        addToast(res?.error || t("moderation.toast_error_content", "Failed to update content status."), "error");
      }
    });
  };

  const handleSuggestTerm = () => {
    if (!suggestTerm.trim()) {
      addToast(t("profanity.toast_term_required", "Term cannot be empty"), "error");
      return;
    }

    startTransition(async () => {
      const res = await suggestProfanityTermAction({
        term: suggestTerm,
        language: suggestLang,
        severity: suggestSev,
        sourceReportId: report.id,
      });

      if (res.ok) {
        addToast(t("profanity.toast_suggestion_submitted", "Recommendation submitted successfully."));
        setIsSuggestOpen(false);
        setSuggestTerm("");
      } else {
        addToast(res.error || "Failed to submit recommendation.", "error");
      }
    });
  };

  const isResolved = report.status.startsWith("resolved");

  return (
    <div className="flex flex-col gap-4 p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
        <h2 className="text-base font-bold text-[var(--ink)]">
          {t("moderation.action_panel_title", "Moderation Actions")}
        </h2>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="moderator-note" className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
          {t("moderation.action_label_note", "Decision Notes & Justification")}
        </label>
        <textarea
          id="moderator-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("moderation.action_note_placeholder", "Document the moderation findings and reasoning...")}
          className="w-full px-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
        />
      </div>

      {/* Target Content Visibility Quick Toggles */}
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
            {t("moderation.btn_hide_content", "Hide Target Content")}
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => handleToggleContentVisibility(false)}
            disabled={isPending}
            className="text-xs"
          >
            <Eye size={14} strokeWidth={1.75} aria-hidden="true" className="mr-1.5 text-[var(--success)]" />
            {t("moderation.btn_restore_content", "Restore Target Content")}
          </Button>

          {/* Recommend word to filter */}
          <Button
            variant="secondary"
            type="button"
            onClick={() => setIsSuggestOpen(true)}
            disabled={isPending}
            className="text-xs"
          >
            <ShieldAlert size={14} strokeWidth={1.75} aria-hidden="true" className="mr-1.5 text-[var(--accent)]" />
            {t("moderation.btn_recommend_term", "Recommend Filter Term")}
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
            {t("moderation.btn_start_review", "Mark In Review")}
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
            {t("moderation.btn_escalate", "Escalate to Admin")}
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
            {t("moderation.btn_resolve_dismiss", "Dismiss Report")}
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
            {t("moderation.btn_resolve_action", "Resolve & Action (Final Decision)")}
          </Button>
        )}
      </div>

      {/* Notice for moderators when report is escalated */}
      {!isAdmin && report.status === "escalated" && (
        <div className="flex items-center gap-2 p-3 bg-amber-50/50 border border-[var(--warning)]/30 rounded-lg text-xs text-[var(--ink)]">
          <AlertCircle size={15} strokeWidth={1.75} className="text-[var(--warning)] shrink-0" aria-hidden="true" />
          <span>{t("moderation.escalated_notice", "This report has been escalated. Awaiting final decision from an administrator.")}</span>
        </div>
      )}

      {isResolved && (
        <div className="p-3 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink-muted)]">
          {t("moderation.report_closed_as", { status: report.status.replace("_", " ") }, `This report is closed as ${report.status.replace("_", " ")}.`)}
          {report.action_taken && <span> {t("moderation.action_taken_label", { action: report.action_taken }, `Action taken: ${report.action_taken}.`)}</span>}
        </div>
      )}

      {/* DIALOG: Recommend Profanity Term */}
      <Dialog open={isSuggestOpen} onOpenChange={setIsSuggestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("profanity.modal_suggest_title", "Suggest Profanity Term")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-[var(--ink-muted)]">
              {t("profanity.modal_suggest_desc", "Submit a candidate offensive term for admin review. Once approved, it will be added to the active filter dictionary.")}
            </p>

            <div>
              <label className="block font-semibold text-[var(--ink)] mb-1">
                {t("profanity.suggestions_col_term", "Word / Phrase")}
              </label>
              <input
                type="text"
                value={suggestTerm}
                onChange={(e) => setSuggestTerm(e.target.value)}
                placeholder={t("profanity.modal_suggest_placeholder", "Enter term to suggest...")}
                className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] focus:outline-2 focus:outline-[var(--accent-bright)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">
                  {t("profanity.suggestions_col_lang", "Language")}
                </label>
                <select
                  value={suggestLang}
                  onChange={(e) => setSuggestLang(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)]"
                >
                  <option value="th">{t("profanity.filter_th", "Thai")}</option>
                  <option value="en">{t("profanity.filter_en", "English")}</option>
                  <option value="th_romanized">{t("profanity.filter_th_romanized", "Thai Romanized")}</option>
                  <option value="other">{t("profanity.filter_other", "Other")}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">
                  {t("profanity.suggestions_col_severity", "Severity")}
                </label>
                <select
                  value={suggestSev}
                  onChange={(e) => setSuggestSev(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)]"
                >
                  <option value="moderate">{t("profanity.filter_moderate", "Moderate")}</option>
                  <option value="severe">{t("profanity.filter_severe", "Severe")}</option>
                  <option value="mild">{t("profanity.filter_mild", "Mild")}</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSuggestOpen(false)}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isPending}
              onClick={handleSuggestTerm}
            >
              {t("common.submit", "Submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
