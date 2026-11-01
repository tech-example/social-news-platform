import React from "react";
import { TrendingUp, TrendingDown, Info, HelpCircle } from "lucide-react";
import { SKELETON_SIZES } from "@/lib/constants";

export function StatCard({
  title,
  value,
  previousValue = null,
  format = "number",
  subtitle = null,
  icon: Icon = null,
  tooltip = null,
  decisionHint = null,
  invertDelta = false, // If true, an increase is bad (red) and decrease is good (green)
  sparkline = null, // array of numbers [v1, v2, ...]
  locale = "en",
}) {
  const intlLocale = locale === "th" ? "th-TH" : "en-US";
  let deltaPercent = null;
  let isDiffPositive = false;
  let isFavorable = true;

  if (previousValue !== null && previousValue !== undefined && previousValue > 0) {
    const diff = Number(value) - Number(previousValue);
    deltaPercent = Math.round((diff / previousValue) * 100);
    isDiffPositive = deltaPercent >= 0;
    isFavorable = invertDelta ? deltaPercent <= 0 : deltaPercent >= 0;
  } else if (previousValue === 0 && Number(value) > 0) {
    deltaPercent = 100;
    isDiffPositive = true;
    isFavorable = !invertDelta;
  } else if (previousValue === 0 && Number(value) === 0) {
    deltaPercent = 0;
    isDiffPositive = true;
    isFavorable = true;
  }

  const formattedValue =
    format === "percent"
      ? `${Number(value || 0).toFixed(1)}%`
      : format === "ratio"
      ? Number(value || 0).toFixed(2)
      : format === "compact"
      ? typeof value === "number"
        ? new Intl.NumberFormat(intlLocale, {
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(value)
        : value
      : typeof value === "number"
      ? new Intl.NumberFormat(intlLocale).format(value)
      : value;

  // Generate mini SVG sparkline if points provided
  let sparklinePath = null;
  if (Array.isArray(sparkline) && sparkline.length >= 2) {
    const min = Math.min(...sparkline);
    const max = Math.max(...sparkline);
    const range = max - min || 1;
    const width = 64;
    const height = 24;
    const points = sparkline.map((val, idx) => {
      const x = (idx / (sparkline.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    sparklinePath = `M ${points.join(" L ")}`;
  }

  return (
    <div
      style={{ minHeight: `${SKELETON_SIZES.STAT_CARD.ESTIMATED_HEIGHT}px` }}
      className="flex flex-col justify-between p-4 sm:p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs transition-shadow hover:border-[var(--ink-muted)]/30"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider truncate">
            {title}
          </span>
          {(tooltip || decisionHint) && (
            <span
              className="text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-help shrink-0"
              title={decisionHint ? `${tooltip ? `${tooltip}\n\n` : ""}Decision hint: ${decisionHint}` : tooltip}
              aria-label={decisionHint || tooltip}
            >
              <Info size={13} strokeWidth={2} aria-hidden="true" />
            </span>
          )}
        </div>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-[var(--surface)] text-[var(--ink-muted)] shrink-0">
            {React.isValidElement(Icon) ? (
              Icon
            ) : typeof Icon === "function" || (typeof Icon === "object" && Icon !== null) ? (
              <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)] tabular-nums">
            {formattedValue}
          </span>

          {deltaPercent !== null && (
            <span
              title={`Delta vs previous window: ${deltaPercent >= 0 ? `+${deltaPercent}%` : `${deltaPercent}%`}`}
              aria-label={`Delta: ${deltaPercent >= 0 ? `plus ${deltaPercent}%` : `${deltaPercent}%`}, ${isFavorable ? "favorable trend" : "unfavorable trend"}`}
              className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded ${
                isFavorable
                  ? "text-[var(--success)] bg-[var(--surface-strong)]"
                  : "text-[var(--danger)] bg-[var(--surface-strong)]"
              }`}
            >
              {isDiffPositive ? (
                <TrendingUp size={12} strokeWidth={2.25} aria-hidden="true" />
              ) : (
                <TrendingDown size={12} strokeWidth={2.25} aria-hidden="true" />
              )}
              <span>{deltaPercent >= 0 ? `+${deltaPercent}%` : `${deltaPercent}%`}</span>
            </span>
          )}
        </div>

        {sparklinePath && (
          <div className="shrink-0 pl-1" aria-hidden="true">
            <svg width="64" height="24" className="overflow-visible">
              <path
                d={sparklinePath}
                fill="none"
                stroke={isFavorable ? "var(--accent)" : "var(--danger)"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-0.5">
        {subtitle && (
          <span className="text-xs text-[var(--ink-muted)] truncate" title={subtitle}>
            {subtitle}
          </span>
        )}
        {decisionHint && (
          <span className="text-[11px] text-[var(--ink-muted)] italic truncate" title={decisionHint}>
            {decisionHint}
          </span>
        )}
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div
      style={{ minHeight: `${SKELETON_SIZES.STAT_CARD.ESTIMATED_HEIGHT}px` }}
      className="p-4 sm:p-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] shadow-xs animate-pulse space-y-4"
    >
      <div className="flex justify-between items-center">
        <div className="h-3 w-24 bg-[var(--surface-strong)] rounded" />
        <div className="h-6 w-6 bg-[var(--surface-strong)] rounded-lg" />
      </div>
      <div className="h-8 w-16 bg-[var(--surface-strong)] rounded" />
      <div className="h-3 w-28 bg-[var(--surface)] rounded" />
    </div>
  );
}
