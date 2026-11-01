"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminLocale } from "@/lib/i18n/AdminLocaleProvider";

function DateRangePickerInner({ className = "" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useAdminLocale();

  const rawRange = searchParams.get("range");
  const validRanges = ["day", "week", "month", "year"];
  const currentRange = validRanges.includes(rawRange) ? rawRange : "week";

  const ranges = [
    { id: "day", label: t("controls.day_window", "Day") },
    { id: "week", label: t("controls.week_window", "Week") },
    { id: "month", label: t("controls.month_window", "Month") },
    { id: "year", label: t("controls.year_window", "Year") },
  ];

  const handleSelect = (rangeId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", rangeId);
    params.delete("from");
    params.delete("to");
    params.delete("bucket");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className={`flex items-center gap-1.5 p-1 bg-[var(--surface)] border border-[var(--line)] rounded-xl text-xs font-medium ${className}`}>
      <div className="pl-2 pr-1 text-[var(--ink-muted)] flex items-center gap-1">
        <CalendarDays size={14} strokeWidth={1.75} aria-hidden="true" />
        <span className="hidden sm:inline font-semibold">{t("controls.range", "Window")}:</span>
      </div>
      {ranges.map((r) => {
        const isActive = currentRange === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => handleSelect(r.id)}
            className={`min-h-8 px-2.5 py-1 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] ${
              isActive
                ? "bg-[var(--bg)] text-[var(--ink)] font-bold shadow-2xs border border-[var(--line)]"
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
    <Suspense fallback={<Skeleton className="h-8 w-44 rounded-lg" />}>
      <DateRangePickerInner {...props} />
    </Suspense>
  );
}
