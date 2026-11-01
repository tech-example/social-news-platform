import Link from "next/link";
import { ShieldCheck, ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy - SocialNews",
  description: "Privacy policy and analytics disclosure for SocialNews.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 py-8 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] rounded"
      >
        <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
        <span>Back to Home</span>
      </Link>

      <div className="p-6 rounded-2xl border border-[var(--line)] bg-[var(--bg)] shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--line)]">
          <div className="p-2.5 rounded-xl bg-[var(--surface-strong)] text-[var(--accent)]">
            <ShieldCheck size={28} strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--ink)]">Privacy Policy</h1>
            <p className="text-xs text-[var(--ink-muted)]">Last updated: November 2026</p>
          </div>
        </div>

        <section className="space-y-3 text-sm text-[var(--ink)] leading-relaxed">
          <h2 className="text-base font-semibold text-[var(--ink)]">1. Aggregate Analytics & Zero Individual Profiling</h2>
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs space-y-2">
            <p className="font-semibold text-[var(--ink)]">
              Aggregate analytics only, no advertising profile of individuals.
            </p>
            <p className="text-[var(--ink-muted)]">
              SocialNews gathers strictly aggregate metrics (such as daily active user trends, engagement volume, and platform health ratios) to evaluate system stability and content resonance. We do not track individual reading behavior across the web, build advertising profiles on specific users, or sell personal identifiers to advertisers or data brokers.
            </p>
          </div>
        </section>

        <section className="space-y-3 text-sm text-[var(--ink)] leading-relaxed">
          <h2 className="text-base font-semibold text-[var(--ink)]">2. Privacy-Safe View Tracking</h2>
          <p className="text-xs text-[var(--ink-muted)]">
            When posts are viewed, our server records anonymous, bucketed view increments to calculate community reach. For guest visitors without an account, views are attributed using an ephemeral, daily-rotating salted hash. We never store raw IP addresses, device fingerprints, or tracking cookies for guest analytics. Views from post authors on their own posts are strictly discarded.
          </p>
        </section>

        <section className="space-y-3 text-sm text-[var(--ink)] leading-relaxed">
          <h2 className="text-base font-semibold text-[var(--ink)]">3. Data Retention and Control</h2>
          <p className="text-xs text-[var(--ink-muted)]">
            Aggregated post view logs automatically age out and are pruned after 400 days. You maintain full ownership of your account data and can update your profile or delete your content at any time via your account settings.
          </p>
        </section>
      </div>
    </div>
  );
}
