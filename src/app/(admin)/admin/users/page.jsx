import { requireRole } from "@/server/auth";
import { getUsersAdmin } from "@/server/dal/users";
import { UserAdminClient } from "./UserAdminClient";
import { getServerAdminT } from "@/lib/i18n/server";
import { AdminLanguageSwitcher } from "@/components/dashboard/AdminLanguageSwitcher";

export const metadata = {
  title: "User Management - Admin",
};

export default async function UserManagementPage({ searchParams }) {
  const session = await requireRole("admin");
  const { t } = await getServerAdminT();
  const resolvedParams = await searchParams;
  const query = resolvedParams?.q || "";
  const role = resolvedParams?.role || "all";
  const offset = parseInt(resolvedParams?.offset || "0", 10);

  const { users, total } = await getUsersAdmin({
    query,
    role,
    limit: 25,
    offset,
  });

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--line)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
            {t("users_admin.title", "User Management")}
          </h1>
          <p className="text-xs text-[var(--ink-muted)]">
            {t("users_admin.subtitle", "Manage member accounts and role privileges")}
          </p>
        </div>
        <div className="flex items-center">
          <AdminLanguageSwitcher />
        </div>
      </div>

      <UserAdminClient
        users={users}
        total={total}
        currentAdminId={session.user.id}
        initialQuery={query}
        initialRole={role}
        offset={offset}
        limit={25}
      />
    </div>
  );
}
