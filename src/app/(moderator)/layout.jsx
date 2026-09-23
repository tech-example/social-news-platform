import { requireRole } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function ModeratorLayout({ children }) {
  await requireRole("moderator");
  return <>{children}</>;
}
