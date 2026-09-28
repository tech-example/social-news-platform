"use client";
import { useState } from "react";
import { EyeOff, Eye, Flag } from "lucide-react";

/**
 * FlaggedContent: Universal client component for flagged posts and comments.
 *
 * Rules (every viewer gets a working toggle on every flagged post/comment):
 * - If not flagged: renders children directly.
 * - Guests and normal users viewing others' content: hidden by default.
 * - Author viewing own content: shown by default, with "Flagged for language" badge and a "Hide" button.
 * - Staff (moderators/admins): shown by default in queue/detail, with badge and a "Hide" button.
 * - When hidden: bordered notice, Lucide EyeOff, "This content may contain inappropriate language.",
 *   and "Show" button (Lucide Eye, aria-pressed={false}, aria-label="Show content").
 * - When shown: "Flagged for language" badge (Lucide Flag), "Hide" button (Lucide EyeOff, aria-pressed={true}, aria-label="Hide content"),
 *   and children revealed with opacity transition and reserved min-height to prevent layout shift.
 * - All buttons are real <button type="button"> with min 44px hit area, keyboard Enter/Space support, and focus rings.
 */
export function FlaggedContent({
  isFlagged = false,
  isAuthor = false,
  isModeratorOrAdmin = false,
  forceUnfold = false,
  defaultHidden = null,
  contentType = "post",
  className = "",
  noticeClassName = "",
  children,
}) {
  const isPrivileged = isAuthor || isModeratorOrAdmin || forceUnfold;

  // Determine initial hidden state
  const initialHidden = () => {
    if (isPrivileged) return false;
    if (typeof defaultHidden === "boolean") return defaultHidden;
    return true;
  };

  const [hidden, setHidden] = useState(initialHidden);

  if (!isFlagged) {
    return children;
  }

  // 1. Hidden State (Notice with "Show" button)
  if (hidden) {
    return (
      <div
        className={`min-h-[52px] rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5 sm:p-3 flex items-center justify-between gap-3 text-left transition-opacity duration-200 ${noticeClassName} ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-full bg-[var(--bg)] border border-[var(--line)] shrink-0 text-[var(--ink-muted)]">
            <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-[var(--ink-muted)]">
            This content may contain inappropriate language.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setHidden(false)}
          aria-pressed={false}
          aria-label="Show content"
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[var(--ink)] bg-[var(--bg)] border border-[var(--line)] rounded-lg hover:bg-[var(--surface-strong)] active:bg-[var(--surface-strong)] transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
        >
          <Eye size={14} strokeWidth={2} aria-hidden="true" />
          <span>Show</span>
        </button>
      </div>
    );
  }

  // 2. Shown State (Badge, "Hide" button, and content)
  return (
    <div className={`space-y-2 min-h-[52px] transition-opacity duration-200 opacity-100 ${className}`}>
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--line)]/60">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--surface-strong)] text-[var(--ink-muted)] text-[11px] font-medium border border-[var(--line)]">
          <Flag size={12} strokeWidth={2} className="text-[var(--warning)] shrink-0" aria-hidden="true" />
          <span>Flagged for language</span>
        </div>

        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-pressed={true}
          aria-label="Hide content"
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
        >
          <EyeOff size={14} strokeWidth={2} aria-hidden="true" />
          <span>Hide</span>
        </button>
      </div>

      <div>{children}</div>
    </div>
  );
}

// Re-export under alias for seamless drop-in backwards compatibility
export { FlaggedContent as ProfanityNotice };
