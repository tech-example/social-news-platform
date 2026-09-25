"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth";
import { getAdminClient } from "@/server/admin-client";
import { roleUpdateSchema, suspendUserSchema } from "@/lib/validators";

export async function updateUserRoleAction(targetUserId, newRole) {
  const session = await requireRole("admin");
  const parsed = roleUpdateSchema.safeParse({ targetUserId, role: newRole });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid role." };
  }

  if (targetUserId === session.user.id) {
    return { ok: false, error: "Administrators cannot change their own role." };
  }

  const adminSupabase = getAdminClient();
  const { error } = await adminSupabase
    .from("profiles")
    .update({ role: parsed.data.role, updated_at: new Date().toISOString() })
    .eq("id", targetUserId);

  if (error) {
    return { ok: false, error: error.message || "Failed to update role." };
  }

  await adminSupabase.from("audit_logs").insert({
    actor_id: session.user.id,
    action: "update_user_role",
    target_type: "user",
    target_id: targetUserId,
    details: { newRole: parsed.data.role },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserSuspendedAction(targetUserId, isSuspended, reason = null) {
  const session = await requireRole("admin");
  const parsed = suspendUserSchema.safeParse({ targetUserId, isSuspended, reason });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid input." };
  }

  if (targetUserId === session.user.id) {
    return { ok: false, error: "Administrators cannot suspend themselves." };
  }

  const adminSupabase = getAdminClient();
  const { error } = await adminSupabase
    .from("profiles")
    .update({
      is_suspended: parsed.data.isSuspended,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetUserId);

  if (error) {
    return { ok: false, error: error.message || "Failed to update suspension status." };
  }

  await adminSupabase.from("audit_logs").insert({
    actor_id: session.user.id,
    action: parsed.data.isSuspended ? "suspend_user" : "unsuspend_user",
    target_type: "user",
    target_id: targetUserId,
    details: { reason: parsed.data.reason },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUserAction(targetUserId) {
  const session = await requireRole("admin");

  if (!targetUserId || typeof targetUserId !== "string") {
    return { ok: false, error: "Invalid user ID." };
  }

  if (targetUserId === session.user.id) {
    return { ok: false, error: "Administrators cannot delete their own account." };
  }

  const adminSupabase = getAdminClient();

  // 1. Delete from Supabase Auth
  const { error: authError } = await adminSupabase.auth.admin.deleteUser(targetUserId);

  // 2. Cascade delete from profiles
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .delete()
    .eq("id", targetUserId);

  if (authError && profileError) {
    console.error("deleteUserAction error:", authError || profileError);
    return { ok: false, error: authError?.message || profileError?.message || "Failed to delete user." };
  }

  // 3. Audit log the deletion
  await adminSupabase.from("audit_logs").insert({
    actor_id: session.user.id,
    action: "delete_user",
    target_type: "user",
    target_id: targetUserId,
    details: { deletedUserId: targetUserId },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}
