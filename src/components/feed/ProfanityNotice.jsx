"use client";
import { useState } from "react";
import { EyeOff, Eye, ShieldAlert } from "lucide-react";
import { COPY } from "@/lib/copy";

/**
 * Notice and wrapper for content flagged for inappropriate language.
 *
 * Rules:
 * - When not flagged: renders children directly.
 * - When flagged and viewer is author: renders unfolded by default with a "Flagged for language" indicator.
 * - When flagged and viewer is moderator/admin (forceUnfold=true): renders unfolded by default with indicator.
 * - When flagged and viewer is general public/other user: renders collapsed with EyeOff notice and "Show anyway" toggle.
 *   Clicking "Show anyway" reveals content in place with a "Hide again" re-collapse button.
 */
export function ProfanityNotice({
  isFlagged = false,
  isAuthor = false,
  forceUnfold = false,
  contentType = "post",
  className = "",
  noticeClassName = "",
  children,
}) {
  const [revealed, setRevealed] = useState(false);

  if (!isFlagged) {
    return children;
  }

  // Author, moderator, or admin always see unfolded content by default with an awareness badge
  if (isAuthor || forceUnfold) {
    if (contentType === "comment") {
      return (
        <div className={`space-y-0.5 ${className}`}>
          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--surface-strong)] text-[var(--ink-muted)] text-[10px] font-medium border border-[var(--line)] ${noticeClassName}`}>
            <ShieldAlert size={10} strokeWidth={2} className="text-[var(--warning)] shrink-0" aria-hidden="true" />
            <span>{COPY.profanity.flaggedIndicator}</span>
          </div>
          <div>{children}</div>
        </div>
      );
    }
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--surface-strong)] text-[var(--ink-muted)] text-[11px] font-medium border border-[var(--line)] ${noticeClassName}`}>
          <ShieldAlert size={12} strokeWidth={2} className="text-[var(--warning)] shrink-0" aria-hidden="true" />
          <span>{COPY.profanity.flaggedIndicator}</span>
        </div>
        {children}
      </div>
    );
  }

  // Other viewers: collapsed by default with client-side toggle
  if (!revealed) {
    if (contentType === "comment") {
      return (
        <div
          className={`inline-flex flex-wrap items-center gap-2 py-1 px-2.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--ink-muted)] ${noticeClassName} ${className}`}
        >
          <div className="flex items-center gap-1.5">
            <EyeOff size={13} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            <span>{COPY.profanity.noticeComment}</span>
          </div>
          <button
            type="button"
            onClick={() => setRevealed(true)}
            aria-pressed={false}
            aria-label={COPY.profanity.showAnyway}
            className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
          >
            <Eye size={12} strokeWidth={2} aria-hidden="true" />
            <span>{COPY.profanity.showAnyway}</span>
          </button>
        </div>
      );
    }

    return (
      <div
        className={`rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left transition-all ${noticeClassName} ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-full bg-[var(--bg)] border border-[var(--line)] shrink-0 text-[var(--ink-muted)]">
            <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-[var(--ink-muted)]">
            {COPY.profanity.noticePost}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRevealed(true)}
          aria-pressed={false}
          aria-label={COPY.profanity.showAnyway}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--ink)] bg-[var(--bg)] border border-[var(--line)] rounded-lg hover:bg-[var(--surface-strong)] active:bg-[var(--surface-strong)] transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
        >
          <Eye size={14} strokeWidth={2} aria-hidden="true" />
          <span>{COPY.profanity.showAnyway}</span>
        </button>
      </div>
    );
  }

  // Revealed state: show content with option to re-collapse
  if (contentType === "comment") {
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="inline-flex items-center gap-2 text-[11px] text-[var(--ink-muted)]">
          <span className="flex items-center gap-1 font-medium">
            <ShieldAlert size={11} strokeWidth={2} className="text-[var(--warning)] shrink-0" aria-hidden="true" />
            <span>{COPY.profanity.flaggedIndicator}</span>
          </span>
          <button
            type="button"
            onClick={() => setRevealed(false)}
            aria-pressed={true}
            aria-label={COPY.profanity.hideAgain}
            className="inline-flex items-center gap-0.5 font-semibold text-[var(--accent)] hover:underline cursor-pointer"
          >
            <EyeOff size={11} strokeWidth={2} aria-hidden="true" />
            <span>{COPY.profanity.hideAgain}</span>
          </button>
        </div>
        <div>{children}</div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className={`flex items-center justify-between px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--ink-muted)] ${noticeClassName}`}>
        <span className="flex items-center gap-1.5 font-medium">
          <ShieldAlert size={12} strokeWidth={2} className="text-[var(--warning)] shrink-0" aria-hidden="true" />
          <span>{COPY.profanity.flaggedIndicator}</span>
        </span>
        <button
          type="button"
          onClick={() => setRevealed(false)}
          aria-pressed={true}
          aria-label={COPY.profanity.hideAgain}
          className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
        >
          <EyeOff size={13} strokeWidth={2} aria-hidden="true" />
          <span>{COPY.profanity.hideAgain}</span>
        </button>
      </div>
      {children}
    </div>
  );
}
