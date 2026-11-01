import { CheckCircle2, AlertCircle, AlertTriangle, Sparkles } from "lucide-react";
import { generatePlatformSummary } from "@/lib/dashboard-rules";

export function PlatformSummaryCard({ kpis, locale = "en" }) {
  const sentences = generatePlatformSummary(kpis, locale);
  const isTh = locale === "th";

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-[var(--line)] bg-[var(--bg)] shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--surface-strong)] text-[var(--accent)]">
            <Sparkles size={16} strokeWidth={2} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--ink)]">
              {isTh ? "สรุปสถานะแพลตฟอร์ม (ตามเกณฑ์ประเมินจริง)" : "Platform Health Summary"}
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              {isTh
                ? "วิเคราะห์สถานะและสัญญาณแจ้งเตือนอัตโนมัติจากข้อมูลจริงในช่วงเวลาที่เลือก"
                : "Rule-based synthesis generated from live telemetry for the selected period"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sentences.map((item) => {
          let badgeBg = "bg-[#12805C]/10 text-[#12805C] border-[#12805C]/20";
          let badgeText = isTh ? "ดี (Good)" : "Good";
          let StatusIcon = CheckCircle2;

          if (item.status === "watch") {
            badgeBg = "bg-[#B7791F]/10 text-[#B7791F] border-[#B7791F]/20";
            badgeText = isTh ? "เฝ้าระวัง (Watch)" : "Watch";
            StatusIcon = AlertCircle;
          } else if (item.status === "action") {
            badgeBg = "bg-[#C8323C]/10 text-[#C8323C] border-[#C8323C]/20";
            badgeText = isTh ? "ต้องดำเนินการ (Action needed)" : "Action needed";
            StatusIcon = AlertTriangle;
          }

          return (
            <div
              key={item.id}
              className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] flex items-start gap-3 transition-colors hover:bg-[var(--surface-strong)]/40"
            >
              <div className="shrink-0 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold ${badgeBg}`}
                >
                  <StatusIcon size={12} strokeWidth={2.5} aria-hidden="true" />
                  <span>{badgeText}</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--ink)] leading-snug pt-0.5 flex-1 font-medium">
                {item.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PlatformSummarySkeleton() {
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-[var(--line)] bg-[var(--bg)] shadow-xs animate-pulse space-y-4">
      <div className="h-4 w-48 bg-[var(--surface-strong)] rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-[var(--surface)] border border-[var(--line)] p-3" />
        ))}
      </div>
    </div>
  );
}
