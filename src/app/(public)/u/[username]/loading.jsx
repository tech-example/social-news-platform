import { ProfileHeaderSkeleton, ProfileGridSkeleton } from "@/components/ui/skeletons";

export default function ProfileLoading() {
  return (
    <div className="max-w-[935px] mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-8">
      <ProfileHeaderSkeleton />
      <section className="bg-[var(--bg)] border border-[var(--line)] rounded-2xl overflow-hidden shadow-xs">
        <ProfileGridSkeleton count={9} />
      </section>
    </div>
  );
}
