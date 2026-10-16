"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setAdminLocaleAction(locale) {
  const validLocale = locale === "th" ? "th" : "en";
  const cookieStore = await cookies();
  cookieStore.set("admin_locale", validLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  });

  revalidatePath("/admin");
  revalidatePath("/moderation");
  return { ok: true, locale: validLocale };
}

export async function getAdminLocaleAction() {
  const cookieStore = await cookies();
  const value = cookieStore.get("admin_locale")?.value;
  return value === "th" ? "th" : "en";
}
