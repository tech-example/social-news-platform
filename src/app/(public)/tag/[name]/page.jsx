import { Suspense } from "react";
import Link from "next/link";
import { createUserClient } from "@/server/supabase";
import { getPostsByTag } from "@/server/dal/posts";
import { getPopularTags } from "@/server/dal/tags";
import { getSession } from "@/server/auth";
import { FeedList } from "@/components/feed/FeedList";
import { FeedSkeleton, TagChipsSkeleton } from "@/components/ui/skeletons";
import { TagChip } from "@/components/feed/TagChip";
import { SearchInput } from "@/app/(public)/search/SearchInput";
import { Hash, ChevronLeft, SearchX, Inbox } from "lucide-react";
import { formatCompactNumber } from "@/lib/format";

export async function generateMetadata({ params }) {
  const { name } = await params;
  const decoded = decodeURIComponent(name || "").replace(/^#/, "");
  return {
    title: `#${decoded} - SocialNews`,
    description: `Browse latest news and posts tagged with #${decoded}.`,
  };
}

async function PopularTagsRow({ currentTag = "" }) {
  const tags = await getPopularTags(12, currentTag);
  if (!tags || tags.length === 0) return null;

  return (
    <div className="space-y-1.5 pt-1">
      <span className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
        Popular Tags
      </span>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <TagChip key={t.id} name={t.name} postsCount={t.posts_count} />
        ))}
      </div>
    </div>
  );
}

async function TagFeedStream({ tagName, viewerId }) {
  const { posts, nextCursor } = await getPostsByTag(tagName, null, 10, viewerId);

  if (posts.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
        <Inbox size={40} strokeWidth={1.5} className="text-[var(--ink-muted)]" aria-hidden="true" />
        <p className="text-sm text-[var(--ink-muted)]">
          No published posts found for #{tagName} yet.
        </p>
      </div>
    );
  }

  return (
    <FeedList
      initialPosts={posts}
      initialCursor={nextCursor}
      tag={tagName}
      currentUserId={viewerId}
      emptyTitle={`No posts for #${tagName}`}
      emptyDescription={`Be the first to publish a post tagged with #${tagName}.`}
    />
  );
}

export default async function TagFeedPage({ params }) {
  const { name } = await params;
  const clean = decodeURIComponent(name || "").trim().toLowerCase().replace(/^#/, "");

  const session = await getSession();
  const viewerId = session?.user?.id || null;

  const supabase = await createUserClient();
  const { data: tag } = await supabase
    .from("tags")
    .select("id, name, posts_count")
    .ilike("name", clean)
    .maybeSingle();

  if (!tag) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-4 sm:py-6 space-y-6">
        {/* Back link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] rounded"
          >
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            <span>Back to feed</span>
          </Link>
        </div>

        {/* Search bar & Popular tags */}
        <div className="space-y-3">
          <SearchInput initialQuery={`#${clean}`} initialType="tags" />
          <Suspense fallback={<TagChipsSkeleton count={6} standalone={true} />}>
            <PopularTagsRow currentTag={clean} />
          </Suspense>
        </div>

        {/* Empty state: No fake posts */}
        <div className="py-12 flex flex-col items-center justify-center text-center gap-2 border-t border-[var(--line)]">
          <SearchX size={44} strokeWidth={1.5} className="text-[var(--ink-muted)]" aria-hidden="true" />
          <h1 className="text-lg font-bold text-[var(--ink)]">Tag not found</h1>
          <p className="text-sm text-[var(--ink-muted)] max-w-sm">
            No posts or tags matching &ldquo;#{clean}&rdquo; were found. Try searching for other news topics or browse popular tags above.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto px-4 py-4 sm:py-6 space-y-5">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] rounded"
        >
          <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          <span>Back to feed</span>
        </Link>
      </div>

      {/* Search bar & Popular tags */}
      <div className="space-y-3">
        <SearchInput initialQuery="" initialType="tags" />
        <Suspense fallback={<TagChipsSkeleton count={6} standalone={true} />}>
          <PopularTagsRow currentTag={tag.name} />
        </Suspense>
      </div>

      {/* Tag Heading */}
      <header className="flex items-center gap-3.5 pb-4 border-b border-[var(--line)]">
        <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[var(--surface-strong)] border border-[var(--line)] text-[var(--ink)] shrink-0">
          <Hash size={24} strokeWidth={2} aria-hidden="true" />
        </div>
        <div className="flex flex-col min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)] flex items-center gap-1 truncate">
            <span>#{tag.name}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--ink-muted)]">
            <span className="font-semibold tabular-nums">{formatCompactNumber(tag.posts_count || 0)}</span>{" "}
            {tag.posts_count === 1 ? "post" : "posts"}
          </p>
        </div>
      </header>

      {/* Tag Feed Stream wrapped in Suspense */}
      <Suspense fallback={<FeedSkeleton count={3} standalone={true} />}>
        <TagFeedStream tagName={tag.name} viewerId={viewerId} />
      </Suspense>
    </div>
  );
}
