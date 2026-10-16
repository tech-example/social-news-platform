import { cookies } from "next/headers";
import { requireRole } from "@/server/auth";
import { AdminLocaleProvider } from "@/lib/i18n/AdminLocaleProvider";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  await requireRole("admin");
  const cookieStore = await cookies();
  const locale = cookieStore.get("admin_locale")?.value === "th" ? "th" : "en";

  return <AdminLocaleProvider initialLocale={locale}>{children}</AdminLocaleProvider>;
}
