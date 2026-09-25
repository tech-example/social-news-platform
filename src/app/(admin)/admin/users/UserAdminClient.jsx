"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { updateUserRoleAction, setUserSuspendedAction, deleteUserAction } from "@/server/actions/admin";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatCompactNumber, formatRelativeTime } from "@/lib/format";
import { Ban, CheckCircle2, Shield, Trash2 } from "lucide-react";

export function UserAdminClient({ users: initialUsers = [], total = 0, currentAdminId }) {
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [users, setUsers] = useState(initialUsers);

  const handleRoleChange = (userId, newRole) => {
    // Optimistically update local state
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    startTransition(async () => {
      const res = await updateUserRoleAction(userId, newRole);
      if (res.ok) {
        addToast(`Role updated to ${newRole}.`);
      } else {
        // Revert on failure
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: u.role } : u))
        );
        addToast(res.error || "Failed to update role.", "error");
      }
    });
  };

  const handleToggleSuspend = (userId, currentSuspended) => {
    const nextState = !currentSuspended;
    const msg = nextState
      ? "Are you sure you want to suspend this user? They will be barred from posting and interacting."
      : "Restore user account access?";

    if (window.confirm(msg)) {
      // Optimistically update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_suspended: nextState } : u))
      );
      startTransition(async () => {
        const res = await setUserSuspendedAction(userId, nextState);
        if (res.ok) {
          addToast(nextState ? "User suspended." : "User restored.");
        } else {
          // Revert on failure
          setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, is_suspended: currentSuspended } : u))
          );
          addToast(res.error || "Failed to update suspension status.", "error");
        }
      });
    }
  };

  const handleDeleteUser = (userId, username) => {
    const msg = `Are you sure you want to permanently delete the account of @${username}? This action is irreversible and cascades to all their content.`;
    if (window.confirm(msg)) {
      const previousUsers = users;
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      startTransition(async () => {
        const res = await deleteUserAction(userId);
        if (res.ok) {
          addToast(`User @${username} deleted.`);
        } else {
          // Revert on failure
          setUsers(previousUsers);
          addToast(res.error || "Failed to delete user.", "error");
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-[var(--ink-muted)] tabular-nums">
        Showing {users.length} of {total} registered users
      </div>

      <div className="bg-white border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
        {users.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--ink-muted)]">
            No users match this filter.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={isPending}
                          className="text-xs font-medium px-2 py-1 rounded border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] cursor-pointer"
                        >
                          <option value="user">User</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </TableCell>

                    <TableCell className="text-xs tabular-nums text-[var(--ink-muted)]">
                      {formatCompactNumber(u.followers_count || 0)}
                    </TableCell>

                    <TableCell>
                      <Badge variant={u.is_suspended ? "danger" : "success"} size="sm">
                        {u.is_suspended ? "Suspended" : "Active"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-[var(--ink-muted)]" suppressHydrationWarning>
                      {formatRelativeTime(u.created_at)}
                    </TableCell>

                    <TableCell className="text-right">
                      {!isSelf && (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant={u.is_suspended ? "secondary" : "danger"}
                            onClick={() => handleToggleSuspend(u.id, u.is_suspended)}
                            disabled={isPending}
                            className="text-xs h-7 px-2.5"
                          >
                            {u.is_suspended ? (
                              <>
                                <CheckCircle2 size={13} strokeWidth={2} aria-hidden="true" className="mr-1 text-[var(--success)]" />
                                Restore
                              </>
                            ) : (
                              <>
                                <Ban size={13} strokeWidth={2} aria-hidden="true" className="mr-1" />
                                Suspend
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            disabled={isPending}
                            aria-label={`Delete user ${u.username}`}
                            className="text-xs h-7 px-2 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                          >
                            <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
