import { requireRole } from "@/server/auth";
import { getFlaggedContentAction, getProfanitySuggestionsAction } from "@/server/actions/profanity";
import { ProfanityAdminClient } from "./ProfanityAdminClient";
import { getServerAdminT } from "@/lib/i18n/server";
import { AdminLanguageSwitcher } from "@/components/dashboard/AdminLanguageSwitcher";

export const metadata = {
  title: "Profanity Filter Management - Admin",
  description: "Review flagged content, review moderator suggestions, and re-scan content",
};

export default async function ProfanityAdminPage() {
  await requireRole("admin");
  const { t } = await getServerAdminT();

  const [flaggedRes, suggestionsRes] = await Promise.all([
    getFlaggedContentAction({
      type: "all",
      limit: 20,
    }),
    getProfanitySuggestionsAction(),
  ]);

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6 space-y-6">
      <div className="pb-4 border-b border-[var(--line)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
            {t("profanity.title")}
          </h1>
          <p className="text-xs text-[var(--ink-muted)]">
            {t("profanity.subtitle")}
          </p>
        </div>
        <div className="flex items-center self-end sm:self-auto">
          <AdminLanguageSwitcher />
        </div>
      </div>

      <ProfanityAdminClient
        initialFlaggedRes={flaggedRes?.ok ? flaggedRes : { items: [], nextCursor: null }}
        initialSuggestions={suggestionsRes?.suggestions || []}
      />
    </div>
  );
}
