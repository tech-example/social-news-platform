"use server";
import { revalidatePath } from "next/cache";
import { getSession, requireRole } from "@/server/auth";
import { createUserClient } from "@/server/supabase";
import { getAdminClient } from "@/server/admin-client";
import { reportSchema } from "@/lib/validators";

export async function createReportAction(input) {
  const session = await getSession();
  if (!session?.user) {
    return {
      ok: false,
      error: "Please sign in to report content.",
    };
  }
  const parsed = reportSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid report input." };
  }

  const { targetType, targetId, reason, details } = parsed.data;
  const supabase = await createUserClient();

  const reportPayload = {
    reporter_id: session.user.id,
    target_type: targetType,
    reason,
    details: details || null,
    status: "pending",
  };

  if (targetType === "post") {
    reportPayload.target_post_id = targetId;
  } else if (targetType === "user") {
    reportPayload.target_user_id = targetId;
  } else if (targetType === "comment") {
    reportPayload.target_comment_id = targetId;
  }

  const { data: newReport, error } = await supabase
    .from("reports")
    .insert(reportPayload)
    .select("id")
    .single();

  if (error) {
    if (
      error.code === "23505" ||
      error.message?.includes("reports_no_duplicates")
    ) {
      return {
        ok: false,
        alreadyReported: true,
        error: "You have already reported this item. Our moderation team is currently reviewing it.",
      };
    }
    console.error("createReportAction error:", error);
    return { ok: false, error: error.message || "Failed to submit report." };
  }

  return { ok: true, reportId: newReport.id };
}

export async function transitionReportAction({ reportId, nextStatus, actionTaken, note }) {
  const session = await requireRole("moderator");
  const adminSupabase = getAdminClient();

  // Call the atomic report transition RPC from migration 00002
  const { error } = await adminSupabase.rpc("report_transition", {
    p_report_id: reportId,
    p_next_status: nextStatus,
    p_actor_id: session.user.id,
    p_action_taken: actionTaken || null,
    p_note: note || null,
  });

  if (error) {
    return { ok: false, error: error.message || "Failed to update report status." };
  }

  // Audit log
  await adminSupabase.from("audit_logs").insert({
    actor_id: session.user.id,
    action: `report_transition_to_${nextStatus}`,
    entity: "report",
    entity_id: reportId,
    metadata: { nextStatus, actionTaken, note },
  });

  revalidatePath("/moderation");
  revalidatePath("/moderation/reports");
  revalidatePath(`/moderation/reports/${reportId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  return { ok: true };
}
