"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/server/auth";
import { getAdminClient } from "@/server/admin-client";
import { invalidateProfanityCache } from "@/lib/profanity/db-layer";
import { analyzeText } from "@/lib/profanity";

const termSchema = z.object({
  term: z.string().trim().min(1, "Term cannot be empty").max(100, "Term cannot exceed 100 characters"),
  language: z.enum(["th", "en", "th_romanized", "other"]),
  severity: z.enum(["mild", "moderate", "severe"]),
  kind: z.enum(["block", "allow"]).default("block"),
  is_active: z.boolean().default(true),
});

/**
 * Fetch paginated and filtered profanity terms for the admin table.
 */
export async function getProfanityTermsAction({
  page = 1,
  limit = 20,
  search = "",
  language = "all",
  severity = "all",
  kind = "all",
  active = "all",
} = {}) {
  await requireRole("admin");
  const supabase = getAdminClient();

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(5, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;

  let query = supabase
    .from("profanity_terms")
    .select("id, term, language, severity, kind, is_active, created_at, created_by", { count: "exact" });

  if (search && search.trim()) {
    query = query.ilike("term", `%${search.trim()}%`);
  }
  if (language && language !== "all") {
    query = query.eq("language", language);
  }
  if (severity && severity !== "all") {
    query = query.eq("severity", severity);
  }
  if (kind && kind !== "all") {
    query = query.eq("kind", kind);
  }
  if (active && active !== "all") {
    query = query.eq("is_active", active === "active");
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + safeLimit - 1);

  const { data, count, error } = await query;

  if (error) {
    if (error.code === "42P01") {
      return { ok: true, terms: [], total: 0, totalPages: 0, page: 1 };
    }
    console.error("Error fetching profanity terms:", error);
    return { ok: false, error: error.message || "Failed to load terms." };
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / safeLimit);

  return {
    ok: true,
    terms: data || [],
    total,
    totalPages,
    page: safePage,
  };
}

/**
 * Add a new term to the block or allow list.
 */
export async function addProfanityTermAction(termData) {
  const session = await requireRole("admin");
  const parsed = termSchema.safeParse(termData);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid term data." };
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("profanity_terms")
    .insert({
      term: parsed.data.term.toLowerCase(),
      language: parsed.data.language,
      severity: parsed.data.severity,
      kind: parsed.data.kind,
      is_active: parsed.data.is_active,
      created_by: session.user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "This term already exists for this language and list type." };
    }
    return { ok: false, error: error.message || "Failed to add term." };
  }

  invalidateProfanityCache();

  await supabase.from("audit_logs").insert({
    actor_id: session.user.id,
    action: "add_profanity_term",
    entity: "profanity_term",
    entity_id: data.id,
    metadata: { term: data.term, language: data.language, kind: data.kind, severity: data.severity },
  });

  revalidatePath("/admin/profanity");
  return { ok: true, term: data };
}

/**
 * Update an existing profanity term.
 */
export async function updateProfanityTermAction(id, termData) {
  const session = await requireRole("admin");
  const parsed = termSchema.safeParse(termData);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid term data." };
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("profanity_terms")
    .update({
      term: parsed.data.term.toLowerCase(),
      language: parsed.data.language,
      severity: parsed.data.severity,
      kind: parsed.data.kind,
      is_active: parsed.data.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message || "Failed to update term." };
  }

  invalidateProfanityCache();

  await supabase.from("audit_logs").insert({
    actor_id: session.user.id,
    action: "update_profanity_term",
    entity: "profanity_term",
    entity_id: id,
    metadata: parsed.data,
  });

  revalidatePath("/admin/profanity");
  return { ok: true };
}

/**
 * Delete a profanity term.
 */
export async function deleteProfanityTermAction(id) {
  const session = await requireRole("admin");
  if (!id) return { ok: false, error: "Invalid ID." };

  const supabase = getAdminClient();
  const { error } = await supabase.from("profanity_terms").delete().eq("id", id);

  if (error) {
    return { ok: false, error: error.message || "Failed to delete term." };
  }

  invalidateProfanityCache();

  await supabase.from("audit_logs").insert({
    actor_id: session.user.id,
    action: "delete_profanity_term",
    entity: "profanity_term",
    entity_id: id,
    metadata: { deletedId: id },
  });

  revalidatePath("/admin/profanity");
  return { ok: true };
}

/**
 * Bulk import terms from a pasted list (max 500 lines).
 */
export async function bulkImportProfanityTermsAction(rawText, { language = "en", severity = "moderate", kind = "block" } = {}) {
  const session = await requireRole("admin");
  if (!rawText || typeof rawText !== "string") {
    return { ok: false, error: "Please paste a list of terms." };
  }

  const rawLines = rawText.split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter(Boolean);
  if (rawLines.length === 0) {
    return { ok: false, error: "No valid terms found in input." };
  }

  if (rawLines.length > 500) {
    return { ok: false, error: "Bulk import exceeds maximum limit of 500 terms per batch." };
  }

  // Deduplicate within the input batch
  const uniqueTerms = Array.from(new Set(rawLines));

  const rowsToInsert = uniqueTerms.map((term) => ({
    term: term.slice(0, 100),
    language,
    severity,
    kind,
    is_active: true,
    created_by: session.user.id,
  }));

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("profanity_terms")
    .upsert(rowsToInsert, { onConflict: "lower(term), kind, language", ignoreDuplicates: true })
    .select("id");

  if (error) {
    return { ok: false, error: error.message || "Bulk import failed." };
  }

  const importedCount = data ? data.length : rowsToInsert.length;
  const skippedCount = rowsToInsert.length - importedCount;

  invalidateProfanityCache();

  await supabase.from("audit_logs").insert({
    actor_id: session.user.id,
    action: "bulk_import_profanity_terms",
    entity: "profanity_term",
    metadata: { totalProvided: uniqueTerms.length, importedCount, skippedCount, language, kind, severity },
  });

  revalidatePath("/admin/profanity");
  return { ok: true, importedCount, skippedCount };
}

/**
 * Export all terms as CSV format.
 */
export async function exportProfanityTermsAction() {
  await requireRole("admin");
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("profanity_terms")
    .select("id, term, language, severity, kind, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message || "Failed to export terms." };
  }

  const headers = ["id", "term", "language", "severity", "kind", "is_active", "created_at"];
  const rows = (data || []).map((row) => [
    row.id,
    `"${row.term.replace(/"/g, '""')}"`,
    row.language,
    row.severity,
    row.kind,
    row.is_active,
    row.created_at,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  return { ok: true, csvData: csvContent, count: rows.length };
}

/**
 * Fetch moderator suggestions pending admin review.
 */
export async function getProfanitySuggestionsAction() {
  await requireRole("admin");
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("profanity_term_suggestions")
    .select(`
      id, term, language, severity, source_report_id, status, created_at,
      suggested_by:profiles!profanity_term_suggestions_suggested_by_fkey(username, display_name)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return { ok: true, suggestions: [] };
    return { ok: false, error: error.message };
  }

  return { ok: true, suggestions: data || [] };
}

/**
 * Moderator action: Suggest candidate terms extracted from a reported post/comment.
 */
export async function suggestProfanityTermAction({ term, language = "th", severity = "moderate", sourceReportId = null }) {
  const session = await requireRole("moderator");
  const cleanTerm = (term || "").trim().toLowerCase();
  if (!cleanTerm) {
    return { ok: false, error: "Term cannot be empty." };
  }

  const supabase = getAdminClient();
  const { error } = await supabase.from("profanity_term_suggestions").insert({
    term: cleanTerm,
    language,
    severity,
    source_report_id: sourceReportId,
    suggested_by: session.user.id,
    status: "pending",
  });

  if (error) {
    return { ok: false, error: error.message || "Failed to submit suggestion." };
  }

  return { ok: true };
}

/**
 * Admin action: Approve a suggestion and add it to the active block list.
 */
export async function approveProfanitySuggestionAction(suggestionId, { language, severity, kind = "block" } = {}) {
  const session = await requireRole("admin");
  const supabase = getAdminClient();

  const { data: suggestion, error: sErr } = await supabase
    .from("profanity_term_suggestions")
    .select("id, term, language, severity")
    .eq("id", suggestionId)
    .single();

  if (sErr || !suggestion) {
    return { ok: false, error: "Suggestion not found." };
  }

  const finalLanguage = language || suggestion.language || "th";
  const finalSeverity = severity || suggestion.severity || "moderate";

  // Add to profanity_terms
  const { error: insertErr } = await supabase.from("profanity_terms").upsert({
    term: suggestion.term,
    language: finalLanguage,
    severity: finalSeverity,
    kind,
    is_active: true,
    created_by: session.user.id,
  }, { onConflict: "lower(term), kind, language" });

  if (insertErr) {
    return { ok: false, error: insertErr.message || "Failed to approve suggestion." };
  }

  // Update suggestion status
  await supabase
    .from("profanity_term_suggestions")
    .update({ status: "approved", reviewed_by: session.user.id, reviewed_at: new Date().toISOString() })
    .eq("id", suggestionId);

  invalidateProfanityCache();

  await supabase.from("audit_logs").insert({
    actor_id: session.user.id,
    action: "approve_profanity_suggestion",
    entity: "profanity_term_suggestion",
    entity_id: suggestionId,
    metadata: { term: suggestion.term, language: finalLanguage, severity: finalSeverity },
  });

  revalidatePath("/admin/profanity");
  return { ok: true };
}

/**
 * Admin action: Reject a moderator suggestion.
 */
export async function rejectProfanitySuggestionAction(suggestionId) {
  const session = await requireRole("admin");
  const supabase = getAdminClient();

  const { error } = await supabase
    .from("profanity_term_suggestions")
    .update({ status: "rejected", reviewed_by: session.user.id, reviewed_at: new Date().toISOString() })
    .eq("id", suggestionId);

  if (error) {
    return { ok: false, error: error.message || "Failed to reject suggestion." };
  }

  await supabase.from("audit_logs").insert({
    actor_id: session.user.id,
    action: "reject_profanity_suggestion",
    entity: "profanity_term_suggestion",
    entity_id: suggestionId,
  });

  revalidatePath("/admin/profanity");
  return { ok: true };
}

/**
 * Admin action: Re-scan existing content in batches.
 * Scans posts and comments, updating is_flagged and flagged_reason.
 */
export async function rescanContentBatchAction({ targetType = "posts", cursor = null, batchSize = 100 } = {}) {
  const session = await requireRole("admin");
  const supabase = getAdminClient();

  const table = targetType === "comments" ? "comments" : "posts";
  let query = supabase
    .from(table)
    .select("id, created_at, title, body, is_flagged, flagged_reason")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(batchSize);

  if (cursor && cursor.created_at && cursor.id) {
    query = query.or(`created_at.gt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`);
  }

  const { data: rows, error } = await query;
  if (error) {
    return { ok: false, error: error.message || `Failed to fetch ${table} batch.` };
  }

  if (!rows || rows.length === 0) {
    return {
      ok: true,
      processed: 0,
      flagged: 0,
      nextCursor: null,
      isComplete: true,
      targetType,
    };
  }

  let flaggedCount = 0;
  for (const item of rows) {
    const textToScan = table === "posts" ? `${item.title || ""} ${item.body || ""}` : (item.body || "");
    const scanResult = await analyzeText(textToScan);

    const shouldBeFlagged = scanResult.flagged;
    const newReason = shouldBeFlagged ? "profanity" : null;

    if (item.is_flagged !== shouldBeFlagged || item.flagged_reason !== newReason) {
      await supabase
        .from(table)
        .update({
          is_flagged: shouldBeFlagged,
          flagged_reason: newReason,
        })
        .eq("id", item.id);
    }

    if (shouldBeFlagged) flaggedCount++;
  }

  const lastItem = rows[rows.length - 1];
  const nextCursor = { created_at: lastItem.created_at, id: lastItem.id };
  const isComplete = rows.length < batchSize;

  await supabase.from("audit_logs").insert({
    actor_id: session.user.id,
    action: "rescan_profanity_batch",
    entity: table,
    metadata: { batchSize: rows.length, flaggedCount, isComplete },
  });

  return {
    ok: true,
    processed: rows.length,
    flagged: flaggedCount,
    nextCursor: isComplete ? null : nextCursor,
    isComplete,
    targetType,
  };
}
