"use client";
import React, { createContext, useContext, useState, useTransition, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { setAdminLocaleAction } from "@/server/actions/admin-locale";
import adminEn from "./admin-en.json";
import adminTh from "./admin-th.json";
import moderationEn from "./moderation-en.json";
import moderationTh from "./moderation-th.json";
import profanityEn from "./profanity-en.json";
import profanityTh from "./profanity-th.json";

const dictionaries = {
  en: {
    ...adminEn,
    ...moderationEn,
    ...profanityEn,
  },
  th: {
    ...adminTh,
    ...moderationTh,
    ...profanityTh,
  },
};

const AdminLocaleContext = createContext(null);

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

export function AdminLocaleProvider({ initialLocale = "en", children }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [locale, setLocaleState] = useState(initialLocale === "th" ? "th" : "en");

  const setLocale = useCallback((newLocale) => {
    const next = newLocale === "th" ? "th" : "en";
    setLocaleState(next);

    if (typeof document !== "undefined") {
      document.cookie = `admin_locale=${next}; path=/; max-age=31536000; SameSite=Lax`;
    }

    startTransition(async () => {
      try {
        await setAdminLocaleAction(next);
        router.refresh();
      } catch (err) {
        console.error("Failed to persist admin locale:", err);
      }
    });
  }, [router]);

  const t = useCallback((key, paramsOrFallback, fallback) => {
    let params = null;
    let defaultText = fallback;

    if (typeof paramsOrFallback === "object" && paramsOrFallback !== null) {
      params = paramsOrFallback;
    } else if (typeof paramsOrFallback === "string") {
      defaultText = paramsOrFallback;
    }

    const dict = dictionaries[locale] || dictionaries.en;
    let val = getNestedValue(dict, key);

    if ((val === undefined || (typeof val === "object" && val !== null)) && locale !== "en") {
      val = getNestedValue(dictionaries.en, key);
    }

    if (val === undefined || (typeof val === "object" && val !== null)) {
      val = defaultText !== undefined ? defaultText : key;
    }

    if (typeof val === "string" && params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }

    return typeof val === "string" || typeof val === "number" ? val : (defaultText !== undefined ? defaultText : key);
  }, [locale]);

  const formatNumber = useCallback((number) => {
    if (number == null || Number.isNaN(number)) return "0";
    const intlLocale = locale === "th" ? "th-TH" : "en-US";
    return new Intl.NumberFormat(intlLocale).format(number);
  }, [locale]);

  const formatCompact = useCallback((number) => {
    if (number == null || Number.isNaN(number)) return "0";
    const intlLocale = locale === "th" ? "th-TH" : "en-US";
    return new Intl.NumberFormat(intlLocale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(number);
  }, [locale]);

  const formatDate = useCallback((dateInput, options = {}) => {
    if (!dateInput) return "";
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return String(dateInput);

    const intlLocale = locale === "th" ? "th-TH-u-ca-gregory" : "en-US";
    return new Intl.DateTimeFormat(intlLocale, options).format(date);
  }, [locale]);

  const formatRelative = useCallback((dateInput) => {
    if (!dateInput) return "";
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (locale === "th") {
      if (diffInSeconds < 60) return "เมื่อสักครู่";
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes} นาที`;
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} ชม.`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays} วัน`;
      const diffInWeeks = Math.floor(diffInDays / 7);
      if (diffInWeeks < 4) return `${diffInWeeks} สัปดาห์`;

      return new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
        month: "short",
        day: "numeric",
        year: now.getFullYear() === date.getFullYear() ? undefined : "numeric",
      }).format(date);
    }

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w`;

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: now.getFullYear() === date.getFullYear() ? undefined : "numeric",
    }).format(date);
  }, [locale]);

  const contextValue = useMemo(() => ({
    locale,
    setLocale,
    t,
    formatNumber,
    formatCompact,
    formatDate,
    formatRelative,
    isPending,
  }), [locale, setLocale, t, formatNumber, formatCompact, formatDate, formatRelative, isPending]);

  return (
    <AdminLocaleContext.Provider value={contextValue}>
      {children}
    </AdminLocaleContext.Provider>
  );
}

// Fallback hook that safely returns English if rendered outside provider
export function useAdminLocale() {
  const ctx = useContext(AdminLocaleContext);
  if (ctx) return ctx;

  return {
    locale: "en",
    setLocale: () => {},
    t: (key, paramsOrFallback, fallback) => {
      let defaultText = fallback;
      if (typeof paramsOrFallback === "string") defaultText = paramsOrFallback;
      const val = getNestedValue(dictionaries.en, key);
      return val !== undefined ? val : (defaultText !== undefined ? defaultText : key);
    },
    formatNumber: (n) => (n == null ? "0" : new Intl.NumberFormat("en-US").format(n)),
    formatCompact: (n) => (n == null ? "0" : new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)),
    formatDate: (d, opts) => (!d ? "" : new Intl.DateTimeFormat("en-US", opts).format(new Date(d))),
    formatRelative: (d) => (!d ? "" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(d))),
    isPending: false,
  };
}
