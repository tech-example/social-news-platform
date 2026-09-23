import { requireRole } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  await requireRole("admin");
  return <>{children}</>;
}
