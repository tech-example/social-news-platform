"use client";
import { useId, useState } from "react";
import { EyeOff, Flag } from "lucide-react";

/**
 * FlaggedContent: Universal client component for flagged posts and comments.
 *
 * Rules:
 * - isFlagged false: render children only.
 * - Hidden state: render ONLY the notice (Lucide EyeOff, the sentence, and a "Show" button).
 *   Do not render the children and do not render the badge.
 * - Shown state: render ONLY a slim header row (Lucide Flag, "Flagged for language", and a "Hide" button)
 *   followed by the children. Do not render the notice.
 * - The button is a real <button type="button"> with aria-expanded, aria-controls pointing at the content region,
 *   an aria-label ("Show content" / "Hide content"), a 44px minimum hit area, a visible focus-visible ring,
 *   and Enter/Space keyboard support.
 * - Initial state comes from defaultHidden prop computed on server:
 *   false for author, moderators, admins; otherwise viewer's hide_flagged_content (guests: true).
 */
export function FlaggedContent({
  isFlagged = false,
  defaultHidden = true,
  contentType = "post",
  className = "",
  noticeClassName = "",
  isAuthor = false,
  isModeratorOrAdmin = false,
  children,
}) {
  const initialHidden = () => {
    if (typeof defaultHidden === "boolean") return defaultHidden;
    if (isAuthor || isModeratorOrAdmin) return false;
    return true;
  };

  const [hidden, setHidden] = useState(initialHidden);
  const regionId = useId();

  if (!isFlagged) {
    return children;
  }

  // Hidden state: render ONLY the notice (Lucide EyeOff, the sentence, and a "Show" button)
  if (hidden) {
    const isComment = contentType === "comment";

    return (
      <div
        role="group"
        aria-label="Hidden content"
        className={`${
          isComment
            ? "min-h-[44px] py-1.5 px-3 flex items-center justify-between gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface)]"
            : "min-h-[110px] sm:min-h-[130px] p-4 flex flex-col items-center justify-center text-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]"
        } transition-colors text-left ${noticeClassName} ${className}`}
      >
        <div className={`flex items-center gap-2.5 min-w-0 ${isComment ? "" : "flex-col sm:flex-row text-center sm:text-left"}`}>
          <div className="p-1.5 rounded-full bg-[var(--bg)] border border-[var(--line)] text-[var(--ink-muted)] shrink-0">
            <EyeOff size={16} strokeWidth={1.75} aria-hidden="true" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-[var(--ink-muted)]">
            This content may contain inappropriate language.
          </p>
        </div>

        <button
          type="button"
          aria-expanded={false}
          aria-controls={regionId}
          aria-label="Show content"
          onClick={() => setHidden(false)}
          className="min-h-[44px] min-w-[44px] px-3.5 py-2 inline-flex items-center justify-center text-xs font-semibold text-[var(--ink)] bg-[var(--bg)] border border-[var(--line)] rounded-lg hover:bg-[var(--surface-strong)] active:bg-[var(--surface-strong)] transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
        >
          Show
        </button>
      </div>
    );
  }

  // Shown state: render ONLY a slim header row (Lucide Flag, "Flagged for language", and a "Hide" button) followed by children
  return (
    <div className={`space-y-2 transition-opacity duration-150 ${className}`}>
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--line)]">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--surface-strong)] text-[var(--ink-muted)] text-[11px] font-medium border border-[var(--line)]">
          <Flag size={12} strokeWidth={2} className="text-[var(--warning)] shrink-0" aria-hidden="true" />
          <span>Flagged for language</span>
        </span>

        <button
          type="button"
          aria-expanded={true}
          aria-controls={regionId}
          aria-label="Hide content"
          onClick={() => setHidden(true)}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
        >
          Hide
        </button>
      </div>

      <div id={regionId}>{children}</div>
    </div>
  );
}

// Export under alias for seamless drop-in backwards compatibility
export { FlaggedContent as ProfanityNotice };
