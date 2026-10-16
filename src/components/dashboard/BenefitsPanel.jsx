"use client";
import { useState, useMemo } from "react";
import {
  CheckCircle,
  ShieldCheck,
  Users,
  Search,
  MessageSquare,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PostingHeatmap } from "./PostingHeatmap";
import { useAdminLocale } from "@/lib/i18n/AdminLocaleProvider";

export function BenefitsPanel({ heatmapData = [] }) {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const { locale, t } = useAdminLocale();

  const benefits = useMemo(() => [
    {
      id: "B1",
      title: t("benefits.b1_title", "Central Hub for News & Discussion"),
      claim: t("benefits.b1_claim", "Platform is used as the primary, central community hub."),
      icon: Users,
      widgets: locale === "th" ? [
        "จำนวนผู้ใช้งานทั้งหมดและการเติบโตในช่วงเวลา",
        "ผู้ใช้งานที่มีกิจกรรม DAU / WAU / MAU",
        "จำนวนโพสต์ที่เผยแพร่ตามเวลา",
        "จำนวนการเข้าใช้งานและการเข้าสู่ระบบต่อวัน",
        "สัดส่วนโพสต์ต่อผู้ใช้งานที่มีกิจกรรม",
      ] : [
        "Total users and growth in range",
        "DAU / WAU / MAU active users",
        "Posts published over time",
        "Sessions and sign-ins per day",
        "Posts per active user ratio",
      ],
      description: t("benefits.b1_desc", "Proves community members converge in one unified feed rather than fragmented third-party channels."),
    },
    {
      id: "B2",
      title: t("benefits.b2_title", "Fast Discovery via Search & Tags"),
      claim: t("benefits.b2_claim", "People quickly discover content through search and tags."),
      icon: Search,
      widgets: locale === "th" ? [
        "แฮชแท็กยอดนิยมพร้อมจำนวนการมีส่วนร่วม",
        "คำค้นหายอดนิยมและปริมาณการค้นหา",
        "อัตราคำค้นหาที่ไม่พบผลลัพธ์",
        "สัดส่วนร้อยละของโพสต์ที่จัดหมวดหมู่ด้วยแท็ก",
        "การเข้าชมหน้าแท็กโดยตรงและสัดส่วนการค้นพบ",
      ] : [
        "Top hashtags with engagement counts",
        "Top search queries & volume",
        "Zero-result search query rate",
        "% of posts categorized with tags",
        "Tag page direct visits and discovery ratio",
      ],
      description: t("benefits.b2_desc", "Proves taxonomy and search engine effectively connect users to targeted information."),
    },
    {
      id: "B3",
      title: t("benefits.b3_title", "Stronger Interaction & Connection"),
      claim: t("benefits.b3_claim", "Community interaction and engagement are actively growing."),
      icon: MessageSquare,
      widgets: locale === "th" ? [
        "ถูกใจ ความคิดเห็น และแชร์ต่อวัน (แบบซ้อนกัน)",
        "การกดติดตามที่เกิดขึ้นตามช่วงเวลา",
        "การมีส่วนร่วมและความคิดเห็นเฉลี่ยต่อโพสต์",
        "การกระจายตัวของผู้ติดตามตามกลุ่ม (0, 1-9, 10-99, 100+)",
        "ผู้สร้างเนื้อหาและบัญชีที่มีการมีส่วนร่วมสูงสุด",
      ] : [
        "Likes, comments, and shares per day (stacked)",
        "Follows created over time",
        "Engagement per post & comments per post",
        "Follower distribution across tiers (0, 1-9, 10-99, 100+)",
        "Top engaged creators & accounts",
      ],
      description: t("benefits.b3_desc", "Proves verified social features drive meaningful communication, feedback, and peer recognition."),
    },
    {
      id: "B4",
      title: t("benefits.b4_title", "Organized Moderation & Safety"),
      claim: t("benefits.b4_claim", "Two-tier moderation workflow is efficient, responsive, and healthy."),
      icon: ShieldCheck,
      widgets: locale === "th" ? [
        "รายงานแยกตามสถานะ (รอดำเนินการ, ตรวจสอบ, ส่งต่อ, ดำเนินการแล้ว)",
        "การกระจายตัวของรายงานตามสาเหตุ",
        "ระยะเวลาเฉลี่ยและ P90 ในการจัดการรายงาน",
        "การกระจายภาระงานของผู้ดูแล",
        "จำนวนเนื้อหาที่ถูกซ่อนและอัตราการกู้คืน",
      ] : [
        "Reports by status (pending, review, escalated, resolved)",
        "Reports by reason distribution",
        "Median and P90 resolution turnaround time",
        "Moderator workload distribution",
        "Recently hidden content count & recovery rate",
      ],
      description: t("benefits.b4_desc", "Demonstrates rapid incident handling, clear separation of moderator vs admin duties, and safety SLA enforcement."),
    },
    {
      id: "B5",
      title: t("benefits.b5_title", "Usage Statistics for Quality Improvement"),
      claim: t("benefits.b5_claim", "Data directly supports editorial and publishing decisions."),
      icon: BarChart3,
      widgets: locale === "th" ? [
        "อันดับโพสต์ยอดนิยมตามคะแนนการมีส่วนร่วม",
        "แฮชแท็กยอดนิยมตามการเข้าถึง",
        "แนวโน้มการมีส่วนร่วมประจำวัน",
        "สัดส่วนเนื้อหา (% ที่มีรูปภาพ, % ที่มีแท็ก, แท็กเฉลี่ย/โพสต์)",
        "แผนที่ความหนาแน่นช่วงเวลาที่เหมาะสมในการโพสต์ (วัน x ชั่วโมง)",
        "การเปรียบเทียบการเปลี่ยนแปลงตามช่วงเวลา",
      ] : [
        "Top posts leaderboard by engagement score",
        "Top hashtags by reach",
        "Daily engagement trajectory",
        "Content mix (% with images, % with tags, avg tags/post)",
        "Best posting hours heatmap (weekday x hour)",
        "Period-over-period delta comparisons",
      ],
      description: t("benefits.b5_desc", "Empowers organizations and authors to optimize timing, media formats, and topical interest."),
      hasHeatmap: true,
    },
    {
      id: "B6",
      title: t("benefits.b6_title", "Secure Sharing & Permission Governance"),
      claim: t("benefits.b6_claim", "Access control is robust, strictly partitioned, and auditable."),
      icon: CheckCircle,
      widgets: locale === "th" ? [
        "การกระจายตัวของบทบาท (ผู้ใช้งาน, ผู้ดูแล, ผู้ดูแลระบบ)",
        "บันทึกการบังคับใช้การระงับบัญชีผู้ใช้",
        "บันทึกประวัติการตรวจสอบการทำงานระบบระดับสูง",
        "การดำเนินการที่ต้องใช้สิทธิ์พิเศษต่อวัน",
        "การแยกความลับผ่าน BFF และการควบคุมสิทธิ์ผ่าน RLS",
      ] : [
        "Role distribution (user, moderator, admin)",
        "Suspended user enforcement log",
        "Audit trail of privileged system operations",
        "Privileged actions per day",
        "BFF secret isolation and RLS authorization",
      ],
      description: t("benefits.b6_desc", "Ensures zero browser secret leakage, complete audit history, and role-based administrative boundaries."),
    },
  ], [locale, t]);

  const filteredBenefits =
    activeTab === "all" ? benefits : benefits.filter((b) => b.id === activeTab);

  return (
    <div className="w-full border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs mb-6 space-y-4">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--ink)]">
              {t("benefits.title", "Operational Impact & Benefit Mapping (B1–B6)")}
            </h2>
            <p className="text-xs text-[var(--ink-muted)] hidden sm:block">
              {t("benefits.subtitle", "Verifiable proof of project goals and organizational outcomes per section 11.4")}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label={open ? t("benefits.hide_panel", "Collapse benefits panel") : t("benefits.show_panel", "Expand benefits panel")}
          className="p-1 rounded text-[var(--ink-muted)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
        >
          {open ? <ChevronUp size={18} strokeWidth={2} aria-hidden="true" /> : <ChevronDown size={18} strokeWidth={2} aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div className="space-y-4 pt-3 border-t border-[var(--line)]">
          {/* Tab selector */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === "all"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {t("benefits.tab_all", "All Benefits (B1–B6)")}
            </button>
            {benefits.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setActiveTab(b.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${
                  activeTab === b.id
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                <span>{b.id}</span>
                <span className="hidden md:inline font-normal text-[11px] opacity-90">
                  {b.title.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredBenefits.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.id}
                  className="flex flex-col p-4 rounded-xl bg-[var(--surface)] border border-[var(--line)] gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-[var(--accent-soft)] text-[var(--accent)]">
                        {b.id}
                      </span>
                      <h3 className="text-xs font-bold text-[var(--ink)] truncate">
                        {b.title}
                      </h3>
                    </div>
                    <Icon size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)] shrink-0" />
                  </div>

                  <p className="text-xs font-medium text-[var(--accent)]">
                    {b.claim}
                  </p>

                  <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                    {b.description}
                  </p>

                  <div className="mt-auto pt-2.5 border-t border-[var(--line)] space-y-1">
                    <span className="text-[11px] font-semibold text-[var(--ink)] block">
                      {t("benefits.demonstrated_by", "Demonstrated by widgets:")}
                    </span>
                    <ul className="text-[11px] text-[var(--ink-muted)] list-disc list-inside space-y-0.5">
                      {b.widgets.map((w, idx) => (
                        <li key={idx} className="truncate" title={w}>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {b.hasHeatmap && heatmapData && heatmapData.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--line)]">
                      <PostingHeatmap data={heatmapData} title={`${b.title} (${b.id})`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
