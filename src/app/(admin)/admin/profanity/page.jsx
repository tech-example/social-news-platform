import { requireRole } from "@/server/auth";
import { getProfanityTermsAction, getProfanitySuggestionsAction } from "@/server/actions/profanity";
import { ProfanityAdminClient } from "./ProfanityAdminClient";

export const metadata = {
  title: "Profanity Filter Management - Admin",
  description: "Manage dynamic blocked and allowed terms, review moderator suggestions, and re-scan content",
};

export default async function ProfanityAdminPage({ searchParams }) {
  await requireRole("admin");
  const resolvedParams = await searchParams;

  const page = parseInt(resolvedParams?.page || "1", 10);
  const search = resolvedParams?.search || "";
  const language = resolvedParams?.language || "all";
  const severity = resolvedParams?.severity || "all";
  const kind = resolvedParams?.kind || "all";
  const active = resolvedParams?.active || "all";

  const [termsRes, suggestionsRes] = await Promise.all([
    getProfanityTermsAction({
      page,
      limit: 25,
      search,
      language,
      severity,
      kind,
      active,
    }),
    getProfanitySuggestionsAction(),
  ]);

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6 space-y-6">
      <div className="pb-4 border-b border-[var(--line)]">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
          Profanity & Offensive Language Filter
        </h1>
        <p className="text-xs text-[var(--ink-muted)]">
          Manage dynamic blocked and allowed terms, review moderator suggestions, and re-scan existing content
        </p>
      </div>

      <ProfanityAdminClient
        initialTermsRes={termsRes}
        initialSuggestions={suggestionsRes?.suggestions || []}
        filters={{ page, search, language, severity, kind, active }}
      />
    </div>
  );
}
