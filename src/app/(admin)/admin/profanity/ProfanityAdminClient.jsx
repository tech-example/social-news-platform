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
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/format";
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
      addToast("Please enter a term.", "error");
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
          addToast("Term updated.");
          setTerms((prev) =>
            prev.map((t) =>
              t.id === editingTerm.id
                ? { ...t, term: termInput.toLowerCase(), language: langInput, severity: sevInput, kind: kindInput, is_active: activeInput }
                : t
            )
          );
          setEditingTerm(null);
        } else {
          addToast(res.error || "Update failed.", "error");
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
          addToast("New term added to filter.");
          setTerms((prev) => [res.term, ...prev]);
          setTotal((prev) => prev + 1);
          setIsAddOpen(false);
          setTermInput("");
        } else {
          addToast(res.error || "Failed to add term.", "error");
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
        addToast("Term deleted.");
        setTerms((prev) => prev.filter((t) => t.id !== deletingId));
        setTotal((prev) => Math.max(0, prev - 1));
        setDeletingId(null);
      } else {
        addToast(res.error || "Delete failed.", "error");
      }
    });
  };

  // Bulk Import
  const handleBulkImport = () => {
    if (!bulkText.trim()) {
      addToast("Please enter words to import.", "error");
      return;
    }

    startTransition(async () => {
      const res = await bulkImportProfanityTermsAction(bulkText, {
        language: bulkLang,
        severity: bulkSev,
        kind: bulkKind,
      });
      if (res.ok) {
        addToast(`Import complete. ${res.importedCount} added, ${res.skippedCount} duplicates skipped.`);
        setIsBulkOpen(false);
        setBulkText("");
        router.refresh();
      } else {
        addToast(res.error || "Bulk import failed.", "error");
      }
    });
  };

  // Export CSV
  const handleExportCSV = async () => {
    const res = await exportProfanityTermsAction();
    if (!res.ok) {
      addToast(res.error || "Export failed.", "error");
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
    addToast(`Exported ${res.count} terms to CSV.`);
  };

  // Approve / Reject Suggestion
  const handleApproveSuggestion = (id) => {
    startTransition(async () => {
      const res = await approveProfanitySuggestionAction(id);
      if (res.ok) {
        addToast("Suggestion approved and added to active terms.");
        setSuggestions((prev) => prev.filter((s) => s.id !== id));
        router.refresh();
      } else {
        addToast(res.error || "Approval failed.", "error");
      }
    });
  };

  const handleRejectSuggestion = (id) => {
    startTransition(async () => {
      const res = await rejectProfanitySuggestionAction(id);
      if (res.ok) {
        addToast("Suggestion rejected.");
        setSuggestions((prev) => prev.filter((s) => s.id !== id));
      } else {
        addToast(res.error || "Rejection failed.", "error");
      }
    });
  };

  // Run Content Re-scanner
  const handleStartScanner = async () => {
    setIsScanning(true);
    let currentCursor = null;
    let totalProcessed = 0;
    let totalFlagged = 0;

    addToast(`Beginning re-scan of ${scannerTarget}...`);

    while (true) {
      const res = await rescanContentBatchAction({
        targetType: scannerTarget,
        cursor: currentCursor,
        batchSize: 50,
      });

      if (!res.ok) {
        addToast(res.error || "Re-scan stopped due to error.", "error");
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
        addToast(`Re-scan completed! ${totalProcessed} checked, ${totalFlagged} flagged.`);
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
          <span>Active Terms ({total})</span>
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
          <span>Moderator Suggestions</span>
          {suggestions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--danger)] text-white">
              {suggestions.length}
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
          <span>Content Re-Scanner</span>
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
                  placeholder="Search terms..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-2 focus:outline-[var(--accent-bright)]"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm" className="h-8 text-xs">
                Search
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
                <span>Add Term</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsBulkOpen(true)}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Upload size={13} strokeWidth={2} aria-hidden="true" />
                <span>Bulk Import</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportCSV}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Download size={13} strokeWidth={2} aria-hidden="true" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-[var(--ink-muted)] font-medium">
              <Filter size={12} />
              <span>Filters:</span>
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
              <option value="all">Language: All</option>
              <option value="th">Thai (th)</option>
              <option value="en">English (en)</option>
              <option value="th_romanized">Romanized Thai</option>
              <option value="other">Other</option>
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
              <option value="all">Severity: All</option>
              <option value="severe">Severe</option>
              <option value="moderate">Moderate</option>
              <option value="mild">Mild</option>
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
              <option value="all">Type: All</option>
              <option value="block">Blocked (Hide)</option>
              <option value="allow">Allowed (Whitelist)</option>
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
              <option value="all">Status: All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Terms Table */}
          <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
            {terms.length === 0 ? (
              <div className="py-16 text-center text-sm text-[var(--ink-muted)] space-y-1">
                <p className="font-semibold text-[var(--ink)]">No terms match the selected filters</p>
                <p className="text-xs">Add a custom term or adjust your search criteria.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table (>= 768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Term</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {terms.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-semibold text-xs text-[var(--ink)]">
                            <span className="font-mono bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--line)]">
                              {t.term}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs capitalize text-[var(--ink-muted)]">
                            {t.language?.replace("_", " ")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                t.severity === "severe"
                                  ? "danger"
                                  : t.severity === "moderate"
                                  ? "warning"
                                  : "neutral"
                              }
                              size="sm"
                            >
                              {t.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={t.kind === "block" ? "danger" : "success"} size="sm">
                              {t.kind === "block" ? "Block" : "Allow"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${t.is_active ? "text-[var(--success)]" : "text-[var(--ink-muted)]"}`}>
                              {t.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              <span>{t.is_active ? "Active" : "Inactive"}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-[var(--ink-muted)]" suppressHydrationWarning>
                            {formatRelativeTime(t.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openEdit(t)}
                                className="h-7 px-2 text-xs"
                                title="Edit term"
                              >
                                <Edit2 size={12} />
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setDeletingId(t.id)}
                                className="h-7 px-2 text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10"
                                title="Delete term"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards (< 768px) */}
                <div className="md:hidden divide-y divide-[var(--line)]">
                  {terms.map((t) => (
                    <div key={t.id} className="p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-[var(--ink)] bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--line)]">
                          {t.term}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge variant={t.severity === "severe" ? "danger" : "warning"} size="sm">
                            {t.severity}
                          </Badge>
                          <Badge variant={t.kind === "block" ? "danger" : "success"} size="sm">
                            {t.kind}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[var(--ink-muted)]">
                        <span>Lang: <strong className="capitalize">{t.language?.replace("_", " ")}</strong></span>
                        <span>{t.is_active ? "Active" : "Inactive"}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[var(--line)]">
                        <span className="text-[var(--ink-muted)] text-[11px]" suppressHydrationWarning>
                          {formatRelativeTime(t.created_at)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(t)} className="h-7 px-2.5 text-xs">
                            Edit
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setDeletingId(t.id)} className="h-7 px-2.5 text-xs text-[var(--danger)]">
                            Delete
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
              Moderator Recommendations
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              Terms recommended by moderators when resolving harassment or hate reports. Approve to add directly to the active dictionary.
            </p>
          </div>

          <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
            {suggestions.length === 0 ? (
              <div className="py-16 text-center text-sm text-[var(--ink-muted)]">
                No pending moderator recommendations at this time.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Suggested Term</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Suggested By</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono font-semibold text-xs text-[var(--ink)]">
                        {s.term}
                      </TableCell>
                      <TableCell className="text-xs capitalize text-[var(--ink-muted)]">
                        {s.language?.replace("_", " ")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="warning" size="sm">
                          {s.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[var(--ink-muted)]">
                        @{s.suggested_by?.username || "moderator"}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--ink-muted)]" suppressHydrationWarning>
                        {formatRelativeTime(s.created_at)}
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
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleRejectSuggestion(s.id)}
                            className="h-7 px-2.5 text-xs text-[var(--danger)]"
                          >
                            Reject
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
                Re-Scan Historical Content
              </h2>
            </div>
            <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
              Re-evaluates published posts and comments against the current layered profanity detector and database terms.
              Updates <code className="text-[var(--ink)]">is_flagged</code> and <code className="text-[var(--ink)]">flagged_reason</code> in batches without modifying the underlying text or publishing state.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ink-muted)] mb-1">
                  Target Content
                </label>
                <select
                  value={scannerTarget}
                  disabled={isScanning}
                  onChange={(e) => setScannerTarget(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)]"
                >
                  <option value="posts">All Posts</option>
                  <option value="comments">All Comments</option>
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
                  <span>{isScanning ? "Scanning in progress..." : "Start Batch Re-Scan"}</span>
                </Button>
              </div>
            </div>

            {/* Progress Display */}
            {scanProgress.processed > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-[var(--surface)] border border-[var(--line)] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--ink)]">
                  <span>Processed: {scanProgress.processed} items</span>
                  <span className="text-[var(--warning)]">Flagged for Language: {scanProgress.flagged}</span>
                </div>
                <div className="w-full bg-[var(--line)] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-[var(--accent)] transition-all duration-300 ${isScanning ? "animate-pulse" : ""}`}
                    style={{ width: scanProgress.isComplete ? "100%" : "60%" }}
                  />
                </div>
                {scanProgress.isComplete && (
                  <p className="text-[11px] font-medium text-[var(--success)]">
                    Batch scanning finished successfully. All records are up to date.
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
              {editingTerm ? "Edit Filter Term" : "Add Profanity Term"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block font-semibold text-[var(--ink)] mb-1">
                Term / Word
              </label>
              <input
                type="text"
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                placeholder="e.g. offensive word..."
                className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] focus:outline-2 focus:outline-[var(--accent-bright)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">
                  Language
                </label>
                <select
                  value={langInput}
                  onChange={(e) => setLangInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)]"
                >
                  <option value="th">Thai (th)</option>
                  <option value="en">English (en)</option>
                  <option value="th_romanized">Romanized Thai</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">
                  Severity
                </label>
                <select
                  value={sevInput}
                  onChange={(e) => setSevInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)]"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">
                  Type / Action
                </label>
                <select
                  value={kindInput}
                  onChange={(e) => setKindInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)]"
                >
                  <option value="block">Block (Hide content)</option>
                  <option value="allow">Allow (False-positive guard)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">
                  Status
                </label>
                <select
                  value={activeInput ? "active" : "inactive"}
                  onChange={(e) => setActiveInput(e.target.value === "active")}
                  className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)]"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isPending}
              onClick={handleSaveTerm}
            >
              {editingTerm ? "Save Changes" : "Add Term"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Bulk Import */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Import Terms</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-[var(--ink-muted)]">
              Paste one term per line (up to 500 terms). Duplicates and blank lines will be skipped automatically.
            </p>

            <textarea
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="term1&#10;term2&#10;term3..."
              className="w-full p-3 font-mono text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg text-[var(--ink)] focus:outline-2 focus:outline-[var(--accent-bright)]"
            />

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">Language</label>
                <select
                  value={bulkLang}
                  onChange={(e) => setBulkLang(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg"
                >
                  <option value="en">English (en)</option>
                  <option value="th">Thai (th)</option>
                  <option value="th_romanized">Romanized</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">Severity</label>
                <select
                  value={bulkSev}
                  onChange={(e) => setBulkSev(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg"
                >
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="mild">Mild</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--ink)] mb-1">List Type</label>
                <select
                  value={bulkKind}
                  onChange={(e) => setBulkKind(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] rounded-lg"
                >
                  <option value="block">Block</option>
                  <option value="allow">Allow</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setIsBulkOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={isPending} onClick={handleBulkImport}>
              Import Terms
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Confirm Delete */}
      <Dialog open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[var(--ink-muted)] py-2">
            Are you sure you want to permanently delete this term from the filter? Content containing this term will no longer be flagged by this specific rule.
          </p>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" disabled={isPending} onClick={handleDeleteConfirm}>
              Delete Term
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
