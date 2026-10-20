import { cookies } from "next/headers";
import { requireRole } from "@/server/auth";
import { AdminLocaleProvider } from "@/lib/i18n/AdminLocaleProvider";

export const dynamic = "force-dynamic";

export default async function ModeratorLayout({ children }) {
  await requireRole("moderator");
  let locale = "en";
  try {
    const cookieStore = await cookies();
    locale = cookieStore.get("admin_locale")?.value === "th" ? "th" : "en";
  } catch {
    locale = "en";
  }

  return <AdminLocaleProvider initialLocale={locale}>{children}</AdminLocaleProvider>;
}
