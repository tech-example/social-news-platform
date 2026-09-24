import Link from "next/link";
import { Hash } from "lucide-react";
import { formatCompactNumber } from "@/lib/format";

export function BarList({ data = [], title = "Top Hashtags", limit = 5 }) {
  if (!data || data.length === 0) {
    return (
      <div className="p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs text-center py-8">
        <h3 className="text-sm font-bold text-[var(--ink)] mb-1">{title}</h3>
        <p className="text-xs text-[var(--ink-muted)]">No tag metrics recorded in this window.</p>
      </div>
    );
  }

  const items = data.slice(0, limit);
  const maxPosts = Math.max(...items.map((i) => Number(i.posts_count) || 0), 1);

  return (
    <div className="p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--ink)]">{title}</h3>
        <span className="text-[11px] text-[var(--ink-muted)]">Posts / Engagement</span>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => {
          const count = Number(item.posts_count) || 0;
          const engagement = Number(item.total_engagement) || 0;
          const pct = Math.round((count / maxPosts) * 100);

          return (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <Link
                  href={`/tag/${encodeURIComponent(item.name.toLowerCase())}`}
                  className="font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                >
                  <Hash size={12} strokeWidth={2} aria-hidden="true" className="shrink-0" />
                  <span>{item.name}</span>
                </Link>
                <div className="flex items-center gap-2 text-xs tabular-nums text-[var(--ink)]">
                  <span className="font-semibold">{formatCompactNumber(count)}</span>
                  {engagement > 0 && (
                    <span className="text-[11px] text-[var(--ink-muted)]">
                      ({formatCompactNumber(engagement)} eng)
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full h-2 bg-[var(--surface-strong)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-bright)] rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(pct, 4)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
