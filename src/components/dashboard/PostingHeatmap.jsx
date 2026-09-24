"use client";
import { useMemo } from "react";
import { Clock } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function PostingHeatmap({ data = [], title = "Posting Activity Heatmap (Weekday x Hour)" }) {
  const { matrix, maxCount } = useMemo(() => {
    const map = {};
    let max = 0;
    for (const d of data) {
      const key = `${d.day_of_week}_${d.hour_of_day}`;
      const count = Number(d.post_count) || 0;
      map[key] = count;
      if (count > max) max = count;
    }
    return { matrix: map, maxCount: max || 1 };
  }, [data]);

  return (
    <div className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
          <h3 className="text-sm font-bold text-[var(--ink)]">{title}</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]">
          <span>Fewer</span>
          <span className="w-2.5 h-2.5 rounded-xs bg-[var(--surface-strong)]" />
          <span className="w-2.5 h-2.5 rounded-xs bg-[#0095F6]/30" />
          <span className="w-2.5 h-2.5 rounded-xs bg-[#0095F6]/60" />
          <span className="w-2.5 h-2.5 rounded-xs bg-[#0095F6]" />
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[580px]">
          {/* Hour headers (sample every 3 hours) */}
          <div className="grid grid-cols-[40px_repeat(24,1fr)] gap-1 text-[10px] text-[var(--ink-muted)] mb-1 text-center font-mono">
            <span />
            {HOURS.map((hr) => (
              <span key={hr} className={hr % 3 === 0 ? "font-semibold" : "opacity-40"}>
                {hr % 3 === 0 ? `${hr}h` : "·"}
              </span>
            ))}
          </div>

          {/* Days rows */}
          <div className="space-y-1">
            {DAYS.map((dayName, dayIdx) => (
              <div key={dayName} className="grid grid-cols-[40px_repeat(24,1fr)] gap-1 items-center">
                <span className="text-[11px] font-medium text-[var(--ink-muted)] pr-1">
                  {dayName}
                </span>
                {HOURS.map((hour) => {
                  const count = matrix[`${dayIdx}_${hour}`] || 0;
                  const ratio = count / maxCount;
                  let bg = "bg-[var(--surface)]";
                  if (count > 0) {
                    if (ratio > 0.75) bg = "bg-[#0095F6] text-white";
                    else if (ratio > 0.5) bg = "bg-[#0095F6]/70 text-white";
                    else if (ratio > 0.25) bg = "bg-[#0095F6]/40";
                    else bg = "bg-[#0095F6]/20";
                  }

                  return (
                    <div
                      key={hour}
                      className={`h-5 rounded-xs ${bg} border border-[var(--line)]/50 transition-colors flex items-center justify-center text-[9px] tabular-nums font-medium cursor-pointer`}
                      title={`${dayName} at ${hour}:00 - ${count} posts`}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
