"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  Flag,
  FileText,
  MessageCircle,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { getDisplayName } from "@/lib/user";
import { UserName } from "@/components/ui/user-name";
import { useToast } from "@/components/ui/toast";
import { useAdminLocale } from "@/lib/i18n/AdminLocaleProvider";
import { FlaggedContent } from "@/components/feed/FlaggedContent";
import {
  getFlaggedContentAction,
} from "@/server/actions/profanity";

export function ProfanityAdminClient({
  initialFlaggedRes = null,
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const { t, formatRelative } = useAdminLocale();

  // Flagged Content state
  const [flaggedItems, setFlaggedItems] = useState(initialFlaggedRes?.items || []);
  const [flaggedCursor, setFlaggedCursor] = useState(initialFlaggedRes?.nextCursor || null);
  const [hasMoreFlagged, setHasMoreFlagged] = useState(Boolean(initialFlaggedRes?.nextCursor));
  const [isLoadingFlagged, setIsLoadingFlagged] = useState(false);
  const [flaggedError, setFlaggedError] = useState(null);
  const [flaggedLoadedOnce, setFlaggedLoadedOnce] = useState(Boolean(initialFlaggedRes));

  // Filters for Flagged Content
  const [flaggedType, setFlaggedType] = useState("all");
  const [flaggedSearch, setFlaggedSearch] = useState("");
  const [flaggedFrom, setFlaggedFrom] = useState("");
  const [flaggedTo, setFlaggedTo] = useState("");

  const loadFlaggedContent = async ({ reset = false, cursor = null } = {}) => {
    setIsLoadingFlagged(true);
    setFlaggedError(null);
    try {
      const res = await getFlaggedContentAction({
        type: flaggedType,
        search: flaggedSearch,
        from: flaggedFrom ? new Date(flaggedFrom).toISOString() : null,
        to: flaggedTo ? new Date(flaggedTo + "T23:59:59.999Z").toISOString() : null,
        cursor: reset ? null : cursor,
        limit: 20,
      });

      if (!res.ok) {
        setFlaggedError(res.error || t("profanity.error_flagged"));
      } else {
        if (reset) {
          setFlaggedItems(res.items || []);
        } else {
          setFlaggedItems((prev) => [...prev, ...(res.items || [])]);
        }
        setFlaggedCursor(res.nextCursor);
        setHasMoreFlagged(Boolean(res.nextCursor));
        setFlaggedLoadedOnce(true);
      }
    } catch (err) {
      console.error("Flagged fetch error:", err);
      setFlaggedError(t("profanity.error_flagged"));
    } finally {
      setIsLoadingFlagged(false);
    }
  };

  useEffect(() => {
    if (!flaggedLoadedOnce) {
      loadFlaggedContent({ reset: true });
    }
  }, [flaggedLoadedOnce]);

  const handleFlaggedFilterSubmit = (e) => {
    e?.preventDefault();
    loadFlaggedContent({ reset: true });
  };

  const handleLoadMoreFlagged = () => {
    if (flaggedCursor && !isLoadingFlagged) {
      loadFlaggedContent({ reset: false, cursor: flaggedCursor });
    }
  };



  return (
    <div className="space-y-4">
          {/* Header & Filter Controls */}
          <div className="p-4 bg-[var(--bg)] border border-[var(--line)] rounded-xl shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Flag size={16} className="text-[var(--warning)]" aria-hidden="true" />
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {t("profanity.flagged_title")}
              </h2>
            </div>
            <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
              {t("profanity.flagged_subtitle")}
            </p>

            {/* Filter Bar */}
            <form onSubmit={handleFlaggedFilterSubmit} className="flex flex-col md:flex-row md:items-end gap-3 pt-2">
              {/* Type filter */}
              <div className="w-full md:w-44">
                <label className="block text-[11px] font-semibold text-[var(--ink-muted)] mb-1">
                  {t("profanity.col_content_type")}
                </label>
                <select
                  value={flaggedType}
                  onChange={(e) => setFlaggedType(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] focus:outline-2 focus:outline-[var(--accent-bright)]"
                >
                  <option value="all">{t("profanity.filter_type_all")}</option>
                  <option value="posts">{t("profanity.filter_type_posts")}</option>
                  <option value="comments">{t("profanity.filter_type_comments")}</option>
                </select>
              </div>

              {/* Author search */}
              <div className="w-full md:w-56">
                <label className="block text-[11px] font-semibold text-[var(--ink-muted)] mb-1">
                  {t("profanity.col_author")}
                </label>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
                  <input
                    type="text"
                    value={flaggedSearch}
                    onChange={(e) => setFlaggedSearch(e.target.value)}
                    placeholder={t("profanity.filter_author_placeholder")}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-2 focus:outline-[var(--accent-bright)]"
                  />
                </div>
              </div>

              {/* From Date */}
              <div className="w-full md:w-36">
                <label className="block text-[11px] font-semibold text-[var(--ink-muted)] mb-1">
                  {t("profanity.filter_date_from")}
                </label>
                <input
                  type="date"
                  value={flaggedFrom}
                  onChange={(e) => setFlaggedFrom(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] focus:outline-2 focus:outline-[var(--accent-bright)]"
                />
              </div>

              {/* To Date */}
              <div className="w-full md:w-36">
                <label className="block text-[11px] font-semibold text-[var(--ink-muted)] mb-1">
                  {t("profanity.filter_date_to")}
                </label>
                <input
                  type="date"
                  value={flaggedTo}
                  onChange={(e) => setFlaggedTo(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] focus:outline-2 focus:outline-[var(--accent-bright)]"
                />
              </div>

              {/* Filter submit button */}
              <div className="flex items-center gap-2">
                <Button type="submit" variant="primary" size="sm" className="h-8 text-xs px-3">
                  <Filter size={13} className="mr-1" aria-hidden="true" />
                  <span>{t("common.filter", "Filter")}</span>
                </Button>
                {(flaggedSearch || flaggedFrom || flaggedTo || flaggedType !== "all") && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setFlaggedType("all");
                      setFlaggedSearch("");
                      setFlaggedFrom("");
                      setFlaggedTo("");
                      setIsLoadingFlagged(true);
                      getFlaggedContentAction({ type: "all", limit: 20 }).then((res) => {
                        setFlaggedItems(res?.items || []);
                        setFlaggedCursor(res?.nextCursor || null);
                        setHasMoreFlagged(Boolean(res?.nextCursor));
                        setIsLoadingFlagged(false);
                      });
                    }}
                  >
                    {t("common.reset", "Reset")}
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Table Container */}
          <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
            {isLoadingFlagged && flaggedItems.length === 0 ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 bg-[var(--surface)] animate-pulse rounded-lg" />
                ))}
              </div>
            ) : flaggedError ? (
              <div className="p-12 text-center text-xs text-[var(--danger)] space-y-3">
                <div className="flex justify-center">
                  <AlertCircle size={32} aria-hidden="true" />
                </div>
                <p className="font-semibold text-sm">{flaggedError}</p>
                <div>
                  <Button variant="secondary" size="sm" onClick={() => loadFlaggedContent({ reset: true })}>
                    {t("profanity.btn_retry")}
                  </Button>
                </div>
              </div>
            ) : flaggedItems.length === 0 ? (
              <div className="p-12 text-center text-xs text-[var(--ink-muted)] space-y-2">
                <div className="flex justify-center mb-1">
                  <Flag size={32} className="text-[var(--ink-muted)] opacity-35" aria-hidden="true" />
                </div>
                <p className="font-semibold text-sm text-[var(--ink)]">
                  {t("profanity.empty_flagged")}
                </p>
                <p>{t("profanity.empty_flagged_sub")}</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">{t("profanity.col_content_type")}</TableHead>
                      <TableHead className="min-w-[260px]">{t("profanity.col_content_preview")}</TableHead>
                      <TableHead className="w-40">{t("profanity.col_author")}</TableHead>
                      <TableHead className="w-32">{t("profanity.col_reason")}</TableHead>
                      <TableHead className="w-28">{t("profanity.col_created")}</TableHead>
                      <TableHead className="w-28 text-right">{t("profanity.col_actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flaggedItems.map((item) => (
                      <TableRow key={`${item.type}-${item.id}`} className="hover:bg-[var(--surface)]">
                        {/* Type */}
                        <TableCell className="align-top py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--surface-strong)] text-[var(--ink)] border border-[var(--line)]">
                            {item.type === "post" ? (
                              <>
                                <FileText size={12} strokeWidth={2} className="text-[var(--accent)] shrink-0" aria-hidden="true" />
                                <span>{t("profanity.badge_post")}</span>
                              </>
                            ) : (
                              <>
                                <MessageCircle size={12} strokeWidth={2} className="text-[var(--ink-muted)] shrink-0" aria-hidden="true" />
                                <span>{t("profanity.badge_comment")}</span>
                              </>
                            )}
                          </span>
                        </TableCell>

                        {/* Content preview hidden behind FlaggedContent overlay */}
                        <TableCell className="align-top py-3">
                          <div className="max-w-lg">
                            <FlaggedContent
                              isFlagged={true}
                              defaultHidden={true}
                              contentType={item.type}
                            >
                              <div className="text-xs text-[var(--ink)] leading-relaxed break-words">
                                {item.title && (
                                  <div className="font-semibold text-xs text-[var(--ink)] mb-1">
                                    {item.title}
                                  </div>
                                )}
                                <span className="whitespace-pre-wrap">{item.body}</span>
                              </div>
                            </FlaggedContent>
                          </div>
                        </TableCell>

                        {/* Author */}
                        <TableCell className="align-top py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar
                              src={item.author?.avatar_url}
                              name={getDisplayName(item.author)}
                              size={22}
                            />
                            <Link
                              href={`/u/${item.author?.username || "anonymous"}`}
                              className="font-medium text-xs text-[var(--ink)] hover:underline truncate max-w-[120px]"
                              title={getDisplayName(item.author)}
                            >
                              <UserName profile={item.author} />
                            </Link>
                          </div>
                        </TableCell>

                        {/* Reason */}
                        <TableCell className="align-top py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--surface-strong)] text-[var(--warning)] border border-[var(--line)]">
                            <Flag size={11} strokeWidth={2} aria-hidden="true" />
                            <span>{item.flagged_reason || "profanity"}</span>
                          </span>
                        </TableCell>

                        {/* Created At */}
                        <TableCell className="align-top py-3 text-xs text-[var(--ink-muted)] tabular-nums" suppressHydrationWarning>
                          {formatRelative(item.created_at)}
                        </TableCell>

                        {/* Context link */}
                        <TableCell className="align-top py-3 text-right">
                          <Link
                            href={`/p/${item.postId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--surface-strong)] border border-[var(--line)] rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
                          >
                            <span>{t("profanity.btn_view_context")}</span>
                            <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Cursor Pagination: Load More */}
                {hasMoreFlagged && (
                  <div className="p-4 border-t border-[var(--line)] flex justify-center bg-[var(--surface)]">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isLoadingFlagged}
                      onClick={handleLoadMoreFlagged}
                      className="text-xs flex items-center gap-1.5"
                    >
                      {isLoadingFlagged ? (
                        <>
                          <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                          <span>{t("profanity.loading_flagged")}</span>
                        </>
                      ) : (
                        <span>{t("profanity.btn_load_more")}</span>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
    </div>
  );
}
