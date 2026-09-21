import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth";
import { getAdminClient } from "@/server/admin-client";

export async function GET() {
  try {
    const session = await requireRole("admin");
    const adminSupabase = getAdminClient();

    const { data: reports, error } = await adminSupabase
      .from("reports")
      .select(`
        id,
        target_type,
        target_id,
        reason,
        details,
        status,
        action_taken,
        actioned_at,
        created_at,
        reporter:profiles!reports_reporter_id_fkey(username)
      `)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log this export
    await adminSupabase.from("audit_logs").insert({
      actor_id: session.user.id,
      action: "export_reports_csv",
      target_type: "report",
      details: { rowCount: reports?.length || 0 },
    });

    const headers = [
      "Report ID",
      "Created At",
      "Reporter",
      "Target Type",
      "Target ID",
      "Reason",
      "Status",
      "Action Taken",
      "Actioned At",
      "Details",
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = (reports || []).map((r) => [
      escapeCsv(r.id),
      escapeCsv(r.created_at),
      escapeCsv(r.reporter?.username || "unknown"),
      escapeCsv(r.target_type),
      escapeCsv(r.target_id),
      escapeCsv(r.reason),
      escapeCsv(r.status),
      escapeCsv(r.action_taken || ""),
      escapeCsv(r.actioned_at || ""),
      escapeCsv(r.details || ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reports-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("CSV Export error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate CSV export." },
      { status: 500 }
    );
  }
}
