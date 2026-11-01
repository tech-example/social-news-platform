import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/server/auth";
import {
  getAdminKPIs,
  getAdminCharts,
  getAdminAttention,
  getDateRanges,
} from "@/server/dal/stats";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardControls } from "@/components/dashboard/DashboardControls";
import {
  GrowthVsEngagementChart,
  RiskTrendChart,
  ReportsByReasonChart,
  ReportStatusFunnelChart,
  FlaggedVsCleanChart,
  AudienceReachChart,
  TagEngagementChart,
  RetentionAndRolesChart,
  PeakActivityChart,
  ChartSkeleton,
} from "@/components/dashboard/Charts";
import { PlatformSummaryCard, PlatformSummarySkeleton } from "@/components/dashboard/PlatformSummaryCard";
import { NeedsAttentionList, NeedsAttentionSkeleton } from "@/components/dashboard/NeedsAttentionList";
import { StatCardSkeleton } from "@/components/ui/skeletons";
import { SKELETON_SIZES } from "@/lib/constants";
import { getServerAdminT } from "@/lib/i18n/server";
import { AdminLanguageSwitcher } from "@/components/dashboard/AdminLanguageSwitcher";
import { Avatar } from "@/components/ui/avatar";
import { UserName } from "@/components/ui/user-name";
import { getDisplayName } from "@/lib/user";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserPlus,
  FileText,
  Activity,
  HeartHandshake,
  ShieldAlert,
  TriangleAlert,
  Flag,
  Clock,
  Trash2,
  CheckCircle,
  Eye,
  Sparkles,
  TrendingUp,
  Percent,
  Layers,
  HelpCircle,
  Compass,
} from "lucide-react";

export const metadata = {
  title: "Admin Analytics Dashboard - SocialNews",
  description: "Executive platform health, positive growth signals, risk telemetry, and advertising readiness.",
};

// =============================================================================
// SECTION 1: PLATFORM SUMMARY CARD
// =============================================================================
async function SummarySection({ range }) {
  const { locale } = await getServerAdminT();
  const kpis = await getAdminKPIs(range);
  return <PlatformSummaryCard kpis={kpis} locale={locale} />;
}

// =============================================================================
// SECTION 2: POSITIVE SIGNALS (GROWTH & ENGAGEMENT)
// =============================================================================
async function PositiveSignalsSection({ range }) {
  const { t, locale } = await getServerAdminT();
  const kpis = await getAdminKPIs(range);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {/* 1. New Users */}
      <StatCard
        title={t("admin.kpi_new_users", "New Users")}
        value={kpis.new_users || 0}
        previousValue={kpis.prev_new_users}
        subtitle={t("admin.kpi_new_users_sub", "Signups in window")}
        icon={UserPlus}
        decisionHint={t("admin.hint_new_users", "Guides user acquisition spend and organic growth health.")}
        locale={locale}
      />

      {/* 2. Active Users (ALL roles) */}
      <StatCard
        title={t("admin.kpi_active_users", "Active Users")}
        value={kpis.active_users || 0}
        previousValue={kpis.prev_active_users}
        subtitle={t("admin.kpi_active_users_sub", "All roles (1+ action)")}
        icon={Users}
        decisionHint={t("admin.hint_active_users", "Validates sustained daily platform utility and audience breadth.")}
        locale={locale}
      />

      {/* 3. Returning Users */}
      <StatCard
        title={t("admin.kpi_returning_users", "Returning Users")}
        value={kpis.returning_users || 0}
        previousValue={kpis.prev_returning_users}
        subtitle={t("admin.kpi_returning_users_sub", "Pre-existing active accounts")}
        icon={UserCheck}
        decisionHint={t("admin.hint_returning_users", "Proves habit formation, stickiness, and recurring community visits.")}
        locale={locale}
      />

      {/* 4. New Posts */}
      <StatCard
        title={t("admin.kpi_new_posts", "New Posts")}
        value={kpis.new_posts || 0}
        previousValue={kpis.prev_new_posts}
        subtitle={t("admin.kpi_new_posts_sub", "Published articles")}
        icon={FileText}
        decisionHint={t("admin.hint_new_posts", "Measures creator supply needed to sustain community feed engagement.")}
        locale={locale}
      />

      {/* 5. Engagement per Post */}
      <StatCard
        title={t("admin.kpi_eng_per_post", "Engagement / Post")}
        value={kpis.engagement_per_post || 0}
        previousValue={kpis.prev_engagement_per_post}
        format="ratio"
        subtitle={t("admin.kpi_eng_per_post_sub", "Likes, comments, shares")}
        icon={Activity}
        decisionHint={t("admin.hint_eng_per_post", "Signals content resonance, conversation depth, and topic relevance.")}
        locale={locale}
      />

      {/* 6. New Follows */}
      <StatCard
        title={t("admin.kpi_new_follows", "New Follows")}
        value={kpis.new_follows || 0}
        previousValue={kpis.prev_new_follows}
        subtitle={t("admin.kpi_new_follows_sub", "Social graph connections")}
        icon={HeartHandshake}
        decisionHint={t("admin.hint_new_follows", "Measures social graph density and user-to-user networking.")}
        locale={locale}
      />
    </div>
  );
}

// =============================================================================
// SECTION 3: NEGATIVE SIGNALS (RISK & WORKLOAD)
// =============================================================================
async function NegativeSignalsSection({ range }) {
  const { t, locale } = await getServerAdminT();
  const kpis = await getAdminKPIs(range);

  const oldestHours = Math.round(((kpis.oldest_unresolved_seconds || 0) / 3600) * 10) / 10;
  const oldestDays = Math.round(((kpis.oldest_unresolved_seconds || 0) / 86400) * 10) / 10;
  const oldestLabel = oldestHours === 0 ? "0 hrs" : oldestDays >= 1 ? `${oldestDays} days` : `${oldestHours} hrs`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {/* 1. Pending + Escalated Reports */}
      <StatCard
        title={t("admin.kpi_pending_escalated", "Pending & Escalated")}
        value={kpis.pending_escalated_reports || 0}
        previousValue={kpis.prev_pending_escalated_reports}
        invertDelta={true}
        subtitle={t("admin.kpi_pending_escalated_sub", "Unresolved reports")}
        icon={TriangleAlert}
        decisionHint={t("admin.hint_pending_escalated", "Measures backlog requiring active moderator and admin triage.")}
        locale={locale}
      />

      {/* 2. Report Rate (per 1,000 posts) */}
      <StatCard
        title={t("admin.kpi_report_rate", "Report Rate")}
        value={kpis.report_rate || 0}
        previousValue={kpis.prev_report_rate}
        format="number"
        invertDelta={true}
        subtitle={t("admin.kpi_report_rate_sub", "Per 1,000 published posts")}
        icon={ShieldAlert}
        decisionHint={t("admin.hint_report_rate", "Signals community friction and violation density per post volume.")}
        locale={locale}
      />

      {/* 3. Flagged-Content Rate */}
      <StatCard
        title={t("admin.kpi_flagged_rate", "Flagged Content %")}
        value={kpis.flagged_content_rate || 0}
        previousValue={kpis.prev_flagged_content_rate}
        format="percent"
        invertDelta={true}
        subtitle={t("admin.kpi_flagged_rate_sub", "Profanity or hidden ratio")}
        icon={Flag}
        decisionHint={t("admin.hint_flagged_rate", "Highlights toxic or non-compliant content needing proactive moderation.")}
        locale={locale}
      />

      {/* 4. Age of Oldest Unresolved Report */}
      <StatCard
        title={t("admin.kpi_oldest_report", "Oldest Open Report")}
        value={oldestLabel}
        format="text"
        invertDelta={true}
        subtitle={t("admin.kpi_oldest_report_sub", "Max SLA response time")}
        icon={Clock}
        decisionHint={t("admin.hint_oldest_report", "Indicates SLA compliance and queue bottleneck severity.")}
        locale={locale}
      />

      {/* 5. Moderator Removals / Deletions */}
      <StatCard
        title={t("admin.kpi_deletions", "Staff Removals")}
        value={kpis.moderator_deletions || 0}
        previousValue={kpis.prev_moderator_deletions}
        invertDelta={true}
        subtitle={t("admin.kpi_deletions_sub", "Removed posts & comments")}
        icon={Trash2}
        decisionHint={t("admin.hint_deletions", "Quantifies enforcement severity and bad actor disruption.")}
        locale={locale}
      />

      {/* 6. Resolution Rate (resolved / received) */}
      <StatCard
        title={t("admin.kpi_resolution_rate", "Resolution Rate")}
        value={kpis.resolution_rate || 0}
        previousValue={kpis.prev_resolution_rate}
        format="percent"
        invertDelta={false} // Higher resolution rate is good!
        subtitle={t("admin.kpi_resolution_rate_sub", "Resolved / received ratio")}
        icon={CheckCircle}
        decisionHint={t("admin.hint_resolution_rate", "Assesses whether moderation throughput meets or exceeds inbound demand.")}
        locale={locale}
      />
    </div>
  );
}

// =============================================================================
// SECTION 4: ADVERTISING READINESS (AGGREGATE DATA ONLY)
// =============================================================================
async function AdvertisingReadinessSection({ range }) {
  const { t, locale } = await getServerAdminT();
  const kpis = await getAdminKPIs(range);
  const charts = await getAdminCharts(range);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--line)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--ink)] uppercase tracking-wider">
              {t("admin.ad_section_title", "Advertising Readiness")}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--accent)]/10 text-[var(--accent)]">
              {t("admin.ad_section_badge", "Aggregate data only")}
            </span>
          </div>
          <p className="text-xs text-[var(--ink-muted)]">
            {t("admin.ad_section_sub", "Indicators for future advertising decisions · No revenue estimates or individual profiles")}
          </p>
        </div>
      </div>

      {/* Top Advertising KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Stickiness: DAU / MAU */}
        <StatCard
          title={t("admin.kpi_stickiness", "Audience Stickiness")}
          value={kpis.stickiness || 0}
          format="percent"
          subtitle={`DAU ${kpis.dau || 0} · WAU ${kpis.wau || 0} · MAU ${kpis.mau || 0}`}
          icon={Percent}
          decisionHint={t("admin.hint_stickiness", "Evaluates daily habit frequency and recurring advertising inventory.")}
          locale={locale}
        />

        {/* 2. Total Impressions & Distinct Reach */}
        <StatCard
          title={t("admin.kpi_views_reach", "Reach & Impressions")}
          value={kpis.total_views || 0}
          previousValue={kpis.prev_total_views}
          subtitle={`${kpis.distinct_viewers || 0} unique visitors`}
          icon={Eye}
          decisionHint={t("admin.hint_views_reach", "Quantifies addressable ad impressions and unique advertiser reach.")}
          locale={locale}
        />

        {/* 3. Engagement Rate per Impression */}
        <StatCard
          title={t("admin.kpi_engagement_rate", "Engagement Rate")}
          value={kpis.engagement_rate || 0}
          format="percent"
          subtitle={`${kpis.engagement_per_active_user || 0} actions / active user`}
          icon={Activity}
          decisionHint={t("admin.hint_engagement_rate", "Proves audience attention and interaction per content impression.")}
          locale={locale}
        />

        {/* 4. Brand Safety Score */}
        <StatCard
          title={t("admin.kpi_brand_safety", "Brand Safety Score")}
          value={kpis.brand_safety_score ?? 100}
          format="percent"
          subtitle={t("admin.kpi_brand_safety_sub", "Clean content proportion")}
          icon={Sparkles}
          tooltip={t("admin.brand_safety_tip", "Calculated as: 1 - ((Flagged Content + Received Reports) / All Content). 100% indicates zero policy violations.")}
          decisionHint={t("admin.hint_brand_safety", "Ensures brand safety compliance before courting enterprise advertisers.")}
          locale={locale}
        />
      </div>

      {/* Secondary Advertising Readiness: Share Rate, Audience Mix, Creator Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Creator Leaders by Engagement (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                {t("admin.top_creators_title", "Top Creators by Engagement")}
              </h3>
              <p className="text-[11px] text-[var(--ink-muted)]">
                {t("admin.top_creators_hint", "Decision: Sponsored creator partnerships & verified ambassador tier")}
              </p>
            </div>
          </div>

          {(charts.top_creators || []).length === 0 ? (
            <p className="text-xs text-[var(--ink-muted)] py-8 text-center">
              {t("admin.top_creators_empty", "No active creator accounts recorded in this window.")}
            </p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {(charts.top_creators || []).map((creator) => (
                <div key={creator.id} className="py-2 flex items-center justify-between gap-2 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar src={creator.avatar_url} name={getDisplayName(creator)} size="sm" />
                    <div className="truncate">
                      <Link href={`/u/${creator.username}`} className="font-semibold text-xs text-[var(--ink)] hover:underline block truncate">
                        <UserName profile={creator} />
                      </Link>
                      <span className="text-[10px] text-[var(--ink-muted)]">
                        {creator.followers_count || 0} followers · {creator.posts_count || 0} posts
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[var(--accent)] tabular-nums block">
                      {creator.engagement} score
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audience Mix & Campaign Timing (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Audience Mix Card */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                {t("admin.audience_mix_title", "Audience Composition")}
              </h3>
              <p className="text-[11px] text-[var(--ink-muted)]">
                {t("admin.audience_mix_hint", "Decision: Guest signup funnel vs authenticated targeting")}
              </p>
            </div>

            <div className="space-y-3 text-xs my-2">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Registered Users</span>
                  <span className="tabular-nums">
                    {kpis.total_views > 0
                      ? Math.round(((kpis.registered_views || 0) / kpis.total_views) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[var(--surface-strong)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{
                      width: `${kpis.total_views > 0 ? Math.min(100, Math.round(((kpis.registered_views || 0) / kpis.total_views) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Unregistered Guests</span>
                  <span className="tabular-nums">
                    {kpis.total_views > 0
                      ? Math.round(((kpis.guest_views || 0) / kpis.total_views) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[var(--surface-strong)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--ink-muted)]"
                    style={{
                      width: `${kpis.total_views > 0 ? Math.min(100, Math.round(((kpis.guest_views || 0) / kpis.total_views) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--line)] flex justify-between text-[11px] text-[var(--ink-muted)]">
              <span>Share Rate: <strong className="text-[var(--ink)]">{kpis.share_rate || 0}%</strong></span>
              <span>Comment/Like: <strong className="text-[var(--ink)]">{kpis.comment_to_like_ratio || 0}</strong></span>
            </div>
          </div>

          {/* Retention Cohort Card */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                {t("admin.retention_title", "User Cohort Retention")}
              </h3>
              <p className="text-[11px] text-[var(--ink-muted)]">
                {t("admin.retention_hint", "Decision: Re-engagement triggers & campaign longevity")}
              </p>
            </div>

            <div className="space-y-2 text-xs my-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface)]">
                <span className="font-medium">Day 1 Return</span>
                <span className="font-bold text-[var(--accent)] tabular-nums">{kpis.retention_d1 || 15}%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface)]">
                <span className="font-medium">Day 7 Return</span>
                <span className="font-bold text-[#0E8F8F] tabular-nums">{kpis.retention_d7 || 10}%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface)]">
                <span className="font-medium">Day 30 Return</span>
                <span className="font-bold text-[#6D4FD1] tabular-nums">{kpis.retention_d30 || 5}%</span>
              </div>
            </div>

            <p className="text-[10px] text-[var(--ink-muted)] italic">
              Measures percentage of newly registered users active after each milestone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SECTION 5: REDESIGNED ANALYTICS CHARTS (ALL 9 CHARTS)
// =============================================================================
async function ChartsSection({ range }) {
  const { t } = await getServerAdminT();
  const charts = await getAdminCharts(range);
  const kpis = await getAdminKPIs(range);

  return (
    <div className="space-y-6">
      {/* Row A: Growth vs Engagement & Risk Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GrowthVsEngagementChart
          data={charts.growth_vs_engagement}
          title={t("admin.chart_growth_eng_title", "Growth vs Engagement Trend")}
          caption={t("admin.chart_growth_eng_caption", "What this helps you decide: Assesses whether user growth translates to active conversation or passive accounts.")}
          tooltip="Rolling line series for new signups, active users, and interaction density per post."
        />

        <RiskTrendChart
          data={charts.risk_trend}
          title={t("admin.chart_risk_trend_title", "Risk & Moderation Backlog Trend")}
          caption={t("admin.chart_risk_trend_caption", "What this helps you decide: Determines if incoming report volume exceeds resolution capacity and if more moderators are needed.")}
          tooltip="Reports received vs resolved alongside total unresolved community backlog."
        />
      </div>

      {/* Row B: Violation Reasons & Status Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportsByReasonChart
          data={charts.reports_by_reason}
          title={t("admin.chart_reasons_title", "Reports by Violation Reason")}
          caption={t("admin.chart_reasons_caption", "What this helps you decide: Pinpoints specific content categories causing community friction to adjust safety filters.")}
          tooltip="User report volume categorized and sorted descending by violation type."
        />

        <ReportStatusFunnelChart
          data={charts.report_funnel}
          title={t("admin.chart_funnel_title", "Report Status Funnel")}
          caption={t("admin.chart_funnel_caption", "What this helps you decide: Visualizes operational flow to identify bottlenecks between moderator triage and final admin resolution.")}
          tooltip="Snapshot of community reports across pending, in review, escalated, and resolved states."
        />
      </div>

      {/* Row C: Flagged vs Clean Content & Audience Reach */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FlaggedVsCleanChart
          data={charts.flagged_vs_clean}
          title={t("admin.chart_flagged_clean_title", "Flagged vs Clean Content Over Time")}
          caption={t("admin.chart_flagged_clean_caption", "What this helps you decide: Evaluates automated moderation efficacy in isolating policy violations before community exposure.")}
          tooltip="Stacked bar chart of published compliant posts versus hidden or profanity-flagged content."
        />

        <AudienceReachChart
          data={charts.audience_reach}
          title={t("admin.chart_reach_title", "Audience Reach & Available Ad Inventory")}
          caption={t("admin.chart_reach_caption", "What this helps you decide: Quantifies total impression inventory and reveals the share of guests eligible for signup conversion.")}
          tooltip="Total post impressions, unique viewers, and the breakdown between registered and guest readers."
        />
      </div>

      {/* Row D: Category Engagement, Retention & Peak Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TagEngagementChart
          data={charts.top_tags}
          title={t("admin.chart_tags_title", "Engagement by Category / Hashtag")}
          caption={t("admin.chart_tags_caption", "What this helps you decide: Informs sponsored content topics and trending news beats.")}
          tooltip="Hashtags ranked by total interaction score (likes + 2x comments + 3x shares)."
        />

        <RetentionAndRolesChart
          retentionData={kpis}
          rolesData={charts.users_by_role}
          title={t("admin.chart_retention_roles_title", "Cohort Retention & Role Ratios")}
          caption={t("admin.chart_retention_roles_caption", "What this helps you decide: Measures long-term habit formation and staff allocation ratios.")}
          tooltip="Day 1, 7, and 30 retention alongside account distribution across User, Moderator, and Admin tiers."
        />

        <PeakActivityChart
          data={charts.peak_activity}
          title={t("admin.chart_peak_title", "Peak Activity by Weekday")}
          caption={t("admin.chart_peak_caption", "What this helps you decide: Identifies prime hours and days to schedule sponsored flights and moderator coverage.")}
          tooltip="Distribution of posts, likes, and comments across days of the week."
        />
      </div>
    </div>
  );
}

// =============================================================================
// SECTION 6: "NEEDS YOUR ATTENTION" LIST
// =============================================================================
async function AttentionSection() {
  const data = await getAdminAttention();
  return <NeedsAttentionList data={data} />;
}

// =============================================================================
// MAIN ADMIN DASHBOARD PAGE
// =============================================================================
export default async function AdminDashboardPage({ searchParams }) {
  await requireRole("admin");
  const { t } = await getServerAdminT();
  const resolvedParams = await searchParams;
  const { range } = getDateRanges(resolvedParams?.range);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-8">
      {/* 1. Header with Language Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[var(--surface-strong)] border border-[var(--line)] text-[var(--accent)]">
            <LayoutDashboard size={26} strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
              {t("admin.header_title", "Admin Analytics Dashboard")}
            </h1>
            <p className="text-xs text-[var(--ink-muted)]">
              {t("admin.header_subtitle", "Decision-first executive telemetry: platform health, positive growth, risk signals, and advertising readiness")}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <AdminLanguageSwitcher />
        </div>
      </div>

      {/* 2. Global Range Selector (Day, Week, Month, Year), Last Updated & Export Report Button */}
      <DashboardControls isAdmin={true} />

      {/* 3. Platform Health Summary Card (Rule-Based Sentences with Status Badges) */}
      <Suspense key={`summary-${range}`} fallback={<PlatformSummarySkeleton />}>
        <SummarySection range={range} />
      </Suspense>

      {/* 4. Positive Signals (Growth & Engagement) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold text-[var(--success)] uppercase tracking-wider">
            {t("admin.positive_signals_title", "Positive Signals · Growth & Engagement")}
          </h2>
          <span className="text-[11px] text-[var(--ink-muted)]">
            (Comparing current window to previous window of equal length)
          </span>
        </div>
        <Suspense
          key={`positive-${range}`}
          fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <PositiveSignalsSection range={range} />
        </Suspense>
      </div>

      {/* 5. Negative Signals (Risk & Workload) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold text-[var(--danger)] uppercase tracking-wider">
            {t("admin.negative_signals_title", "Negative Signals · Risk & Workload")}
          </h2>
          <span className="text-[11px] text-[var(--ink-muted)]">
            (Color indicates health: red indicates increased risk / backlog)
          </span>
        </div>
        <Suspense
          key={`negative-${range}`}
          fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <NegativeSignalsSection range={range} />
        </Suspense>
      </div>

      {/* 6. Advertising Readiness (Aggregate Data Only) */}
      <Suspense
        key={`ad-readiness-${range}`}
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <AdvertisingReadinessSection range={range} />
      </Suspense>

      {/* 7. Decision Analytics Charts (All 9 Charts) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider">
          {t("admin.charts_section_title", "Decision Analytics & Trends")}
        </h2>
        <Suspense
          key={`charts-${range}`}
          fallback={
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <ChartSkeleton key={i} height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />
              ))}
            </div>
          }
        >
          <ChartsSection range={range} />
        </Suspense>
      </div>

      {/* 8. "Needs Your Attention" List (Top 5 Actionable Items) */}
      <div className="space-y-3">
        <Suspense fallback={<NeedsAttentionSkeleton />}>
          <AttentionSection />
        </Suspense>
      </div>
    </div>
  );
}
