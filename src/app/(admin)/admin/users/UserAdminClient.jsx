"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateUserRoleAction, setUserSuspendedAction } from "@/server/actions/admin";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatCompactNumber, formatRelativeTime } from "@/lib/format";
import { Ban, CheckCircle2, Shield } from "lucide-react";

export function UserAdminClient({ users = [], total = 0, currentAdminId }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (userId, newRole) => {
    startTransition(async () => {
      const res = await updateUserRoleAction(userId, newRole);
      if (res.ok) {
        addToast(`Role updated to ${newRole}.`);
        router.refresh();
      } else {
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
      startTransition(async () => {
        const res = await setUserSuspendedAction(userId, nextState);
        if (res.ok) {
          addToast(nextState ? "User suspended." : "User restored.");
          router.refresh();
        } else {
          addToast(res.error || "Failed to update suspension status.", "error");
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-[var(--ink-muted)] tabular-nums">
        Showing <strong className="text-[var(--ink)]">{users.length}</strong> of{" "}
        <strong className="text-[var(--ink)]">{total}</strong> users
      </div>

      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
        {users.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--ink-muted)]">No users found.</p>
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
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={u.avatar_url}
                          name={u.display_name || u.username}
                          size={34}
                        />
                        <div className="flex flex-col min-w-0">
                          <Link
                            href={`/u/${u.username}`}
                            className="text-xs font-semibold hover:underline text-[var(--ink)] truncate"
                          >
                            @{u.username}
                          </Link>
                          <span className="text-[11px] text-[var(--ink-muted)] truncate">
                            {u.display_name}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {isSelf ? (
                        <Badge variant="neutral" size="sm">
                          admin
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
                        <Button
                          variant={u.is_suspended ? "secondary" : "danger"}
                          onClick={() => handleToggleSuspend(u.id, u.is_suspended)}
                          disabled={isPending}
                          className="text-xs h-7 px-3"
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
