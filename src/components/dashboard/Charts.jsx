"use client";
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

const COLORS = ["#0095F6", "#0E8F8F", "#B7791F", "#6D4FD1", "#ED4956", "#737373"];

export function ChartSkeleton({ height = 280 }) {
  return (
    <div
      style={{ height }}
      className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 flex flex-col justify-between animate-pulse"
    >
      <div className="h-4 w-32 bg-[var(--surface-strong)] rounded" />
      <div className="h-48 w-full bg-[var(--surface)] rounded-lg" />
      <div className="h-3 w-24 bg-[var(--surface-strong)] rounded" />
    </div>
  );
}

export function TimeseriesChart({ data = [], title, metricLabel = "Count" }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 flex flex-col items-center justify-center text-center">
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-1">{title}</h3>
        <p className="text-xs text-[var(--ink-muted)]">No data for this range. Try a wider date range.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    time: d.bucket ? new Date(d.bucket).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
    count: Number(d.count) || 0,
  }));

  return (
    <div className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 shadow-xs">
      <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">{title}</h3>
      <div className="h-[230px] w-full">
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
              dataKey="count"
              name={metricLabel}
              stroke="#0095F6"
              strokeWidth={2}
              dot={{ r: 3, fill: "#0095F6" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function EngagementBarChart({ data = [], title = "Engagement Composition" }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 flex flex-col items-center justify-center text-center">
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-1">{title}</h3>
        <p className="text-xs text-[var(--ink-muted)]">No data for this range. Try a wider date range.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    time: d.bucket ? new Date(d.bucket).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
    likes: Number(d.likes) || 0,
    comments: Number(d.comments) || 0,
    shares: Number(d.shares) || 0,
  }));

  return (
    <div className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 shadow-xs">
      <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">{title}</h3>
      <div className="h-[230px] w-full">
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
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
            <Bar dataKey="likes" name="Likes" fill="#ED4956" stackId="a" />
            <Bar dataKey="comments" name="Comments" fill="#0095F6" stackId="a" />
            <Bar dataKey="shares" name="Shares" fill="#0E8F8F" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DonutChart({ data = [], title = "Distribution" }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 flex flex-col items-center justify-center text-center">
        <h3 className="text-sm font-semibold text-[var(--ink)] mb-1">{title}</h3>
        <p className="text-xs text-[var(--ink-muted)]">No data available.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.status || d.reason || d.name || "Unknown",
    value: Number(d.count) || 0,
  }));

  return (
    <div className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 shadow-xs">
      <h3 className="text-sm font-semibold text-[var(--ink)] mb-2">{title}</h3>
      <div className="h-[230px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={50}
              outerRadius={75}
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
    </div>
  );
}
