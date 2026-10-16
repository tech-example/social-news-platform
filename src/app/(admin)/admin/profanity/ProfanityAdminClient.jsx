"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Plus,
  Upload,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  RefreshCw,
  Clock,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useAdminLocale } from "@/lib/i18n/AdminLocaleProvider";
import {
  addProfanityTermAction,
  updateProfanityTermAction,
  deleteProfanityTermAction,
  bulkImportProfanityTermsAction,
  exportProfanityTermsAction,
  approveProfanitySuggestionAction,
  rejectProfanitySuggestionAction,
  rescanContentBatchAction,
} from "@/server/actions/profanity";

export function ProfanityAdminClient({ initialTermsRes, initialSuggestions = [], filters }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { t, formatRelative, formatNumber } = useAdminLocale();

  const [activeTab, setActiveTab] = useState("terms"); // "terms" | "suggestions" | "scanner"
  const [terms, setTerms] = useState(initialTermsRes?.terms || []);
  const [total, setTotal] = useState(initialTermsRes?.total || 0);
  const [suggestions, setSuggestions] = useState(initialSuggestions);

  // Filter state
  const [search, setSearch] = useState(filters.search || "");
  const [language, setLanguage] = useState(filters.language || "all");
  const [severity, setSeverity] = useState(filters.severity || "all");
  const [kind, setKind] = useState(filters.kind || "all");
  const [active, setActive] = useState(filters.active || "all");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Form states for Add/Edit
  const [termInput, setTermInput] = useState("");
  const [langInput, setLangInput] = useState("th");
  const [sevInput, setSevInput] = useState("moderate");
  const [kindInput, setKindInput] = useState("block");
  const [activeInput, setActiveInput] = useState(true);

  // Bulk import state
  const [bulkText, setBulkText] = useState("");
  const [bulkLang, setBulkLang] = useState("en");
  const [bulkSev, setBulkSev] = useState("moderate");
  const [bulkKind, setBulkKind] = useState("block");

  // Scanner state
  const [scannerTarget, setScannerTarget] = useState("posts");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ processed: 0, flagged: 0, cursor: null, isComplete: false });

  // Update URL on filter apply
  const applyFilters = (newParams = {}) => {
    const params = new URLSearchParams();
    const merged = { search, language, severity, kind, active, page: 1, ...newParams };

    if (merged.search) params.set("search", merged.search);
    if (merged.language !== "all") params.set("language", merged.language);
    if (merged.severity !== "all") params.set("severity", merged.severity);
    if (merged.kind !== "all") params.set("kind", merged.kind);
    if (merged.active !== "all") params.set("active", merged.active);
    if (merged.page > 1) params.set("page", merged.page);

    router.push(`/admin/profanity?${params.toString()}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    applyFilters({ search, page: 1 });
  };

  // Open Edit modal
  const openEdit = (term) => {
    setEditingTerm(term);
    setTermInput(term.term);
    setLangInput(term.language);
    setSevInput(term.severity);
    setKindInput(term.kind);
    setActiveInput(term.is_active);
  };

  // Save Add/Edit
  const handleSaveTerm = () => {
    if (!termInput.trim()) {
      addToast(t("profanity.toast_term_required"), "error");
      return;
    }

    startTransition(async () => {
      if (editingTerm) {
        const res = await updateProfanityTermAction(editingTerm.id, {
          term: termInput,
          language: langInput,
          severity: sevInput,
          kind: kindInput,
          is_active: activeInput,
        });
        if (res.ok) {
          addToast(t("profanity.toast_updated"));
          setTerms((prev) =>
            prev.map((item) =>
              item.id === editingTerm.id
                ? { ...item, term: termInput.toLowerCase(), language: langInput, severity: sevInput, kind: kindInput, is_active: activeInput }
                : item
            )
          );
          setEditingTerm(null);
        } else {
          addToast(res.error || t("profanity.toast_error_update"), "error");
        }
      } else {
        const res = await addProfanityTermAction({
          term: termInput,
          language: langInput,
          severity: sevInput,
          kind: kindInput,
          is_active: activeInput,
        });
        if (res.ok) {
          addToast(t("profanity.toast_added"));
          setTerms((prev) => [res.term, ...prev]);
          setTotal((prev) => prev + 1);
          setIsAddOpen(false);
          setTermInput("");
        } else {
          addToast(res.error || t("profanity.toast_error_add"), "error");
        }
      }
    });
  };

  // Delete Term
  const handleDeleteConfirm = () => {
    if (!deletingId) return;
    startTransition(async () => {
      const res = await deleteProfanityTermAction(deletingId);
      if (res.ok) {
        addToast(t("profanity.toast_deleted"));
        setTerms((prev) => prev.filter((item) => item.id !== deletingId));
        setTotal((prev) => Math.max(0, prev - 1));
        setDeletingId(null);
      } else {
        addToast(res.error || t("profanity.toast_error_delete"), "error");
      }
    });
  };

  // Bulk Import
  const handleBulkImport = () => {
    if (!bulkText.trim()) {
      addToast(t("profanity.toast_bulk_required"), "error");
      return;
    }

    startTransition(async () => {
      const res = await bulkImportProfanityTermsAction(bulkText, {
        language: bulkLang,
        severity: bulkSev,
        kind: bulkKind,
      });
      if (res.ok) {
        addToast(t("profanity.toast_bulk_success", { imported: formatNumber(res.importedCount), skipped: formatNumber(res.skippedCount) }));
        setIsBulkOpen(false);
        setBulkText("");
        router.refresh();
      } else {
        addToast(res.error || t("profanity.toast_error_bulk"), "error");
      }
    });
  };

  // Export CSV
  const handleExportCSV = async () => {
    const res = await exportProfanityTermsAction();
    if (!res.ok) {
      addToast(res.error || t("profanity.toast_error_export"), "error");
      return;
    }
    const blob = new Blob([res.csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `profanity-terms-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(t("profanity.toast_export_success", { count: formatNumber(res.count) }));
  };

  // Approve / Reject Suggestion
  const handleApproveSuggestion = (id) => {
    startTransition(async () => {
      const res = await approveProfanitySuggestionAction(id);
      if (res.ok) {
        addToast(t("profanity.toast_suggestion_approved"));
        setSuggestions((prev) => prev.filter((s) => s.id !== id));
        router.refresh();
      } else {
        addToast(res.error || t("profanity.toast_error_approve"), "error");
      }
    });
  };

  const handleRejectSuggestion = (id) => {
    startTransition(async () => {
      const res = await rejectProfanitySuggestionAction(id);
      if (res.ok) {
        addToast(t("profanity.toast_suggestion_rejected"));
        setSuggestions((prev) => prev.filter((s) => s.id !== id));
      } else {
        addToast(res.error || t("profanity.toast_error_reject"), "error");
      }
    });
  };

  // Run Content Re-scanner
  const handleStartScanner = async () => {
    setIsScanning(true);
    let currentCursor = null;
    let totalProcessed = 0;
    let totalFlagged = 0;

    addToast(t("profanity.toast_rescan_start", { target: scannerTarget === "posts" ? t("profanity.scanner_opt_posts") : t("profanity.scanner_opt_comments") }));

    while (true) {
      const res = await rescanContentBatchAction({
        targetType: scannerTarget,
        cursor: currentCursor,
        batchSize: 50,
      });

      if (!res.ok) {
        addToast(res.error || t("profanity.toast_error_scanner"), "error");
        break;
      }

      totalProcessed += res.processed;
      totalFlagged += res.flagged;
      currentCursor = res.nextCursor;

      setScanProgress({
        processed: totalProcessed,
        flagged: totalFlagged,
        cursor: currentCursor,
        isComplete: res.isComplete,
      });

      if (res.isComplete || !res.nextCursor) {
        addToast(t("profanity.toast_rescan_complete", { processed: formatNumber(totalProcessed), flagged: formatNumber(totalFlagged) }));
        break;
      }
    }

    setIsScanning(false);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--line)]">
        <button
          type="button"
          onClick={() => setActiveTab("terms")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
            activeTab === "terms"
              ? "border-[var(--ink)] text-[var(--ink)]"
              : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          <ShieldAlert size={14} strokeWidth={2} aria-hidden="true" />
          <span>{t("profanity.tab_terms", { count: formatNumber(total) })}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("suggestions")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
            activeTab === "suggestions"
              ? "border-[var(--ink)] text-[var(--ink)]"
              : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          <Clock size={14} strokeWidth={2} aria-hidden="true" />
          <span>{t("profanity.suggestions_title")}</span>
          {suggestions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--danger)] text-white">
              {formatNumber(suggestions.length)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("scanner")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
            activeTab === "scanner"
              ? "border-[var(--ink)] text-[var(--ink)]"
              : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
          <span>{t("profanity.tab_scanner")}</span>
        </button>
      </div>

      {/* TAB 1: Terms Dictionary */}
      {activeTab === "terms" && (
        <div className="space-y-4">
          {/* Action Row & Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[var(--bg)] p-3 sm:p-4 rounded-xl border border-[var(--line)] shadow-xs">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("profanity.search_placeholder")}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-2 focus:outline-[var(--accent-bright)]"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm" className="h-8 text-xs">
                {t("common.search", "Search")}
              </Button>
            </form>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingTerm(null);
                  setTermInput("");
                  setLangInput("th");
                  setSevInput("moderate");
                  setKindInput("block");
                  setActiveInput(true);
                  setIsAddOpen(true);
                }}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Plus size={14} strokeWidth={2} aria-hidden="true" />
                <span>{t("profanity.btn_add")}</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsBulkOpen(true)}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Upload size={13} strokeWidth={2} aria-hidden="true" />
                <span>{t("profanity.btn_bulk")}</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportCSV}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Download size={13} strokeWidth={2} aria-hidden="true" />
                <span>{t("profanity.btn_export")}</span>
              </Button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-[var(--ink-muted)] font-medium">
              <Filter size={12} />
              <span>{t("common.filters", "Filters:")}</span>
            </span>

            {/* Language filter */}
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                applyFilters({ language: e.target.value });
              }}
              className="px-2.5 py-1 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] cursor-pointer"
            >
              <option value="all">{t("profanity.filter_all_lang")}</option>
              <option value="th">{t("profanity.filter_th")}</option>
              <option value="en">{t("profanity.filter_en")}</option>
              <option value="th_romanized">{t("profanity.filter_th_romanized")}</option>
              <option value="other">{t("profanity.filter_other")}</option>
            </select>

            {/* Severity filter */}
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                applyFilters({ severity: e.target.value });
              }}
              className="px-2.5 py-1 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] cursor-pointer"
            >
              <option value="all">{t("profanity.filter_all_sev")}</option>
              <option value="severe">{t("profanity.filter_severe")}</option>
              <option value="moderate">{t("profanity.filter_moderate")}</option>
              <option value="mild">{t("profanity.filter_mild")}</option>
            </select>

            {/* Kind filter */}
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                applyFilters({ kind: e.target.value });
              }}
              className="px-2.5 py-1 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] cursor-pointer"
            >
              <option value="all">{t("profanity.filter_all_kind")}</option>
              <option value="block">{t("profanity.filter_block")}</option>
              <option value="allow">{t("profanity.filter_allow")}</option>
            </select>

            {/* Active filter */}
            <select
              value={active}
              onChange={(e) => {
                setActive(e.target.value);
                applyFilters({ active: e.target.value });
              }}
              className="px-2.5 py-1 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] cursor-pointer"
            >
              <option value="all">{t("profanity.filter_all_status")}</option>
              <option value="active">{t("profanity.filter_active")}</option>
              <option value="inactive">{t("profanity.filter_inactive")}</option>
            </select>
          </div>

          {/* Terms Table */}
          <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
            {terms.length === 0 ? (
              <div className="py-16 text-center text-sm text-[var(--ink-muted)] space-y-1">
                <p className="font-semibold text-[var(--ink)]">{t("profanity.empty_terms")}</p>
                <p className="text-xs">{t("profanity.empty_terms_sub")}</p>
              </div>
            ) : (
              <>
                {/* Desktop Table (>= 768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("profanity.col_term")}</TableHead>
                        <TableHead>{t("profanity.col_lang")}</TableHead>
                        <TableHead>{t("profanity.col_severity")}</TableHead>
                        <TableHead>{t("profanity.col_kind")}</TableHead>
                        <TableHead>{t("profanity.col_status")}</TableHead>
                        <TableHead>{t("profanity.col_added")}</TableHead>
                        <TableHead className="text-right">{t("profanity.col_actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {terms.map((termItem) => (
                        <TableRow key={termItem.id}>
                          <TableCell className="font-semibold text-xs text-[var(--ink)]">
                            <span className="font-mono bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--line)]">
                              {termItem.term}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs capitalize text-[var(--ink-muted)]">
                            {termItem.language === "th"
                              ? t("profanity.filter_th")
                              : termItem.language === "en"
                                ? t("profanity.filter_en")
                                : termItem.language?.replace("_", " ")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                termItem.severity === "severe"
                                  ? "danger"
                                  : termItem.severity === "moderate"
                                  ? "warning"
                                  : "neutral"
                              }
                              size="sm"
                            >
                              {termItem.severity === "severe"
                                ? t("profanity.filter_severe")
                                : termItem.severity === "moderate"
                                  ? t("profanity.filter_moderate")
                                  : t("profanity.filter_mild")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={termItem.kind === "block" ? "danger" : "success"} size="sm">
                              {termItem.kind === "block" ? t("profanity.badge_block") : t("profanity.badge_allow")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${termItem.is_active ? "text-[var(--success)]" : "text-[var(--ink-muted)]"}`}>
                              {termItem.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              <span>{termItem.is_active ? t("profanity.badge_active") : t("profanity.badge_inactive")}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-[var(--ink-muted)] tabular-nums" suppressHydrationWarning>
                            {formatRelative(termItem.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              <IconButton
                                label={t("common.edit", "Edit")}
                                onClick={() => openEdit(termItem)}
                                className="text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-strong)]"
                              >
                                <Edit2 size={16} strokeWidth={1.75} aria-hidden="true" />
                              </IconButton>
                              <IconButton
                                label={t("common.delete", "Delete")}
                                onClick={() => setDeletingId(termItem.id)}
                                className="text-[var(--danger)]/80 hover:text-[var(--danger)] hover:bg-[var(--danger)]/10"
                              >
                                <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                              </IconButton>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards (< 768px) */}
                <div className="md:hidden divide-y divide-[var(--line)]">
                  {terms.map((termItem) => (
                    <div key={termItem.id} className="p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-[var(--ink)] bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--line)]">
                          {termItem.term}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge variant={termItem.severity === "severe" ? "danger" : "warning"} size="sm">
                            {termItem.severity === "severe"
                              ? t("profanity.filter_severe")
                              : termItem.severity === "moderate"
                                ? t("profanity.filter_moderate")
                                : t("profanity.filter_mild")}
                          </Badge>
                          <Badge variant={termItem.kind === "block" ? "danger" : "success"} size="sm">
                            {termItem.kind === "block" ? t("profanity.badge_block") : t("profanity.badge_allow")}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[var(--ink-muted)]">
                        <span>{t("profanity.col_lang")}: <strong className="capitalize">{termItem.language === "th" ? t("profanity.filter_th") : termItem.language === "en" ? t("profanity.filter_en") : termItem.language?.replace("_", " ")}</strong></span>
                        <span>{termItem.is_active ? t("profanity.badge_active") : t("profanity.badge_inactive")}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[var(--line)]">
                        <span className="text-[var(--ink-muted)] text-[11px] tabular-nums" suppressHydrationWarning>
                          {formatRelative(termItem.created_at)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(termItem)} className="h-7 px-2.5 text-xs">
                            {t("common.edit", "Edit")}
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setDeletingId(termItem.id)} className="h-7 px-2.5 text-xs text-[var(--danger)]">
                            {t("common.delete", "Delete")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Moderator Suggestions */}
      {activeTab === "suggestions" && (
        <div className="space-y-4">
          <div className="p-4 bg-[var(--bg)] border border-[var(--line)] rounded-xl shadow-xs">
            <h2 className="text-sm font-bold text-[var(--ink)] mb-1">
              {t("profanity.suggestions_title")}
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              {t("profanity.suggestions_subtitle")}
            </p>
          </div>

          <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
            {suggestions.length === 0 ? (
              <div className="py-16 text-center text-sm text-[var(--ink-muted)]">
                {t("profanity.suggestions_empty")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("profanity.suggestions_col_term")}</TableHead>
                    <TableHead>{t("profanity.suggestions_col_lang")}</TableHead>
                    <TableHead>{t("profanity.suggestions_col_severity")}</TableHead>
                    <TableHead>{t("profanity.suggestions_col_by")}</TableHead>
                    <TableHead>{t("profanity.suggestions_col_date")}</TableHead>
                    <TableHead className="text-right">{t("profanity.suggestions_col_actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono font-semibold text-xs text-[var(--ink)]">
                        {s.term}
                      </TableCell>
                      <TableCell className="text-xs capitalize text-[var(--ink-muted)]">
                        {s.language === "th" ? t("profanity.filter_th") : s.language === "en" ? t("profanity.filter_en") : s.language?.replace("_", " ")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="warning" size="sm">
                          {s.severity === "severe" ? t("profanity.filter_severe") : s.severity === "moderate" ? t("profanity.filter_moderate") : t("profanity.filter_mild")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[var(--ink-muted)]">
                        @{s.suggested_by?.username || "moderator"}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--ink-muted)] tabular-nums" suppressHydrationWarning>
                        {formatRelative(s.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleApproveSuggestion(s.id)}
                            className="h-7 px-2.5 text-xs"
                          >
                            {t("profanity.btn_approve")}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleRejectSuggestion(s.id)}
                            className="h-7 px-2.5 text-xs text-[var(--danger)]"
                          >
                            {t("profanity.btn_reject")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Content Re-Scanner */}
      {activeTab === "scanner" && (
        <div className="space-y-4">
          <div className="p-5 bg-[var(--bg)] border border-[var(--line)] rounded-xl shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className="text-[var(--accent)]" />
              <h2 className="text-sm font-bold text-[var(--ink)]">
                {t("profanity.scanner_title")}
              </h2>
            </div>
            <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
              {t("profanity.scanner_desc")}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ink-muted)] mb-1">
                  {t("profanity.scanner_target")}
                </label>
                <select
                  value={scannerTarget}
                  disabled={isScanning}
                  onChange={(e) => setScannerTarget(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)]"
                >
                  <option value="posts">{t("profanity.scanner_opt_posts")}</option>
                  <option value="comments">{t("profanity.scanner_opt_comments")}</option>
                </select>
              </div>

              <div className="pt-5">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isScanning}
                  onClick={handleStartScanner}
                  className="h-8 text-xs flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={isScanning ? "animate-spin" : ""} />
                  <span>{isScanning ? t("profanity.scanner_btn_scanning") : t("profanity.scanner_btn_start")}</span>
                </Button>
              </div>
            </div>

            {/* Progress Display */}
            {scanProgress.processed > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-[var(--surface)] border border-[var(--line)] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--ink)]">
                  <span>{t("profanity.scanner_processed", { count: formatNumber(scanProgress.processed) })}</span>
                  <span className="text-[var(--warning)]">{t("profanity.scanner_flagged", { count: formatNumber(scanProgress.flagged) })}</span>
                </div>
                <div className="w-full bg-[var(--line)] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-[var(--accent)] transition-all duration-300 ${isScanning ? "animate-pulse" : ""}`}
                    style={{ width: scanProgress.isComplete ? "100%" : "60%" }}
                  />
                </div>
                {scanProgress.isComplete && (
                  <p className="text-[11px] font-medium text-[var(--success)]">
                    {t("profanity.scanner_complete")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIALOG: Add / Edit Term */}
      <Dialog open={isAddOpen || Boolean(editingTerm)} onOpenChange={(open) => {
        if (!open) {
          setIsAddOpen(false);
          setEditingTerm(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTerm ? t("profanity.modal_edit_title") : t("profanity.modal_add_title")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block font-semibold text-[var(--ink)] mb-1">
                {t("profanity.modal_label_term")}
              </label>
              <input
                type="text"
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                placeholder={t("profanity.modal_term_placeholder")}
                className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] focus:outline-2 focus:outline-[var(--accent-bright)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">
                  {t("profanity.modal_label_lang")}
                </label>
                <select
                  value={langInput}
                  onChange={(e) => setLangInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)]"
                >
                  <option value="th">{t("profanity.filter_th")}</option>
                  <option value="en">{t("profanity.filter_en")}</option>
                  <option value="th_romanized">{t("profanity.filter_th_romanized")}</option>
                  <option value="other">{t("profanity.filter_other")}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">
                  {t("profanity.modal_label_sev")}
                </label>
                <select
                  value={sevInput}
                  onChange={(e) => setSevInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)]"
                >
                  <option value="mild">{t("profanity.filter_mild")}</option>
                  <option value="moderate">{t("profanity.filter_moderate")}</option>
                  <option value="severe">{t("profanity.filter_severe")}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">
                  {t("profanity.modal_label_kind")}
                </label>
                <select
                  value={kindInput}
                  onChange={(e) => setKindInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)]"
                >
                  <option value="block">{t("profanity.filter_block")}</option>
                  <option value="allow">{t("profanity.filter_allow")}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">
                  {t("profanity.modal_label_active")}
                </label>
                <select
                  value={activeInput ? "active" : "inactive"}
                  onChange={(e) => setActiveInput(e.target.value === "active")}
                  className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)]"
                >
                  <option value="active">{t("profanity.filter_active")}</option>
                  <option value="inactive">{t("profanity.filter_inactive")}</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsAddOpen(false);
                setEditingTerm(null);
              }}
            >
              {t("profanity.btn_cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isPending}
              onClick={handleSaveTerm}
            >
              {editingTerm ? t("profanity.btn_save") : t("profanity.btn_add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Bulk Import */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("profanity.modal_bulk_title")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-[var(--ink-muted)]">
              {t("profanity.modal_bulk_desc")}
            </p>

            <textarea
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={t("profanity.modal_bulk_placeholder")}
              className="w-full p-3 font-mono text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] focus:outline-2 focus:outline-[var(--accent-bright)]"
            />

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">{t("profanity.modal_label_lang")}</label>
                <select
                  value={bulkLang}
                  onChange={(e) => setBulkLang(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg"
                >
                  <option value="en">{t("profanity.filter_en")}</option>
                  <option value="th">{t("profanity.filter_th")}</option>
                  <option value="th_romanized">{t("profanity.filter_th_romanized")}</option>
                  <option value="other">{t("profanity.filter_other")}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">{t("profanity.modal_label_sev")}</label>
                <select
                  value={bulkSev}
                  onChange={(e) => setBulkSev(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg"
                >
                  <option value="moderate">{t("profanity.filter_moderate")}</option>
                  <option value="severe">{t("profanity.filter_severe")}</option>
                  <option value="mild">{t("profanity.filter_mild")}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">{t("profanity.modal_label_kind")}</label>
                <select
                  value={bulkKind}
                  onChange={(e) => setBulkKind(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg"
                >
                  <option value="block">{t("profanity.filter_block")}</option>
                  <option value="allow">{t("profanity.filter_allow")}</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setIsBulkOpen(false)}>
              {t("profanity.btn_cancel")}
            </Button>
            <Button variant="primary" size="sm" disabled={isPending} onClick={handleBulkImport}>
              {t("profanity.btn_import")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Confirm Delete */}
      <Dialog open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("profanity.modal_delete_title")}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[var(--ink-muted)] py-2">
            {t("profanity.modal_delete_desc")}
          </p>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setDeletingId(null)}>
              {t("profanity.btn_cancel")}
            </Button>
            <Button variant="danger" size="sm" disabled={isPending} onClick={handleDeleteConfirm}>
              {t("profanity.btn_delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
