"use client";
import { Languages } from "lucide-react";
import { useAdminLocale } from "@/lib/i18n/AdminLocaleProvider";

export function AdminLanguageSwitcher({ className = "" }) {
  const { locale, setLocale, isPending } = useAdminLocale();

  return (
    <div
      role="group"
      aria-label="Select interface language"
      className={`inline-flex items-center gap-1 p-1 rounded-lg bg-[var(--surface)] border border-[var(--line)] min-h-[44px] ${className}`}
    >
      <div className="pl-1.5 pr-1 text-[var(--ink-muted)] flex items-center justify-center shrink-0" aria-hidden="true">
        <Languages size={15} strokeWidth={1.75} />
      </div>

      <button
        type="button"
        onClick={() => setLocale("en")}
        disabled={isPending && locale === "en"}
        aria-pressed={locale === "en"}
        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors min-h-[32px] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)] focus-visible:outline-none ${
          locale === "en"
            ? "bg-[var(--bg)] text-[var(--accent)] border border-[var(--line)] shadow-2xs"
            : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
        }`}
      >
        EN
      </button>

      <button
        type="button"
        onClick={() => setLocale("th")}
        disabled={isPending && locale === "th"}
        aria-pressed={locale === "th"}
        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors min-h-[32px] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)] focus-visible:outline-none ${
          locale === "th"
            ? "bg-[var(--bg)] text-[var(--accent)] border border-[var(--line)] shadow-2xs"
            : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
        }`}
      >
        TH
      </button>
    </div>
  );
}
