import { NextResponse } from "next/server";
import { getAdminClient } from "@/server/admin-client";
import { env } from "@/server/env";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const keyParam = searchParams.get("key");
    const cronSecretHeader = request.headers.get("x-cron-secret");

    const expectedSecret = env.CRON_SECRET || process.env.CRON_SECRET;

    if (!expectedSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured on server." },
        { status: 500 }
      );
    }

    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;
    const providedSecret = bearerToken || cronSecretHeader || keyParam;

    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = getAdminClient();
    // Call the delete_old_notifications RPC or fallback to direct delete
    const { data: rpcDeleted, error: rpcError } = await adminSupabase.rpc(
      "delete_old_notifications"
    );

    let deletedCount = rpcDeleted;
    if (rpcError) {
      const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: deleted, error: deleteError } = await adminSupabase
        .from("notifications")
        .delete()
        .lt("created_at", cutoff)
        .select("id");

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
      deletedCount = deleted?.length || 0;
    }

    return NextResponse.json({
      ok: true,
      deletedCount: deletedCount ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron cleanup-notifications error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
