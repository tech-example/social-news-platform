"use client";
import { useState } from "react";
import { CheckCircle, ShieldCheck, Users, Search, MessageSquare, BarChart3, ChevronDown, ChevronUp } from "lucide-react";

export function BenefitsPanel() {
  const [open, setOpen] = useState(false);

  const benefits = [
    {
      id: "B1",
      title: "Central News & Discussion Hub",
      icon: Users,
      description: "Platform serves as the single source for campus and community news updates.",
      metrics: "Total users, DAU/WAU/MAU, daily post frequency, active user ratio",
    },
    {
      id: "B2",
      title: "Fast Discovery & Categorization",
      icon: Search,
      description: "Users locate relevant content quickly using tags, keywords, and explore rankings.",
      metrics: "Top hashtags, search volume, tag usage frequency (Content Mix), zero-result rate",
    },
    {
      id: "B3",
      title: "Stronger Interaction & Connection",
      icon: MessageSquare,
      description: "Fosters discussion and community cohesion through verified interactions.",
      metrics: "Engagement composition (likes, comments, shares), follower growth, interactions per post",
    },
    {
      id: "B4",
      title: "Organized & Responsive Moderation",
      icon: ShieldCheck,
      description: "Two-tier moderation workflow preserves safety and eliminates harassment/spam.",
      metrics: "Reports by status, resolution median time (p90), moderator resolution rate, content audits",
    },
    {
      id: "B5",
      title: "Actionable Usage Statistics",
      icon: BarChart3,
      description: "Empowers creators and teams to measure impact and refine communication quality.",
      metrics: "Top posts leaderboard, engagement trends, image/tag content mix distribution",
    },
    {
      id: "B6",
      title: "Secure Access & Permission Governance",
      icon: CheckCircle,
      description: "Defense-in-depth authorization with auditable operations and role controls.",
      metrics: "Role distribution (user, moderator, admin), suspended user log, audit trail logs",
    },
  ];

  return (
    <div className="w-full border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs mb-6">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
          <h2 className="text-sm sm:text-base font-bold text-[var(--ink)]">
            Platform Benefits & Operational Impact (B1–B6)
          </h2>
        </div>
        <button
          type="button"
          aria-label={open ? "Collapse benefits panel" : "Expand benefits panel"}
          className="text-[var(--ink-muted)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] rounded"
        >
          {open ? <ChevronUp size={18} strokeWidth={2} aria-hidden="true" /> : <ChevronDown size={18} strokeWidth={2} aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4 pt-4 border-t border-[var(--line)]">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.id}
                className="flex flex-col p-3 rounded-lg bg-[var(--surface)] border border-[var(--line)] gap-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--accent-soft)] text-[var(--accent)]">
                    {b.id}
                  </span>
                  <span className="text-xs font-semibold text-[var(--ink)] truncate">
                    {b.title}
                  </span>
                </div>
                <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                  {b.description}
                </p>
                <div className="mt-auto pt-1 text-[11px] text-[var(--ink-muted)] border-t border-[var(--line)]">
                  <span className="font-medium text-[var(--ink)]">Measurable via:</span> {b.metrics}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
