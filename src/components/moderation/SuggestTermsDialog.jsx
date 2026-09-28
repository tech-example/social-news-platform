"use client";
import { useState, useMemo, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { suggestProfanityTermAction } from "@/server/actions/profanity";
import { THAI_ALLOW_LIST, ENGLISH_ALLOW_LIST } from "@/lib/profanity/thai-guard";
import { ShieldAlert, Plus, Check } from "lucide-react";

/**
 * Tokenize text into candidate words for moderation suggestion.
 */
function extractCandidateTokens(text) {
  if (!text || typeof text !== "string") return [];

  const rawTokens = [];
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter(["th", "en"], { granularity: "word" });
      for (const seg of segmenter.segment(text)) {
        if (seg.isWordLike) {
          rawTokens.push(seg.segment);
        }
      }
    } catch {
      // Fallback
      const matches = text.match(/[\p{L}\p{M}]+/gu) || [];
      rawTokens.push(...matches);
    }
  } else {
    const matches = text.match(/[\p{L}\p{M}]+/gu) || [];
    rawTokens.push(...matches);
  }

  const seen = new Set();
  const allowSet = new Set([
    ...THAI_ALLOW_LIST.map((w) => w.toLowerCase()),
    ...ENGLISH_ALLOW_LIST.map((w) => w.toLowerCase()),
  ]);

  const candidates = [];
  for (const token of rawTokens) {
    const trimmed = token.trim();
    const lower = trimmed.toLowerCase();
    if (trimmed.length < 2) continue;
    if (/^\d+$/.test(trimmed)) continue;
    if (allowSet.has(lower)) continue;
    if (!seen.has(lower)) {
      seen.add(lower);
      candidates.push(trimmed);
    }
  }

  return candidates.slice(0, 30);
}

function detectLanguage(term) {
  return /[\u0E00-\u0E7F]/.test(term) ? "th" : "en";
}

export function SuggestTermsDialog({
  contentText = "",
  reportId = null,
  triggerLabel = "Suggest terms from this content",
  className = "",
}) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [language, setLanguage] = useState("th");
  const [severity, setSeverity] = useState("moderate");
  const [submittedTerms, setSubmittedTerms] = useState(new Set());
  const [isPending, startTransition] = useTransition();

  const candidateTokens = useMemo(() => extractCandidateTokens(contentText), [contentText]);

  const handleSelectToken = (tok) => {
    setTerm(tok);
    setLanguage(detectLanguage(tok));
  };

  const handleTermChange = (e) => {
    const val = e.target.value;
    setTerm(val);
    if (val.trim()) {
      setLanguage(detectLanguage(val));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanTerm = term.trim().toLowerCase();
    if (!cleanTerm) {
      addToast("Please enter or select a term to suggest.", "error");
      return;
    }

    startTransition(async () => {
      const res = await suggestProfanityTermAction({
        term: cleanTerm,
        language,
        severity,
        sourceReportId: reportId,
      });

      if (res.ok) {
        addToast(`Submitted "${cleanTerm}" for admin review.`);
        setSubmittedTerms((prev) => new Set([...prev, cleanTerm]));
        setTerm("");
      } else {
        addToast(res.error || "Failed to submit suggestion.", "error");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs ${className}`}
      >
        <ShieldAlert size={14} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent)]" />
        <span>{triggerLabel}</span>
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Suggest Profanity Term"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[var(--ink-muted)]">
            Suggest offensive or evasive terms from this reported content for administrator review.
            Approved suggestions will be added to the active filter rule set.
          </p>

          {/* Candidate Tokens Chip Cloud */}
          {candidateTokens.length > 0 && (
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--ink)] block">
                Extracted candidate words (click to select):
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 border border-[var(--line)] rounded-lg bg-[var(--surface)]">
                {candidateTokens.map((tok) => {
                  const isSubmitted = submittedTerms.has(tok.toLowerCase());
                  const isSelected = term.toLowerCase() === tok.toLowerCase();
                  return (
                    <button
                      key={tok}
                      type="button"
                      onClick={() => handleSelectToken(tok)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                        isSubmitted
                          ? "bg-green-100 text-green-800 border border-green-300"
                          : isSelected
                          ? "bg-[var(--ink)] text-[var(--bg)] font-semibold"
                          : "bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--ink-muted)]"
                      }`}
                    >
                      {isSubmitted && <Check size={12} strokeWidth={2} aria-hidden="true" />}
                      <span>{tok}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-[var(--line)]">
            <div>
              <label htmlFor="suggest-term-input" className="font-semibold text-[var(--ink)] block mb-1">
                Candidate Term
              </label>
              <input
                id="suggest-term-input"
                type="text"
                value={term}
                onChange={handleTermChange}
                placeholder="e.g. offensive word or phrase"
                className="w-full px-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="suggest-lang-select" className="font-semibold text-[var(--ink)] block mb-1">
                  Language
                </label>
                <select
                  id="suggest-lang-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[var(--line)] rounded-lg bg-[var(--bg)] text-[var(--ink)]"
                >
                  <option value="th">Thai (th)</option>
                  <option value="en">English (en)</option>
                </select>
              </div>

              <div>
                <label htmlFor="suggest-sev-select" className="font-semibold text-[var(--ink)] block mb-1">
                  Proposed Severity
                </label>
                <select
                  id="suggest-sev-select"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[var(--line)] rounded-lg bg-[var(--bg)] text-[var(--ink)]"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isPending || !term.trim()}
              >
                <Plus size={14} strokeWidth={2} aria-hidden="true" className="mr-1" />
                Submit Suggestion
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </>
  );
}
