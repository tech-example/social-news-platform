"use client";
import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
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

export { ChartSkeleton };

const COLORS = ["#0095F6", "#0E8F8F", "#B7791F", "#6D4FD1", "#ED4956", "#737373"];

export function TimeseriesChart({
  data = [],
  title,
  metricLabel = "Count",
  color = "#0095F6",
  tooltip = null,
}) {
  const [showTable, setShowTable] = useState(false);
  const mounted = useMounted();

  if (!mounted) {
    return <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />;
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height: `${SKELETON_SIZES.CHART.DEFAULT_HEIGHT}px` }}
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-5 flex flex-col items-center justify-center text-center shadow-xs"
      >
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-1">{title}</h3>
        <p className="text-xs text-[var(--ink-muted)]">No data for this range. Try a wider date range.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    time: d.bucket
      ? new Date(d.bucket).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : d.time || "",
    value: Number(d.value !== undefined ? d.value : d.count) || 0,
  }));

  return (
    <div
      style={{ minHeight: `${SKELETON_SIZES.CHART.DEFAULT_HEIGHT}px` }}
      className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 sm:p-5 shadow-xs flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-[var(--ink)]">{title}</h3>
          {tooltip && (
            <span title={tooltip} className="text-[var(--ink-muted)] cursor-help">
              <Info size={13} strokeWidth={2} aria-hidden="true" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-label={showTable ? "View as chart" : "View as table"}
          title={showTable ? "View as chart" : "View as table"}
          className="p-1 rounded-md text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
        >
          {showTable ? (
            <ChartLine size={16} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Table size={16} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>

      {showTable ? (
        <div className="h-[210px] overflow-y-auto border border-[var(--line)] rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">Date</th>
                <th className="py-2 px-3 font-semibold text-right">{metricLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {chartData.map((row, idx) => (
                <tr key={idx} className="hover:bg-[var(--surface)]">
                  <td className="py-1.5 px-3">{row.time}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-medium">
                    {new Intl.NumberFormat("en-US").format(row.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[210px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="time" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--ink-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--line)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={metricLabel}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 2.5, fill: color }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function EngagementBarChart({ data = [], title = "Engagement Composition (Stacked)", tooltip = null }) {
  const [showTable, setShowTable] = useState(false);
  const mounted = useMounted();

  if (!mounted) {
    return <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />;
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height: `${SKELETON_SIZES.CHART.DEFAULT_HEIGHT}px` }}
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-5 flex flex-col items-center justify-center text-center shadow-xs"
      >
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-1">{title}</h3>
        <p className="text-xs text-[var(--ink-muted)]">No data for this range. Try a wider date range.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    time: d.day
      ? new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : d.time || "",
    likes: Number(d.likes) || 0,
    comments: Number(d.comments) || 0,
    shares: Number(d.shares) || 0,
  }));

  return (
    <div
      style={{ minHeight: `${SKELETON_SIZES.CHART.DEFAULT_HEIGHT}px` }}
      className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 sm:p-5 shadow-xs flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-[var(--ink)]">{title}</h3>
          {tooltip && (
            <span title={tooltip} className="text-[var(--ink-muted)] cursor-help">
              <Info size={13} strokeWidth={2} aria-hidden="true" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-label={showTable ? "View as chart" : "View as table"}
          title={showTable ? "View as chart" : "View as table"}
          className="p-1 rounded-md text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
        >
          {showTable ? (
            <ChartLine size={16} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Table size={16} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>

      {showTable ? (
        <div className="h-[210px] overflow-y-auto border border-[var(--line)] rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">Date</th>
                <th className="py-2 px-3 font-semibold text-right">Likes</th>
                <th className="py-2 px-3 font-semibold text-right">Comments</th>
                <th className="py-2 px-3 font-semibold text-right">Shares</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {chartData.map((row, idx) => (
                <tr key={idx} className="hover:bg-[var(--surface)]">
                  <td className="py-1.5 px-3">{row.time}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-[#ED4956] font-medium">{row.likes}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-[#0095F6] font-medium">{row.comments}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-[#0E8F8F] font-medium">{row.shares}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[210px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="time" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--ink-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--line)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
              <Bar dataKey="likes" name="Likes" fill="#ED4956" stackId="a" />
              <Bar dataKey="comments" name="Comments" fill="#0095F6" stackId="a" />
              <Bar dataKey="shares" name="Shares" fill="#0E8F8F" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function DonutChart({ data = [], title = "Distribution", tooltip = null }) {
  const [showTable, setShowTable] = useState(false);
  const mounted = useMounted();

  if (!mounted) {
    return <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />;
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height: `${SKELETON_SIZES.CHART.DEFAULT_HEIGHT}px` }}
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-5 flex flex-col items-center justify-center text-center shadow-xs"
      >
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-1">{title}</h3>
        <p className="text-xs text-[var(--ink-muted)]">No data available.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: (d.status || d.reason || d.name || "Unknown").replace(/_/g, " "),
    value: Number(d.count !== undefined ? d.count : d.value) || 0,
  }));

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div
      style={{ minHeight: `${SKELETON_SIZES.CHART.DEFAULT_HEIGHT}px` }}
      className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 sm:p-5 shadow-xs flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-[var(--ink)]">{title}</h3>
          {tooltip && (
            <span title={tooltip} className="text-[var(--ink-muted)] cursor-help">
              <Info size={13} strokeWidth={2} aria-hidden="true" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-label={showTable ? "View as chart" : "View as table"}
          title={showTable ? "View as chart" : "View as table"}
          className="p-1 rounded-md text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
        >
          {showTable ? (
            <ChartLine size={16} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Table size={16} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>

      {showTable ? (
        <div className="h-[210px] overflow-y-auto border border-[var(--line)] rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">Category</th>
                <th className="py-2 px-3 font-semibold text-right">Count</th>
                <th className="py-2 px-3 font-semibold text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {chartData.map((row, idx) => (
                <tr key={idx} className="hover:bg-[var(--surface)]">
                  <td className="py-1.5 px-3 capitalize">{row.name}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-medium">{row.value}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-[var(--ink-muted)]">
                    {total > 0 ? Math.round((row.value / total) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[210px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                innerRadius={48}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--line)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function HorizontalBarChart({ data = [], title = "Distribution", metricLabel = "Count", tooltip = null }) {
  const [showTable, setShowTable] = useState(false);
  const mounted = useMounted();

  if (!mounted) {
    return <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />;
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height: `${SKELETON_SIZES.CHART.DEFAULT_HEIGHT}px` }}
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-5 flex flex-col items-center justify-center text-center shadow-xs"
      >
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-1">{title}</h3>
        <p className="text-xs text-[var(--ink-muted)]">No data for this range.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: (d.reason || d.name || "Unknown").replace(/_/g, " "),
    count: Number(d.count !== undefined ? d.count : d.value) || 0,
  }));

  return (
    <div
      style={{ minHeight: `${SKELETON_SIZES.CHART.DEFAULT_HEIGHT}px` }}
      className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 sm:p-5 shadow-xs flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-[var(--ink)]">{title}</h3>
          {tooltip && (
            <span title={tooltip} className="text-[var(--ink-muted)] cursor-help">
              <Info size={13} strokeWidth={2} aria-hidden="true" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-label={showTable ? "View as chart" : "View as table"}
          title={showTable ? "View as chart" : "View as table"}
          className="p-1 rounded-md text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
        >
          {showTable ? (
            <ChartLine size={16} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Table size={16} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>

      {showTable ? (
        <div className="h-[210px] overflow-y-auto border border-[var(--line)] rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">Reason</th>
                <th className="py-2 px-3 font-semibold text-right">{metricLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {chartData.map((row, idx) => (
                <tr key={idx} className="hover:bg-[var(--surface)]">
                  <td className="py-1.5 px-3 capitalize">{row.name}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[210px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
              <XAxis type="number" stroke="var(--ink-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="var(--ink-muted)"
                fontSize={11}
                tickLine={false}
                width={85}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--line)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" name={metricLabel} fill="#B7791F" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function FollowerDistributionChart({ data = [], title = "Follower Distribution", tooltip = null }) {
  const [showTable, setShowTable] = useState(false);
  const mounted = useMounted();

  if (!mounted) {
    return <ChartSkeleton height={SKELETON_SIZES.CHART.DEFAULT_HEIGHT} standalone={false} />;
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height: `${SKELETON_SIZES.CHART.DEFAULT_HEIGHT}px` }}
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-5 flex flex-col items-center justify-center text-center shadow-xs"
      >
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-1">{title}</h3>
        <p className="text-xs text-[var(--ink-muted)]">No follower data recorded.</p>
      </div>
    );
  }

  return (
    <div
      style={{ minHeight: `${SKELETON_SIZES.CHART.DEFAULT_HEIGHT}px` }}
      className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 sm:p-5 shadow-xs flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-[var(--ink)]">{title}</h3>
          {tooltip && (
            <span title={tooltip} className="text-[var(--ink-muted)] cursor-help">
              <Info size={13} strokeWidth={2} aria-hidden="true" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-label={showTable ? "View as chart" : "View as table"}
          title={showTable ? "View as chart" : "View as table"}
          className="p-1 rounded-md text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
        >
          {showTable ? (
            <ChartLine size={16} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Table size={16} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>

      {showTable ? (
        <div className="h-[210px] overflow-y-auto border border-[var(--line)] rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">Bucket (Followers)</th>
                <th className="py-2 px-3 font-semibold text-right">Users</th>
                <th className="py-2 px-3 font-semibold text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-[var(--surface)]">
                  <td className="py-1.5 px-3 font-medium">{row.bucket} followers</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">{row.user_count}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums text-[var(--ink-muted)]">{row.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[210px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="bucket" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--ink-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--line)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="user_count" name="Users" fill="#6D4FD1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
