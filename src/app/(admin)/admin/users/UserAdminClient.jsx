"use client";
import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { updateUserRoleAction, deleteUserAction } from "@/server/actions/admin";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatCompactNumber } from "@/lib/format";
import { useAdminLocale } from "@/lib/i18n/AdminLocaleProvider";
import { getDisplayName } from "@/lib/user";
import { UserName } from "@/components/ui/user-name";
import {
  CheckCircle2,
  Shield,
  Trash2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  UserX,
} from "lucide-react";

export function UserAdminClient({
  users: initialUsers = [],
  total = 0,
  currentAdminId,
  initialQuery = "",
  initialRole = "all",
  offset = 0,
  limit = 25,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { addToast } = useToast();
  const { t, formatRelative, formatNumber } = useAdminLocale();
  const [isPending, startTransition] = useTransition();

  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [roleFilter, setRoleFilter] = useState(initialRole);

  // Modal dialog states
  const [roleDialog, setRoleDialog] = useState({ open: false, user: null, targetRole: "user" });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const applyFilters = (newQ = searchQuery, newRole = roleFilter, newOffset = 0) => {
    const params = new URLSearchParams();
    if (newQ.trim()) params.set("q", newQ.trim());
    if (newRole && newRole !== "all") params.set("role", newRole);
    if (newOffset > 0) params.set("offset", newOffset.toString());

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    applyFilters(searchQuery, roleFilter, 0);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    applyFilters("", roleFilter, 0);
  };

  const handleRoleFilterChange = (e) => {
    const nextRole = e.target.value;
    setRoleFilter(nextRole);
    applyFilters(searchQuery, nextRole, 0);
  };

  // 1. Role Change Action
  const confirmRoleChange = () => {
    const { user, targetRole } = roleDialog;
    if (!user) return;

    setRoleDialog({ open: false, user: null, targetRole: "user" });

    // Optimistically update
    const previousUsers = users;
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role: targetRole } : u))
    );

    startTransition(async () => {
      const res = await updateUserRoleAction(user.id, targetRole);
      if (res?.ok) {
        addToast(t("users_admin.toast_role_updated", "User role updated successfully."));
      } else {
        setUsers(previousUsers);
        addToast(res?.error || t("users_admin.toast_error_role", "Failed to update role."), "error");
      }
    });
  };

  // 2. Delete Action
  const confirmDelete = () => {
    const { user } = deleteDialog;
    if (!user) return;

    setDeleteDialog({ open: false, user: null });

    const previousUsers = users;
    setUsers((prev) => prev.filter((u) => u.id !== user.id));

    startTransition(async () => {
      const res = await deleteUserAction(user.id);
      if (res?.ok) {
        addToast(t("users_admin.toast_deleted", "User account deleted permanently."));
      } else {
        setUsers(previousUsers);
        addToast(res?.error || t("users_admin.toast_error_delete", "Failed to delete user."), "error");
      }
    });
  };

  const hasActiveFilters = searchQuery.trim() !== "" || roleFilter !== "all";
  const startCount = total === 0 ? 0 : offset + 1;
  const endCount = Math.min(offset + users.length, total);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface)] p-3 sm:p-4 rounded-xl border border-[var(--line)]">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("users_admin.search_placeholder", "Search username or display name...")}
            className="pl-9 pr-9 text-xs sm:text-sm bg-[var(--bg)] w-full"
          />
          {searchQuery && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <IconButton
                label="Clear search"
                onClick={handleClearSearch}
                className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                <X size={16} strokeWidth={2} aria-hidden="true" />
              </IconButton>
            </div>
          )}
        </form>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={roleFilter}
            onChange={handleRoleFilterChange}
            aria-label="Filter by role"
            className="text-xs font-medium px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            <option value="all">{t("users_admin.all_roles", "All Roles")}</option>
            <option value="user">{t("users_admin.role_user", "User")}</option>
            <option value="moderator">{t("users_admin.role_moderator", "Moderator")}</option>
            <option value="admin">{t("users_admin.role_admin", "Admin")}</option>
          </select>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("all");
                applyFilters("", "all", 0);
              }}
              className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              {t("users_admin.btn_reset", "Reset")}
            </Button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-[var(--ink-muted)] tabular-nums px-1">
        <div>
          {t("users_admin.showing_count", { start: startCount, end: endCount, total: formatNumber(total) }, `Showing ${startCount}–${endCount} of ${formatNumber(total)} registered users`)}
        </div>
        {isPending && (
          <div className="flex items-center gap-1.5 text-[var(--accent)]">
            <Loader2 size={13} className="animate-spin" />
            <span>{t("users_admin.updating", "Updating...")}</span>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
        {users.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <UserX size={36} className="text-[var(--ink-muted)]" />
            <p className="text-sm font-semibold text-[var(--ink)]">{t("users_admin.empty_users", "No users found matching current filters.")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("users_admin.col_user", "User")}</TableHead>
                  <TableHead>{t("users_admin.col_role", "Role")}</TableHead>
                  <TableHead>{t("admin.top_users_col_followers", "Followers")}</TableHead>
                  <TableHead>{t("users_admin.col_joined", "Joined")}</TableHead>
                  <TableHead className="text-right">{t("users_admin.col_actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isSelf = u.id === currentAdminId;
                  return (
                    <TableRow key={u.id} className="hover:bg-[var(--surface)]/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={u.avatar_url}
                            name={getDisplayName(u)}
                            size={36}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--ink)]">
                              <Link href={`/u/${u.username}`} className="hover:underline truncate">
                                <UserName profile={u} />
                              </Link>
                              {u.role === "admin" && (
                                <Shield size={12} className="text-[var(--accent)] shrink-0" aria-label="Admin" />
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {isSelf ? (
                          <Badge variant="primary" size="sm">
                            {u.role} (You)
                          </Badge>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => setRoleDialog({ open: true, user: u, targetRole: e.target.value })}
                            disabled={isPending}
                            aria-label={`Change role for ${getDisplayName(u)}`}
                            className="text-xs font-medium px-2 py-1 rounded border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] cursor-pointer"
                          >
                            <option value="user">{t("users_admin.role_user", "User")}</option>
                            <option value="moderator">{t("users_admin.role_moderator", "Moderator")}</option>
                            <option value="admin">{t("users_admin.role_admin", "Admin")}</option>
                          </select>
                        )}
                      </TableCell>

                      <TableCell className="text-xs tabular-nums text-[var(--ink-muted)]">
                        {formatCompactNumber(u.followers_count || 0)}
                      </TableCell>

                      <TableCell className="text-xs text-[var(--ink-muted)]" suppressHydrationWarning>
                        {formatRelative(u.created_at)}
                      </TableCell>

                      <TableCell className="text-right">
                        {!isSelf && (
                          <div className="flex items-center justify-end gap-1.5">
                            <IconButton
                              label={`Delete user ${getDisplayName(u)}`}
                              onClick={() => setDeleteDialog({ open: true, user: u })}
                              disabled={isPending}
                              className="text-[var(--danger)]/80 hover:text-[var(--danger)] hover:bg-[var(--danger)]/10"
                            >
                              <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                            </IconButton>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {total > limit && (
        <div className="flex items-center justify-between pt-2 px-1">
          <div className="text-xs text-[var(--ink-muted)] tabular-nums">
            {t("users_admin.page_of", { current: Math.floor(offset / limit) + 1, total: Math.ceil(total / limit) }, `Page ${Math.floor(offset / limit) + 1} of ${Math.ceil(total / limit)}`)}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasPrev || isPending}
              onClick={() => applyFilters(searchQuery, roleFilter, Math.max(0, offset - limit))}
              className="text-xs"
            >
              <ChevronLeft size={14} className="mr-1" />
              {t("users_admin.btn_prev", "Previous")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasNext || isPending}
              onClick={() => applyFilters(searchQuery, roleFilter, offset + limit)}
              className="text-xs"
            >
              {t("users_admin.btn_next", "Next")}
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* 1. Role Change Confirmation Dialog */}
      <Dialog
        open={roleDialog.open}
        onClose={() => setRoleDialog({ open: false, user: null, targetRole: "user" })}
        title={t("users_admin.dialog_role_title", "Change User Role")}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface)] border border-[var(--line)]">
            <Avatar
              src={roleDialog.user?.avatar_url}
              name={getDisplayName(roleDialog.user)}
              size={40}
            />
            <div className="min-w-0">
              <UserName profile={roleDialog.user} className="text-sm font-semibold text-[var(--ink)] block truncate" />
            </div>
          </div>

          <p className="text-sm text-[var(--ink)]">
            {t("users_admin.dialog_role_desc", { name: getDisplayName(roleDialog.user), username: getDisplayName(roleDialog.user) })}
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRoleDialog({ open: false, user: null, targetRole: "user" })}
              disabled={isPending}
            >
              {t("users_admin.btn_cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              onClick={confirmRoleChange}
              disabled={isPending}
            >
              {isPending ? t("users_admin.btn_saving", "Updating...") : t("users_admin.btn_confirm", "Confirm Role")}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* 2. Delete Account Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, user: null })}
        title={t("users_admin.dialog_delete_title", "Delete User Account")}
        description={t("users_admin.dialog_delete_desc", { name: getDisplayName(deleteDialog.user), username: getDisplayName(deleteDialog.user) })}
        confirmLabel={isPending ? t("users_admin.btn_deleting", "Deleting...") : t("users_admin.btn_confirm", "Delete")}
        cancelLabel={t("users_admin.btn_cancel", "Cancel")}
        destructive={true}
        loading={isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
