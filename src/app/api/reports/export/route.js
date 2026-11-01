import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth";
import { getAdminClient } from "@/server/admin-client";
import { getAdminKPIs, getDateRanges } from "@/server/dal/stats";

export async function GET(request) {
  try {
    const session = await requireRole("admin");
    const adminSupabase = getAdminClient();
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get("range");

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    // If range is specified (or called from analytics dashboard), export aggregate numbers
    if (rangeParam) {
      const { range, from, to, prevFrom, prevTo } = getDateRanges(rangeParam);
      const kpis = await getAdminKPIs(range);

      // Audit log the export
      await adminSupabase.from("audit_logs").insert({
        actor_id: session.user.id,
        action: "export_admin_analytics_csv",
        entity: "analytics",
        metadata: { range, from, to },
      });

      const rows = [
        ["Report Type", "Admin Analytics Aggregate Summary"],
        ["Generated At", new Date().toISOString()],
        ["Selected Range", range.toUpperCase()],
        ["Window Start", from],
        ["Window End", to],
        ["Previous Window Start", prevFrom],
        ["Previous Window End", prevTo],
        [],
        ["--- 1. POSITIVE SIGNALS (GROWTH & ENGAGEMENT) ---", ""],
        ["Metric", "Current Value", "Previous Value", "Delta (%)"],
        ["New Users", kpis.new_users ?? 0, kpis.prev_new_users ?? 0, `${kpis.delta_new_users ?? 0}%`],
        ["Active Users (All Roles)", kpis.active_users ?? 0, kpis.prev_active_users ?? 0, `${kpis.delta_active_users ?? 0}%`],
        ["Returning Users", kpis.returning_users ?? 0, kpis.prev_returning_users ?? 0, `${kpis.delta_returning_users ?? 0}%`],
        ["New Posts Published", kpis.new_posts ?? 0, kpis.prev_new_posts ?? 0, `${kpis.delta_new_posts ?? 0}%`],
        ["Total Engagement (Likes + Comments + Shares)", kpis.total_engagement ?? 0, kpis.prev_total_engagement ?? 0, `${kpis.delta_total_engagement ?? 0}%`],
        ["Engagement per Post", kpis.engagement_per_post ?? 0, kpis.prev_engagement_per_post ?? 0, `${kpis.delta_engagement_per_post ?? 0}%`],
        ["New Follows Created", kpis.new_follows ?? 0, kpis.prev_new_follows ?? 0, `${kpis.delta_new_follows ?? 0}%`],
        [],
        ["--- 2. NEGATIVE SIGNALS (RISK & WORKLOAD) ---", ""],
        ["Metric", "Current Value", "Previous Value", "Delta (%)"],
        ["Pending & Escalated Reports", kpis.pending_escalated_reports ?? 0, kpis.prev_pending_escalated_reports ?? 0, `${kpis.delta_pending_escalated_reports ?? 0}%`],
        ["Report Rate (per 1,000 Posts)", kpis.report_rate ?? 0, kpis.prev_report_rate ?? 0, `${kpis.delta_report_rate ?? 0}%`],
        ["Flagged Content Rate (%)", `${kpis.flagged_content_rate ?? 0}%`, `${kpis.prev_flagged_content_rate ?? 0}%`, `${kpis.delta_flagged_content_rate ?? 0}%`],
        ["Oldest Unresolved Report (Hours)", Math.round((kpis.oldest_unresolved_seconds ?? 0) / 360) / 10, "N/A", "N/A"],
        ["Moderator Removals / Deletions", kpis.moderator_deletions ?? 0, kpis.prev_moderator_deletions ?? 0, `${kpis.delta_moderator_deletions ?? 0}%`],
        ["Resolution Rate (%)", `${kpis.resolution_rate ?? 0}%`, `${kpis.prev_resolution_rate ?? 0}%`, `${kpis.delta_resolution_rate ?? 0}%`],
        [],
        ["--- 3. ADVERTISING READINESS (AGGREGATE DATA ONLY) ---", ""],
        ["Metric", "Value", "Unit / Context"],
        ["Daily Active Users (DAU)", kpis.dau ?? 0, "Users in last 24h"],
        ["Weekly Active Users (WAU)", kpis.wau ?? 0, "Users in last 7d"],
        ["Monthly Active Users (MAU)", kpis.mau ?? 0, "Users in last 30d"],
        ["Audience Stickiness (DAU / MAU)", `${kpis.stickiness ?? 0}%`, "Recurring habit ratio"],
        ["Total Post Views (Impressions)", kpis.total_views ?? 0, "Views in window"],
        ["Distinct Viewers (Reach)", kpis.distinct_viewers ?? 0, "Unique visitors in window"],
        ["Guest Views", kpis.guest_views ?? 0, "Views by unregistered guests"],
        ["Registered Views", kpis.registered_views ?? 0, "Views by signed-in accounts"],
        ["Engagement Rate (per View)", `${kpis.engagement_rate ?? 0}%`, "Interactions / Views"],
        ["Engagement (per Active User)", kpis.engagement_per_active_user ?? 0, "Interactions / Active user"],
        ["Share Rate", `${kpis.share_rate ?? 0}%`, "Shares / Views"],
        ["Comment to Like Ratio", kpis.comment_to_like_ratio ?? 0, "Comments / Likes"],
        ["Day 1 Retention", `${kpis.retention_d1 ?? 0}%`, "New user cohort return on Day 1"],
        ["Day 7 Retention", `${kpis.retention_d7 ?? 0}%`, "New user cohort return on Day 7"],
        ["Day 30 Retention", `${kpis.retention_d30 ?? 0}%`, "New user cohort return on Day 30"],
        ["Brand Safety Score", `${kpis.brand_safety_score ?? 100}%`, "1 - (Flagged + Reported / All Content)"],
      ];

      const csvContent = rows
        .map((r) => r.map(escapeCsv).join(","))
        .join("\r\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="admin-analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Default: Raw reports CSV export (backward compatible)
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
        reporter:profiles!reports_reporter_id_fkey(id, username, display_name)
      `)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await adminSupabase.from("audit_logs").insert({
      actor_id: session.user.id,
      action: "export_reports_csv",
      entity: "report",
      metadata: { rowCount: reports?.length || 0 },
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

    const reportRows = (reports || []).map((r) => [
      escapeCsv(r.id),
      escapeCsv(r.created_at),
      escapeCsv(r.reporter?.display_name || r.reporter?.username || "Unknown"),
      escapeCsv(r.target_type),
      escapeCsv(r.target_id),
      escapeCsv(r.reason),
      escapeCsv(r.status),
      escapeCsv(r.action_taken || ""),
      escapeCsv(r.actioned_at || ""),
      escapeCsv(r.details || ""),
    ]);

    const csvData = [headers.map(escapeCsv).join(",")]
      .concat(reportRows.map((r) => r.join(",")))
      .join("\r\n");

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reports-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export CSV error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate CSV export" },
      { status: 500 }
    );
  }
}
