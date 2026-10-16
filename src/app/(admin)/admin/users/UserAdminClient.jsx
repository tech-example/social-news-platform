"use client";
import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { updateUserRoleAction, setUserSuspendedAction, deleteUserAction } from "@/server/actions/admin";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatCompactNumber } from "@/lib/format";
import { useAdminLocale } from "@/lib/i18n/AdminLocaleProvider";
import {
  Ban,
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
  initialStatus = "all",
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
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  // Modal dialog states
  const [roleDialog, setRoleDialog] = useState({ open: false, user: null, targetRole: "user" });
  const [suspendDialog, setSuspendDialog] = useState({ open: false, user: null, reason: "" });
  const [restoreDialog, setRestoreDialog] = useState({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const applyFilters = (newQ = searchQuery, newRole = roleFilter, newStatus = statusFilter, newOffset = 0) => {
    const params = new URLSearchParams();
    if (newQ.trim()) params.set("q", newQ.trim());
    if (newRole && newRole !== "all") params.set("role", newRole);
    if (newStatus && newStatus !== "all") params.set("status", newStatus);
    if (newOffset > 0) params.set("offset", newOffset.toString());

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    applyFilters(searchQuery, roleFilter, statusFilter, 0);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    applyFilters("", roleFilter, statusFilter, 0);
  };

  const handleRoleFilterChange = (e) => {
    const nextRole = e.target.value;
    setRoleFilter(nextRole);
    applyFilters(searchQuery, nextRole, statusFilter, 0);
  };

  const handleStatusFilterChange = (e) => {
    const nextStatus = e.target.value;
    setStatusFilter(nextStatus);
    applyFilters(searchQuery, roleFilter, nextStatus, 0);
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

  // 2. Suspend Action
  const confirmSuspend = () => {
    const { user, reason } = suspendDialog;
    if (!user) return;

    setSuspendDialog({ open: false, user: null, reason: "" });

    const previousUsers = users;
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_suspended: true, suspended_reason: reason } : u))
    );

    startTransition(async () => {
      const res = await setUserSuspendedAction(user.id, true, reason.trim() || null);
      if (res?.ok) {
        addToast(t("users_admin.toast_suspended", "User account suspended."));
      } else {
        setUsers(previousUsers);
        addToast(res?.error || t("users_admin.toast_error_suspend", "Failed to suspend user."), "error");
      }
    });
  };

  // 3. Restore Action
  const confirmRestore = () => {
    const { user } = restoreDialog;
    if (!user) return;

    setRestoreDialog({ open: false, user: null });

    const previousUsers = users;
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_suspended: false, suspended_reason: null } : u))
    );

    startTransition(async () => {
      const res = await setUserSuspendedAction(user.id, false);
      if (res?.ok) {
        addToast(t("users_admin.toast_restored", "User account restored."));
      } else {
        setUsers(previousUsers);
        addToast(res?.error || t("users_admin.toast_error_restore", "Failed to restore user account."), "error");
      }
    });
  };

  // 4. Delete Action
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

  const hasActiveFilters = searchQuery.trim() !== "" || roleFilter !== "all" || statusFilter !== "all";
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

          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            aria-label="Filter by status"
            className="text-xs font-medium px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            <option value="all">{t("users_admin.all_statuses", "All Statuses")}</option>
            <option value="active">{t("users_admin.status_active", "Active")}</option>
            <option value="suspended">{t("users_admin.status_suspended", "Suspended")}</option>
          </select>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("all");
                setStatusFilter("all");
                applyFilters("", "all", "all", 0);
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
                  <TableHead>{t("users_admin.col_status", "Status")}</TableHead>
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
                            name={u.display_name || u.username}
                            size={36}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--ink)]">
                              <Link href={`/u/${u.username}`} className="hover:underline truncate">
                                {u.display_name}
                              </Link>
                              {u.role === "admin" && (
                                <Shield size={12} className="text-[var(--accent)] shrink-0" aria-label="Admin" />
                              )}
                            </div>
                            <div className="text-xs text-[var(--ink-muted)] truncate">
                              @{u.username}
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
                            aria-label={`Change role for @${u.username}`}
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

                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Badge variant={u.is_suspended ? "danger" : "success"} size="sm">
                            {u.is_suspended ? t("users_admin.status_suspended", "Suspended") : t("users_admin.status_active", "Active")}
                          </Badge>
                          {u.is_suspended && u.suspended_reason && (
                            <span className="text-[11px] text-[var(--danger)] line-clamp-1" title={u.suspended_reason}>
                              {u.suspended_reason}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-[var(--ink-muted)]" suppressHydrationWarning>
                        {formatRelative(u.created_at)}
                      </TableCell>

                      <TableCell className="text-right">
                        {!isSelf && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant={u.is_suspended ? "secondary" : "danger"}
                              onClick={() => {
                                if (u.is_suspended) {
                                  setRestoreDialog({ open: true, user: u });
                                } else {
                                  setSuspendDialog({ open: true, user: u, reason: "" });
                                }
                              }}
                              disabled={isPending}
                              className="text-xs h-7 px-2.5"
                            >
                              {u.is_suspended ? (
                                <>
                                  <CheckCircle2 size={13} strokeWidth={2} aria-hidden="true" className="mr-1 text-[var(--success)]" />
                                  {t("users_admin.action_restore", "Restore")}
                                </>
                              ) : (
                                <>
                                  <Ban size={13} strokeWidth={2} aria-hidden="true" className="mr-1" />
                                  {t("users_admin.action_suspend", "Suspend")}
                                </>
                              )}
                            </Button>
                             <IconButton
                              label={`Delete user @${u.username}`}
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
              onClick={() => applyFilters(searchQuery, roleFilter, statusFilter, Math.max(0, offset - limit))}
              className="text-xs"
            >
              <ChevronLeft size={14} className="mr-1" />
              {t("users_admin.btn_prev", "Previous")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasNext || isPending}
              onClick={() => applyFilters(searchQuery, roleFilter, statusFilter, offset + limit)}
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
              name={roleDialog.user?.display_name || roleDialog.user?.username}
              size={40}
            />
            <div>
              <div className="text-sm font-semibold text-[var(--ink)]">
                {roleDialog.user?.display_name}
              </div>
              <div className="text-xs text-[var(--ink-muted)]">
                @{roleDialog.user?.username}
              </div>
            </div>
          </div>

          <p className="text-sm text-[var(--ink)]">
            {t("users_admin.dialog_role_desc", { username: roleDialog.user?.username })}
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

      {/* 2. Suspend Confirmation Dialog */}
      <Dialog
        open={suspendDialog.open}
        onClose={() => setSuspendDialog({ open: false, user: null, reason: "" })}
        title={t("users_admin.dialog_suspend_title", "Suspend User Account")}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface)] border border-[var(--line)]">
            <Avatar
              src={suspendDialog.user?.avatar_url}
              name={suspendDialog.user?.display_name || suspendDialog.user?.username}
              size={40}
            />
            <div>
              <div className="text-sm font-semibold text-[var(--ink)]">
                {suspendDialog.user?.display_name}
              </div>
              <div className="text-xs text-[var(--ink-muted)]">
                @{suspendDialog.user?.username}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-xs text-[var(--danger)] flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              {t("users_admin.dialog_suspend_desc", { username: suspendDialog.user?.username })}
            </span>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="suspend-reason" className="text-xs font-semibold text-[var(--ink)]">
              {t("users_admin.dialog_suspend_reason_label", "Suspension Reason (optional)")}
            </label>
            <textarea
              id="suspend-reason"
              rows={3}
              value={suspendDialog.reason}
              onChange={(e) => setSuspendDialog((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Provide a reason for moderation records and audit logs..."
              maxLength={500}
              className="w-full text-xs p-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSuspendDialog({ open: false, user: null, reason: "" })}
              disabled={isPending}
            >
              {t("users_admin.btn_cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmSuspend}
              disabled={isPending}
            >
              {isPending ? t("users_admin.btn_saving", "Suspending...") : t("users_admin.action_suspend", "Confirm Suspension")}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* 3. Restore Account Confirmation Dialog */}
      <Dialog
        open={restoreDialog.open}
        onClose={() => setRestoreDialog({ open: false, user: null })}
        title={t("users_admin.dialog_restore_title", "Restore User Access")}
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--ink)]">
            {t("users_admin.dialog_restore_desc", { username: restoreDialog.user?.username })}
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRestoreDialog({ open: false, user: null })}
              disabled={isPending}
            >
              {t("users_admin.btn_cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              onClick={confirmRestore}
              disabled={isPending}
            >
              {isPending ? t("users_admin.btn_saving", "Restoring...") : t("users_admin.action_restore", "Restore Account")}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* 4. Delete Account Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, user: null })}
        title={t("users_admin.dialog_delete_title", "Delete User Account")}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-xs text-[var(--danger)] flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t("users_admin.action_delete", "Permanently Delete")}</p>
              <p className="mt-0.5">
                {t("users_admin.dialog_delete_desc", { username: deleteDialog.user?.username })}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteDialog({ open: false, user: null })}
              disabled={isPending}
            >
              {t("users_admin.btn_cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending ? t("users_admin.btn_deleting", "Deleting...") : t("users_admin.btn_confirm", "Delete")}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
