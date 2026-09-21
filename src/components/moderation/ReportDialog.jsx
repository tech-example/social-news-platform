"use client";
import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createReportAction } from "@/server/actions/reports";
import { useToast } from "@/components/ui/toast";
import { REPORT_REASONS, LIMITS } from "@/lib/constants";
import { Flag, CircleCheck } from "lucide-react";

export function ReportDialog({ open, onClose, targetType, targetId }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  const handleClose = () => {
    setSubmitted(false);
    setDetails("");
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createReportAction({
        targetType,
        targetId,
        reason,
        details,
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        addToast(res.error || "Failed to submit report.", "error");
      }
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Report Content">
      {submitted ? (
        <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
          <CircleCheck size={48} strokeWidth={1.75} aria-hidden="true" className="text-[var(--success)]" />
          <h3 className="text-base font-semibold text-[var(--ink)]">Thank You for Reporting</h3>
          <p className="text-sm text-[var(--ink-muted)] max-w-xs">
            We take platform safety seriously. A moderator will review this item in accordance with our community guidelines.
          </p>
          <Button onClick={handleClose} className="mt-2">
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--danger)] uppercase tracking-wide">
            <Flag size={14} strokeWidth={2} aria-hidden="true" />
            <span>Report this {targetType}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[var(--ink)]">Reason for report</span>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[var(--surface)] cursor-pointer text-sm text-[var(--ink)] capitalize"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-[var(--accent)]"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-details" className="text-sm font-medium text-[var(--ink)]">
              Additional Details (optional)
            </label>
            <textarea
              id="report-details"
              rows={3}
              value={details}
              maxLength={LIMITS.REPORT_DETAILS_MAX}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide context for moderators..."
              className="w-full px-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
            <Button variant="ghost" type="button" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" disabled={isPending}>
              {isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
