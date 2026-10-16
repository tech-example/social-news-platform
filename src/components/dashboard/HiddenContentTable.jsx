"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { EyeOff, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restorePostAction } from "@/server/actions/moderation";
import { useAdminLocale } from "@/lib/i18n/AdminLocaleProvider";

export function HiddenContentTable({ posts = [] }) {
  const [isPending, startTransition] = useTransition();
  const [restoringId, setRestoringId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const { t, formatRelative } = useAdminLocale();

  const handleRestore = (postId) => {
    setRestoringId(postId);
    setErrorMsg("");
    startTransition(async () => {
      const res = await restorePostAction(postId);
      if (!res?.ok) {
        setErrorMsg(res?.error || "Failed to restore content.");
      }
      setRestoringId(null);
    });
  };

  return (
    <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)]" />
          <div>
            <h2 className="text-base font-bold text-[var(--ink)]">
              {t("moderation.hidden_title", "Recently Hidden Content")}
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              {t("moderation.hidden_subtitle", "Posts removed from public feed during preliminary moderation with restore option")}
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="py-8 text-center text-xs text-[var(--ink-muted)]">
          {t("moderation.hidden_empty", "No hidden content currently recorded.")}
        </div>
      ) : (
        <>
          {/* Desktop Table (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--surface)] border-b border-[var(--line)] text-[var(--ink-muted)] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">{t("moderation.hidden_col_content", "Content / Post")}</th>
                  <th className="py-2.5 px-3 font-semibold">{t("moderation.hidden_col_author", "Author")}</th>
                  <th className="py-2.5 px-3 font-semibold">{t("moderation.hidden_col_date", "Hidden Date")}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{t("moderation.hidden_col_action", "Action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {posts.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--surface)] transition-colors">
                    <td className="py-3 px-3 max-w-sm">
                      <span className="font-semibold text-[var(--ink)] line-clamp-1">
                        {p.title || p.body?.slice(0, 60)}
                      </span>
                      <span className="text-[11px] text-[var(--ink-muted)] line-clamp-1">
                        {p.body?.slice(0, 80)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[var(--ink-muted)]">
                      @{p.author?.username || "unknown"}
                    </td>
                    <td className="py-3 px-3 text-[var(--ink-muted)] tabular-nums" suppressHydrationWarning>
                      {formatRelative(p.updated_at || p.created_at)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isPending && restoringId === p.id}
                        onClick={() => handleRestore(p.id)}
                        className="h-7 px-2.5 text-xs inline-flex items-center gap-1.5"
                      >
                        {isPending && restoringId === p.id ? (
                          <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Eye size={13} strokeWidth={2} aria-hidden="true" />
                        )}
                        <span>{t("moderation.hidden_btn_restore", "Restore")}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards (< 768px) */}
          <div className="md:hidden space-y-2.5">
            {posts.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] space-y-2 text-xs"
              >
                <div>
                  <span className="font-bold text-[var(--ink)] block line-clamp-1">
                    {p.title || p.body?.slice(0, 50)}
                  </span>
                  <span className="text-[11px] text-[var(--ink-muted)]">
                    By @{p.author?.username || "unknown"} · Hidden{" "}
                    <span suppressHydrationWarning>{formatRelative(p.updated_at || p.created_at)}</span>
                  </span>
                </div>

                <div className="pt-2 border-t border-[var(--line)] flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isPending && restoringId === p.id}
                    onClick={() => handleRestore(p.id)}
                    className="h-7 px-3 text-xs inline-flex items-center gap-1.5"
                  >
                    {isPending && restoringId === p.id ? (
                      <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Eye size={13} strokeWidth={2} aria-hidden="true" />
                    )}
                    <span>{t("moderation.hidden_btn_restore", "Restore")}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
