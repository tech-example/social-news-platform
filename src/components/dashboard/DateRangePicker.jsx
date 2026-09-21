"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";

function DateRangePickerInner({ className = "" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get("range") || "30d";

  const ranges = [
    { id: "today", label: "Today" },
    { id: "7d", label: "Last 7 Days" },
    { id: "30d", label: "Last 30 Days" },
    { id: "90d", label: "Last 90 Days" },
  ];

  const handleSelect = (rangeId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", rangeId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className={`flex items-center gap-1.5 p-1 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-xs font-medium ${className}`}>
      <div className="pl-2 pr-1 text-[var(--ink-muted)] flex items-center gap-1">
        <CalendarDays size={14} strokeWidth={1.75} aria-hidden="true" />
        <span className="hidden sm:inline">Range:</span>
      </div>
      {ranges.map((r) => {
        const isActive = currentRange === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => handleSelect(r.id)}
            className={`px-2.5 py-1 rounded transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] ${
              isActive
                ? "bg-[var(--bg)] text-[var(--ink)] font-semibold shadow-2xs border border-[var(--line)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

export function DateRangePicker(props) {
  return (
    <Suspense fallback={<div className="h-8 w-44 bg-[var(--surface)] rounded-lg animate-pulse" />}>
      <DateRangePickerInner {...props} />
    </Suspense>
  );
}
