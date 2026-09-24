"use client";
import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  CalendarDays,
  RefreshCw,
  Download,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardControls({
  isAdmin = false,
  showBucket = true,
  showCompare = true,
  className = "",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentRange = searchParams.get("range") || "30d";
  const currentBucket = searchParams.get("bucket") || (currentRange === "today" ? "day" : currentRange === "90d" ? "week" : "day");
  const compareEnabled = searchParams.get("compare") === "1";

  const [lastUpdated, setLastUpdated] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLastUpdated(
        new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
          hour12: true,
        }).format(new Date())
      );
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const ranges = [
    { id: "today", label: "Today" },
    { id: "7d", label: "7 Days" },
    { id: "30d", label: "30 Days" },
    { id: "90d", label: "90 Days" },
  ];

  const buckets = [
    { id: "day", label: "Day" },
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
  ];

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === undefined) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleRefresh = () => {
    setIsSpinning(true);
    startTransition(() => {
      router.refresh();
      setLastUpdated(
        new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
          hour12: true,
        }).format(new Date())
      );
      setTimeout(() => setIsSpinning(false), 600);
    });
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 p-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] ${className}`}>
      {/* Left controls: Range & Bucket & Compare */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range Selector */}
        <div className="flex items-center gap-1 bg-[var(--bg)] border border-[var(--line)] rounded-lg p-1 text-xs">
          <div className="px-2 text-[var(--ink-muted)] flex items-center gap-1">
            <CalendarDays size={13} strokeWidth={1.75} aria-hidden="true" />
            <span className="font-medium hidden sm:inline">Range:</span>
          </div>
          {ranges.map((r) => {
            const isActive = currentRange === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => updateParam("range", r.id)}
                className={`px-2.5 py-1 rounded transition-colors text-xs ${
                  isActive
                    ? "bg-[var(--surface-strong)] text-[var(--ink)] font-semibold shadow-2xs"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Bucket Selector */}
        {showBucket && (
          <div className="flex items-center gap-1 bg-[var(--bg)] border border-[var(--line)] rounded-lg p-1 text-xs">
            <div className="px-2 text-[var(--ink-muted)] flex items-center gap-1">
              <SlidersHorizontal size={13} strokeWidth={1.75} aria-hidden="true" />
              <span className="font-medium hidden sm:inline">Bucket:</span>
            </div>
            {buckets.map((b) => {
              const isActive = currentBucket === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => updateParam("bucket", b.id)}
                  className={`px-2 py-1 rounded transition-colors text-xs ${
                    isActive
                      ? "bg-[var(--surface-strong)] text-[var(--ink)] font-semibold shadow-2xs"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Compare to Previous Period Toggle */}
        {showCompare && (
          <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={compareEnabled}
              onChange={(e) => updateParam("compare", e.target.checked ? "1" : "0")}
              className="rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent-bright)]"
            />
            <span className="font-medium">Compare period</span>
          </label>
        )}
      </div>

      {/* Right controls: Last Updated, Refresh, CSV Export */}
      <div className="flex items-center gap-2 text-xs">
        {lastUpdated && (
          <span className="text-[var(--ink-muted)] tabular-nums hidden sm:inline">
            Updated {lastUpdated}
          </span>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          disabled={isPending || isSpinning}
          className="h-8 px-2.5 text-xs flex items-center gap-1.5"
          aria-label="Refresh dashboard data"
        >
          <RefreshCw
            size={13}
            strokeWidth={2}
            aria-hidden="true"
            className={isSpinning || isPending ? "animate-spin" : ""}
          />
          <span>Refresh</span>
        </Button>

        {isAdmin && (
          <a href="/api/reports/export" download>
            <Button variant="secondary" size="sm" className="h-8 px-2.5 text-xs flex items-center gap-1.5">
              <Download size={13} strokeWidth={2} aria-hidden="true" />
              <span>Export CSV</span>
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
