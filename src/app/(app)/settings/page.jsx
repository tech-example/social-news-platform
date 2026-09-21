import { requireRole } from "@/server/auth";
import { SettingsForm } from "./SettingsForm";

export const metadata = {
  title: "Settings - SocialNews",
};

export default async function SettingsPage() {
  const session = await requireRole("user");

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--ink)]">Settings</h1>
        <a
          href={`/u/${session.profile.username}`}
          className="text-xs font-semibold text-[var(--accent)] hover:underline"
        >
          View My Profile →
        </a>
      </div>
      <SettingsForm session={session} />
    </div>
  );
}
