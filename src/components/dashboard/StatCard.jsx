import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCompactNumber } from "@/lib/format";
import { SKELETON_SIZES } from "@/lib/constants";

export function StatCard({
  title,
  value,
  previousValue = null,
  format = "number",
  subtitle = null,
  icon: Icon = null,
}) {
  let deltaPercent = null;
  let isPositive = false;

  if (previousValue !== null && previousValue !== undefined && previousValue > 0) {
    const diff = value - previousValue;
    deltaPercent = Math.round((diff / previousValue) * 100);
    isPositive = deltaPercent >= 0;
  } else if (previousValue === 0 && value > 0) {
    deltaPercent = 100;
    isPositive = true;
  }

  const formattedValue =
    format === "number"
      ? formatCompactNumber(value)
      : typeof value === "number"
      ? value.toLocaleString()
      : value;

  return (
    <div
      style={{ minHeight: `${SKELETON_SIZES.STAT_CARD.ESTIMATED_HEIGHT}px` }}
      className="flex flex-col justify-between p-4 sm:p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
          {title}
        </span>
        {Icon && <Icon size={18} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)] shrink-0" />}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)] tabular-nums">
          {formattedValue}
        </span>

        {deltaPercent !== null && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded ${
              isPositive
                ? "text-[var(--success)] bg-[var(--surface)]"
                : "text-[var(--danger)] bg-[var(--surface)]"
            }`}
          >
            {isPositive ? (
              <TrendingUp size={12} strokeWidth={2.25} aria-hidden="true" />
            ) : (
              <TrendingDown size={12} strokeWidth={2.25} aria-hidden="true" />
            )}
            <span>{isPositive ? `+${deltaPercent}%` : `${deltaPercent}%`}</span>
          </span>
        )}
      </div>

      {subtitle && (
        <span className="mt-1 text-xs text-[var(--ink-muted)]">
          {subtitle}
        </span>
      )}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-4 sm:p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] animate-pulse">
      <div className="h-3 w-24 bg-[var(--surface-strong)] rounded mb-3" />
      <div className="h-7 w-32 bg-[var(--surface-strong)] rounded mb-2" />
      <div className="h-3 w-20 bg-[var(--surface-strong)] rounded" />
    </div>
  );
}
