import Link from "next/link";
import { Hash } from "lucide-react";
import { formatCompactNumber } from "@/lib/format";

export function TagChip({ name, postsCount, className = "" }) {
  const normalized = (name || "").toLowerCase().replace(/^#/, "");
  const encoded = encodeURIComponent(normalized);

  return (
    <Link
      href={`/tag/${encoded}`}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-strong)] border border-[var(--line)] text-xs font-medium text-[var(--ink)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] select-none shrink-0 ${className}`}
    >
      <Hash size={13} strokeWidth={2} aria-hidden="true" className="text-[var(--accent)] shrink-0" />
      <span className="truncate">{normalized}</span>
      {typeof postsCount === "number" && (
        <span className="text-[11px] text-[var(--ink-muted)] tabular-nums ml-0.5">
          {formatCompactNumber(postsCount)}
        </span>
      )}
    </Link>
  );
}
