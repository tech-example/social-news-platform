"use client";
import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  CalendarDays,
  RefreshCw,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminLocale } from "@/lib/i18n/AdminLocaleProvider";

export function DashboardControls({
  isAdmin = false,
  className = "",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { t, formatDate } = useAdminLocale();

  const rawRange = searchParams.get("range");
  const validRanges = ["day", "week", "month", "year"];
  const currentRange = validRanges.includes(rawRange) ? rawRange : "week";

  const [lastUpdated, setLastUpdated] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLastUpdated(
        formatDate(new Date(), {
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
        })
      );
    }, 0);
    return () => clearTimeout(timer);
  }, [formatDate]);

  const ranges = [
    { id: "day", label: t("controls.day_window", "Day") },
    { id: "week", label: t("controls.week_window", "Week") },
    { id: "month", label: t("controls.month_window", "Month") },
    { id: "year", label: t("controls.year_window", "Year") },
  ];

  const handleRangeChange = (rangeId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", rangeId);
    // Remove obsolete params
    params.delete("from");
    params.delete("to");
    params.delete("bucket");

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleRefresh = () => {
    setIsSpinning(true);
    startTransition(() => {
      router.refresh();
      setLastUpdated(
        formatDate(new Date(), {
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
        })
      );
      setTimeout(() => setIsSpinning(false), 600);
    });
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-[var(--surface)] border border-[var(--line)] ${className}`}>
      {/* Left controls: 4 Rolling Window Range Buttons */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 bg-[var(--bg)] border border-[var(--line)] rounded-xl p-1 text-xs">
          <div className="px-2 text-[var(--ink-muted)] flex items-center gap-1">
            <CalendarDays size={14} strokeWidth={1.75} aria-hidden="true" />
            <span className="font-semibold hidden sm:inline">{t("controls.range", "Window")}:</span>
          </div>
          {ranges.map((r) => {
            const isActive = currentRange === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRangeChange(r.id)}
                className={`min-h-8 px-3 py-1 rounded-lg transition-colors text-xs cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] ${
                  isActive
                    ? "bg-[var(--surface-strong)] text-[var(--ink)] font-bold shadow-2xs border border-[var(--line)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-strong)]/50"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right controls: Last Updated, Refresh, CSV Export */}
      <div className="flex items-center gap-2 text-xs">
        {lastUpdated && (
          <span className="text-[var(--ink-muted)] tabular-nums hidden sm:inline text-xs">
            {t("controls.updated", "Updated")} {lastUpdated}
          </span>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          disabled={isPending || isSpinning}
          className="min-h-11 sm:min-h-9 px-3 text-xs flex items-center gap-1.5 rounded-lg"
          aria-label={t("controls.refresh", "Refresh dashboard data")}
        >
          <RefreshCw
            size={13}
            strokeWidth={2}
            aria-hidden="true"
            className={isSpinning || isPending ? "animate-spin" : ""}
          />
          <span>{t("controls.refresh", "Refresh")}</span>
        </Button>

        {isAdmin && (
          <a
            href={`/api/reports/export?range=${currentRange}`}
            download={`admin-report-${currentRange}.csv`}
            className="inline-flex"
          >
            <Button
              variant="secondary"
              size="sm"
              className="min-h-11 sm:min-h-9 px-3 text-xs flex items-center gap-1.5 rounded-lg"
              title={t("controls.export_csv", "Export aggregate CSV report for this range")}
            >
              <Download size={13} strokeWidth={2} aria-hidden="true" />
              <span>{t("controls.export_csv", "Export Report")}</span>
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
