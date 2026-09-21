import { requireRole } from "@/server/auth";
import { getUsersAdmin } from "@/server/dal/users";
import { UserAdminClient } from "./UserAdminClient";

export const metadata = {
  title: "User Management - Admin",
};

export default async function UserManagementPage({ searchParams }) {
  const session = await requireRole("admin");
  const resolvedParams = await searchParams;
  const query = resolvedParams?.q || "";
  const role = resolvedParams?.role || "all";
  const status = resolvedParams?.status || "all";
  const offset = parseInt(resolvedParams?.offset || "0", 10);

  const { users, total } = await getUsersAdmin({
    query,
    role,
    status,
    limit: 25,
    offset,
  });

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6 space-y-6">
      <div className="pb-4 border-b border-[var(--line)]">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
          User Management
        </h1>
        <p className="text-xs text-[var(--ink-muted)]">
          Manage member accounts, role privileges, and suspension controls
        </p>
      </div>

      <UserAdminClient
        users={users}
        total={total}
        currentAdminId={session.user.id}
      />
    </div>
  );
}
