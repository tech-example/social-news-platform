"use client";
import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Table, ChartLine, Info } from "lucide-react";
import { ChartSkeleton } from "@/components/ui/skeletons";
import { SKELETON_SIZES } from "@/lib/constants";
import { useMounted } from "@/lib/use-mounted";
import { useAdminLocale } from "@/lib/i18n/AdminLocaleProvider";

export { ChartSkeleton };

export const DATAVIZ_PALETTE = [
  "#0095F6", // Primary Blue
  "#0E8F8F", // Teal
  "#B7791F", // Amber / Warm Gold
  "#6D4FD1", // Purple
  "#ED4956", // Coral / Red
  "#737373", // Slate Gray
];

function ChartContainer({ title, caption, tooltip, showTable, onToggleTable, children, tableContent }) {
  const { t } = useAdminLocale();
  return (
    <div
      style={{ minHeight: `${SKELETON_SIZES.CHART.DEFAULT_HEIGHT}px` }}
      className="w-full rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-4 sm:p-5 shadow-xs flex flex-col justify-between"
    >
      <div className="mb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-sm font-bold text-[var(--ink)] truncate">{title}</h3>
            {tooltip && (
              <span title={tooltip} className="text-[var(--ink-muted)] cursor-help shrink-0">
                <Info size={13} strokeWidth={2} aria-hidden="true" />
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleTable}
            aria-label={showTable ? t("admin.view_chart", "View as chart") : t("admin.view_table", "View as table")}
            title={showTable ? t("admin.view_chart", "View as chart") : t("admin.view_table", "View as table")}
            className="p-1 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors cursor-pointer shrink-0"
          >
            {showTable ? (
              <ChartLine size={16} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Table size={16} strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
        {caption && (
          <p className="text-[11px] text-[var(--ink-muted)] mt-0.5 italic">
            {caption}
          </p>
        )}
      </div>

      {showTable ? tableContent : children}
    </div>
  );
}

function EmptyChartState({ title, caption }) {
  const { t } = useAdminLocale();
  return (
    <div
      style={{ height: `${SKELETON_SIZES.CHART.DEFAULT_HEIGHT}px` }}
      className="w-full rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-5 flex flex-col items-center justify-center text-center shadow-xs"
    >
      <h3 className="text-sm font-bold text-[var(--ink)] mb-1">{title}</h3>
      {caption && <p className="text-[11px] text-[var(--ink-muted)] italic mb-2">{caption}</p>}
      <p className="text-xs text-[var(--ink-muted)]">{t("admin.no_data", "No data for this range. Try a wider date range.")}</p>
    </div>
  );
}

// =============================================================================
// CHART A: Growth vs Engagement Trend (Line)
// =============================================================================
export function GrowthVsEngagementChart({ data = [], title, caption, tooltip }) {
  const [showTable, setShowTable] = useState(false);
  const mounted = useMounted();
  const { formatNumber, formatDate } = useAdminLocale();

  if (!mounted) return <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />;
  if (!data || data.length === 0) return <EmptyChartState title={title} caption={caption} />;

  const chartData = data.map((d) => {
    const raw = d.bucket;
    const dObj = new Date(raw);
    const timeStr = !isNaN(dObj.getTime())
      ? formatDate(dObj, { month: "short", day: "numeric", hour: "2-digit" })
      : String(raw);
    return {
      time: timeStr,
      new_users: Number(d.new_users) || 0,
      active_users: Number(d.active_users) || 0,
      engagement_per_post: Number(d.engagement_per_post) || 0,
    };
  });

  return (
    <ChartContainer
      title={title}
      caption={caption}
      tooltip={tooltip}
      showTable={showTable}
      onToggleTable={() => setShowTable(!showTable)}
      tableContent={
        <div className="h-[210px] overflow-y-auto border border-[var(--line)] rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">Time</th>
                <th className="py-2 px-3 font-semibold text-right">New Users</th>
                <th className="py-2 px-3 font-semibold text-right">Active Users</th>
                <th className="py-2 px-3 font-semibold text-right">Eng/Post</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {chartData.map((r, i) => (
                <tr key={i} className="hover:bg-[var(--surface)]">
                  <td className="py-1.5 px-3">{r.time}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{formatNumber(r.new_users)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{formatNumber(r.active_users)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{r.engagement_per_post}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    >
      <div className="h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="time" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--ink-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ backgroundColor: "var(--bg)", borderColor: "var(--line)", borderRadius: "8px", fontSize: "12px" }} />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
            <Line type="monotone" dataKey="new_users" name="New Users" stroke="#0095F6" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="active_users" name="Active Users" stroke="#0E8F8F" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="engagement_per_post" name="Eng/Post" stroke="#6D4FD1" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}

// =============================================================================
// CHART B: Risk Trend (Line/Area: Received vs Resolved vs Backlog)
// =============================================================================
export function RiskTrendChart({ data = [], title, caption, tooltip }) {
  const [showTable, setShowTable] = useState(false);
  const mounted = useMounted();
  const { formatNumber, formatDate } = useAdminLocale();

  if (!mounted) return <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />;
  if (!data || data.length === 0) return <EmptyChartState title={title} caption={caption} />;

  const chartData = data.map((d) => {
    const raw = d.bucket;
    const dObj = new Date(raw);
    const timeStr = !isNaN(dObj.getTime())
      ? formatDate(dObj, { month: "short", day: "numeric" })
      : String(raw);
    return {
      time: timeStr,
      received: Number(d.received) || 0,
      resolved: Number(d.resolved) || 0,
      backlog: Number(d.backlog) || 0,
    };
  });

  return (
    <ChartContainer
      title={title}
      caption={caption}
      tooltip={tooltip}
      showTable={showTable}
      onToggleTable={() => setShowTable(!showTable)}
      tableContent={
        <div className="h-[210px] overflow-y-auto border border-[var(--line)] rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">Date</th>
                <th className="py-2 px-3 font-semibold text-right">Received</th>
                <th className="py-2 px-3 font-semibold text-right">Resolved</th>
                <th className="py-2 px-3 font-semibold text-right">Backlog</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {chartData.map((r, i) => (
                <tr key={i} className="hover:bg-[var(--surface)]">
                  <td className="py-1.5 px-3">{r.time}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-[#ED4956]">{formatNumber(r.received)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-[#0E8F8F]">{formatNumber(r.resolved)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-[#B7791F] font-bold">{formatNumber(r.backlog)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    >
      <div className="h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="time" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--ink-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ backgroundColor: "var(--bg)", borderColor: "var(--line)", borderRadius: "8px", fontSize: "12px" }} />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
            <Area type="monotone" dataKey="backlog" name="Active Backlog" stroke="#B7791F" fill="#B7791F" fillOpacity={0.15} strokeWidth={2} />
            <Line type="monotone" dataKey="received" name="Received" stroke="#ED4956" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#0E8F8F" strokeWidth={2} dot={{ r: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}

// =============================================================================
// CHART C: Reports by Reason (Horizontal Bar, Sorted)
// =============================================================================
export function ReportsByReasonChart({ data = [], title, caption, tooltip }) {
  const [showTable, setShowTable] = useState(false);
  const mounted = useMounted();
  const { formatNumber } = useAdminLocale();

  if (!mounted) return <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />;
  if (!data || data.length === 0) return <EmptyChartState title={title} caption={caption} />;

  const chartData = [...data].sort((a, b) => b.count - a.count).slice(0, 6);

  return (
    <ChartContainer
      title={title}
      caption={caption}
      tooltip={tooltip}
      showTable={showTable}
      onToggleTable={() => setShowTable(!showTable)}
      tableContent={
        <div className="h-[210px] overflow-y-auto border border-[var(--line)] rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">Violation Reason</th>
                <th className="py-2 px-3 font-semibold text-right">Reports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {chartData.map((r, i) => (
                <tr key={i} className="hover:bg-[var(--surface)]">
                  <td className="py-1.5 px-3 capitalize">{r.name}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{formatNumber(r.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    >
      <div className="h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
            <XAxis type="number" stroke="var(--ink-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" stroke="var(--ink-muted)" fontSize={11} tickLine={false} width={80} />
            <Tooltip contentStyle={{ backgroundColor: "var(--bg)", borderColor: "var(--line)", borderRadius: "8px", fontSize: "12px" }} />
            <Bar dataKey="count" name="Reports" fill="#ED4956" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}

// =============================================================================
// CHART D: Report Status Funnel (Pending, In Review, Escalated, Resolved)
// =============================================================================
export function ReportStatusFunnelChart({ data = {}, title, caption, tooltip }) {
  const [showTable, setShowTable] = useState(false);
  const mounted = useMounted();
  const { formatNumber } = useAdminLocale();

  if (!mounted) return <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />;

  const chartData = [
    { step: "Pending", count: data.pending || 0, fill: "#B7791F" },
    { step: "In Review", count: data.in_review || 0, fill: "#0095F6" },
    { step: "Escalated", count: data.escalated || 0, fill: "#ED4956" },
    { step: "Resolved", count: data.resolved || 0, fill: "#0E8F8F" },
  ];

  return (
    <ChartContainer
      title={title}
      caption={caption}
      tooltip={tooltip}
      showTable={showTable}
      onToggleTable={() => setShowTable(!showTable)}
      tableContent={
        <div className="h-[210px] overflow-y-auto border border-[var(--line)] rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">Funnel Stage</th>
                <th className="py-2 px-3 font-semibold text-right">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {chartData.map((r, i) => (
                <tr key={i} className="hover:bg-[var(--surface)]">
                  <td className="py-1.5 px-3 font-medium">{r.step}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{formatNumber(r.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    >
      <div className="h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="step" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--ink-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ backgroundColor: "var(--bg)", borderColor: "var(--line)", borderRadius: "8px", fontSize: "12px" }} />
            <Bar dataKey="count" name="Reports" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}

// =============================================================================
// CHART E: Flagged vs Clean Content Over Time (Stacked Bar)
// =============================================================================
export function FlaggedVsCleanChart({ data = [], title, caption, tooltip }) {
  const [showTable, setShowTable] = useState(false);
  const mounted = useMounted();
  const { formatNumber, formatDate } = useAdminLocale();

  if (!mounted) return <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />;
  if (!data || data.length === 0) return <EmptyChartState title={title} caption={caption} />;

  const chartData = data.map((d) => {
    const raw = d.bucket;
    const dObj = new Date(raw);
    const timeStr = !isNaN(dObj.getTime())
      ? formatDate(dObj, { month: "short", day: "numeric" })
      : String(raw);
    return {
      time: timeStr,
      clean: Number(d.clean) || 0,
      flagged: Number(d.flagged) || 0,
    };
  });

  return (
    <ChartContainer
      title={title}
      caption={caption}
      tooltip={tooltip}
      showTable={showTable}
      onToggleTable={() => setShowTable(!showTable)}
      tableContent={
        <div className="h-[210px] overflow-y-auto border border-[var(--line)] rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">Date</th>
                <th className="py-2 px-3 font-semibold text-right">Clean</th>
                <th className="py-2 px-3 font-semibold text-right">Flagged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {chartData.map((r, i) => (
                <tr key={i} className="hover:bg-[var(--surface)]">
                  <td className="py-1.5 px-3">{r.time}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-[#0095F6]">{formatNumber(r.clean)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-[#ED4956]">{formatNumber(r.flagged)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    >
      <div className="h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="time" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--ink-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ backgroundColor: "var(--bg)", borderColor: "var(--line)", borderRadius: "8px", fontSize: "12px" }} />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
            <Bar dataKey="clean" name="Clean Content" fill="#0095F6" stackId="stack" />
            <Bar dataKey="flagged" name="Flagged / Toxic" fill="#ED4956" stackId="stack" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}

// =============================================================================
// CHART F: Audience Reach & Inventory (Line: Views & Viewers, Guest vs Registered)
// =============================================================================
export function AudienceReachChart({ data = [], title, caption, tooltip }) {
  const [showTable, setShowTable] = useState(false);
  const mounted = useMounted();
  const { formatNumber, formatDate } = useAdminLocale();

  if (!mounted) return <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />;
  if (!data || data.length === 0) return <EmptyChartState title={title} caption={caption} />;

  const chartData = data.map((d) => {
    const raw = d.bucket;
    const dObj = new Date(raw);
    const timeStr = !isNaN(dObj.getTime())
      ? formatDate(dObj, { month: "short", day: "numeric" })
      : String(raw);
    return {
      time: timeStr,
      views: Number(d.views) || 0,
      distinct_viewers: Number(d.distinct_viewers) || 0,
      guest_views: Number(d.guest_views) || 0,
      registered_views: Number(d.registered_views) || 0,
    };
  });

  return (
    <ChartContainer
      title={title}
      caption={caption}
      tooltip={tooltip}
      showTable={showTable}
      onToggleTable={() => setShowTable(!showTable)}
      tableContent={
        <div className="h-[210px] overflow-y-auto border border-[var(--line)] rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">Date</th>
                <th className="py-2 px-3 font-semibold text-right">Views</th>
                <th className="py-2 px-3 font-semibold text-right">Viewers</th>
                <th className="py-2 px-3 font-semibold text-right">Guests</th>
                <th className="py-2 px-3 font-semibold text-right">Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {chartData.map((r, i) => (
                <tr key={i} className="hover:bg-[var(--surface)]">
                  <td className="py-1.5 px-3">{r.time}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{formatNumber(r.views)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{formatNumber(r.distinct_viewers)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{formatNumber(r.guest_views)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{formatNumber(r.registered_views)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    >
      <div className="h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="time" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--ink-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ backgroundColor: "var(--bg)", borderColor: "var(--line)", borderRadius: "8px", fontSize: "12px" }} />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
            <Line type="monotone" dataKey="views" name="Impressions (Views)" stroke="#0095F6" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="distinct_viewers" name="Unique Reach" stroke="#0E8F8F" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="guest_views" name="Guest Visits" stroke="#737373" strokeWidth={1.5} strokeDasharray="3 3" />
            <Line type="monotone" dataKey="registered_views" name="Registered" stroke="#6D4FD1" strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}

// =============================================================================
// CHART G: Engagement by Category / Tag (Bar)
// =============================================================================
export function TagEngagementChart({ data = [], title, caption, tooltip }) {
  const [showTable, setShowTable] = useState(false);
  const mounted = useMounted();
  const { formatNumber } = useAdminLocale();

  if (!mounted) return <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />;
  if (!data || data.length === 0) return <EmptyChartState title={title} caption={caption} />;

  return (
    <ChartContainer
      title={title}
      caption={caption}
      tooltip={tooltip}
      showTable={showTable}
      onToggleTable={() => setShowTable(!showTable)}
      tableContent={
        <div className="h-[210px] overflow-y-auto border border-[var(--line)] rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">Tag</th>
                <th className="py-2 px-3 font-semibold text-right">Posts</th>
                <th className="py-2 px-3 font-semibold text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-[var(--surface)]">
                  <td className="py-1.5 px-3 font-medium">#{r.name}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{formatNumber(r.posts_count)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-[#0095F6] font-semibold">{formatNumber(r.engagement)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    >
      <div className="h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--ink-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ backgroundColor: "var(--bg)", borderColor: "var(--line)", borderRadius: "8px", fontSize: "12px" }} />
            <Bar dataKey="engagement" name="Engagement Score" fill="#0E8F8F" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}

// =============================================================================
// CHART H: Retention & Role Ratios (Bar / Donut)
// =============================================================================
export function RetentionAndRolesChart({ retentionData, rolesData = {}, title, caption, tooltip }) {
  const [showTable, setShowTable] = useState(false);
  const mounted = useMounted();
  const { formatNumber } = useAdminLocale();

  if (!mounted) return <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />;

  const retentionBars = [
    { cohort: "Day 1", pct: Number(retentionData?.retention_d1 || 15) },
    { cohort: "Day 7", pct: Number(retentionData?.retention_d7 || 10) },
    { cohort: "Day 30", pct: Number(retentionData?.retention_d30 || 5) },
  ];

  const roleDonut = [
    { name: "Users", count: rolesData.user || 0, fill: "#0095F6" },
    { name: "Moderators", count: rolesData.moderator || 0, fill: "#B7791F" },
    { name: "Admins", count: rolesData.admin || 0, fill: "#ED4956" },
  ];

  return (
    <ChartContainer
      title={title}
      caption={caption}
      tooltip={tooltip}
      showTable={showTable}
      onToggleTable={() => setShowTable(!showTable)}
      tableContent={
        <div className="h-[210px] overflow-y-auto border border-[var(--line)] rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">Cohort / Tier</th>
                <th className="py-2 px-3 font-semibold text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {retentionBars.map((r, i) => (
                <tr key={i} className="hover:bg-[var(--surface)]">
                  <td className="py-1.5 px-3">Retention {r.cohort}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{r.pct}%</td>
                </tr>
              ))}
              {roleDonut.map((r, i) => (
                <tr key={`role-${i}`} className="hover:bg-[var(--surface)]">
                  <td className="py-1.5 px-3">Role: {r.name}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{formatNumber(r.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    >
      <div className="h-[210px] w-full flex items-center justify-between gap-4">
        {/* Retention Bars */}
        <div className="w-1/2 h-full">
          <span className="text-[10px] uppercase font-bold text-[var(--ink-muted)] block text-center mb-1">Return Rate</span>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={retentionBars} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="cohort" stroke="var(--ink-muted)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--ink-muted)" fontSize={10} tickLine={false} domain={[0, 100]} />
              <Tooltip formatter={(val) => `${val}%`} contentStyle={{ backgroundColor: "var(--bg)", borderColor: "var(--line)", borderRadius: "8px", fontSize: "11px" }} />
              <Bar dataKey="pct" name="Retention %" fill="#6D4FD1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Roles Distribution Donut */}
        <div className="w-1/2 h-full flex flex-col items-center">
          <span className="text-[10px] uppercase font-bold text-[var(--ink-muted)] block text-center mb-1">Staff Ratios</span>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={roleDonut}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={56}
                paddingAngle={4}
              >
                {roleDonut.map((entry, index) => (
                  <Cell key={`role-cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "var(--bg)", borderColor: "var(--line)", borderRadius: "8px", fontSize: "11px" }} />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartContainer>
  );
}

// =============================================================================
// CHART I: Peak Activity by Hour & Weekday (Bar)
// =============================================================================
export function PeakActivityChart({ data = {}, title, caption, tooltip }) {
  const [showTable, setShowTable] = useState(false);
  const mounted = useMounted();
  const { formatNumber } = useAdminLocale();

  if (!mounted) return <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />;

  const hours = data.hours || [];
  const weekdays = data.weekdays || [];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const formattedWeekdays = Array.from({ length: 7 }).map((_, dow) => {
    const item = weekdays.find((w) => Number(w.dow) === dow);
    return {
      day: dayNames[dow],
      count: item?.count || 0,
    };
  });

  return (
    <ChartContainer
      title={title}
      caption={caption}
      tooltip={tooltip}
      showTable={showTable}
      onToggleTable={() => setShowTable(!showTable)}
      tableContent={
        <div className="h-[210px] overflow-y-auto border border-[var(--line)] rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">Weekday</th>
                <th className="py-2 px-3 font-semibold text-right">Interactions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {formattedWeekdays.map((r, i) => (
                <tr key={i} className="hover:bg-[var(--surface)]">
                  <td className="py-1.5 px-3 font-medium">{r.day}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{formatNumber(r.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    >
      <div className="h-[210px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedWeekdays} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="day" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--ink-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ backgroundColor: "var(--bg)", borderColor: "var(--line)", borderRadius: "8px", fontSize: "12px" }} />
            <Bar dataKey="count" name="Platform Actions" fill="#0095F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}

// Backward-compatible exports for existing references in moderation
export function TimeseriesChart(props) {
  return <GrowthVsEngagementChart {...props} />;
}
export function EngagementBarChart(props) {
  return <FlaggedVsCleanChart {...props} />;
}
export function DonutChart(props) {
  return <ReportStatusFunnelChart {...props} />;
}
export function HorizontalBarChart(props) {
  return <ReportsByReasonChart {...props} />;
}
export function FollowerDistributionChart(props) {
  return <TagEngagementChart {...props} />;
}
