import { cookies } from "next/headers";
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

export async function getServerAdminLocale() {
  try {
    const cookieStore = await cookies();
    const val = cookieStore.get("admin_locale")?.value;
    return val === "th" ? "th" : "en";
  } catch {
    return "en";
  }
}

export async function getServerAdminT() {
  const locale = await getServerAdminLocale();
  const dict = dictionaries[locale] || dictionaries.en;

  const t = (key, paramsOrFallback, fallback) => {
    let params = null;
    let defaultText = fallback;

    if (typeof paramsOrFallback === "object" && paramsOrFallback !== null) {
      params = paramsOrFallback;
    } else if (typeof paramsOrFallback === "string") {
      defaultText = paramsOrFallback;
    }

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
  };

  const formatNumber = (number) => {
    if (number == null || Number.isNaN(number)) return "0";
    const intlLocale = locale === "th" ? "th-TH" : "en-US";
    return new Intl.NumberFormat(intlLocale).format(number);
  };

  const formatCompact = (number) => {
    if (number == null || Number.isNaN(number)) return "0";
    const intlLocale = locale === "th" ? "th-TH" : "en-US";
    return new Intl.NumberFormat(intlLocale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(number);
  };

  const formatRelative = (dateInput) => {
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
  };

  const formatDate = (dateInput, options = {}) => {
    if (!dateInput) return "";
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return String(dateInput);

    const intlLocale = locale === "th" ? "th-TH-u-ca-gregory" : "en-US";
    return new Intl.DateTimeFormat(intlLocale, options).format(date);
  };

  return {
    locale,
    t,
    formatNumber,
    formatCompact,
    formatRelative,
    formatDate,
  };
}
