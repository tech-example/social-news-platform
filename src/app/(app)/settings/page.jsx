import { requireRole } from "@/server/auth";
import { SettingsForm } from "./SettingsForm";

export const metadata = {
  title: "Settings - SocialNews",
};

export default async function SettingsPage() {
  const session = await requireRole("user");

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--ink)] mb-6">Settings</h1>
      <SettingsForm session={session} />
    </div>
  );
}
