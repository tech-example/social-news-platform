import { Suspense } from "react";
import Link from "next/link";
import { searchProfiles } from "@/server/dal/profiles";
import { searchTags, getPopularTags } from "@/server/dal/tags";
import { searchPosts } from "@/server/dal/posts";
import { Avatar } from "@/components/ui/avatar";
import { SearchInput } from "./SearchInput";
import { TagChip } from "@/components/feed/TagChip";
import { Skeleton, TagChipsSkeleton } from "@/components/ui/skeletons";
import { Hash, Heart, MessageCircle, SearchX } from "lucide-react";
import { formatCompactNumber, formatRelativeTime } from "@/lib/format";

export const metadata = {
  title: "Search - SocialNews",
  description: "Search news articles, accounts, and tags on SocialNews.",
};

function PopularTagsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading popular tags..." className="space-y-3 py-2">
      <Skeleton className="h-3.5 w-24" />
      <TagChipsSkeleton count={10} standalone={false} />
    </div>
  );
}

async function PopularTagsSection() {
  const popularTags = await getPopularTags(20);

  if (!popularTags || popularTags.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-[var(--ink-muted)]">
        Search for news keywords, topics, usernames, or hashtags.
      </div>
    );
  }

  return (
    <section aria-label="Popular tags" className="space-y-3 py-2">
      <h2 className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
        Popular Tags
      </h2>
      <div className="flex flex-wrap gap-2">
        {popularTags.map((tag) => (
          <TagChip key={tag.id} name={tag.name} postsCount={tag.posts_count} />
        ))}
      </div>
    </section>
  );
}

export default async function SearchPage({ searchParams }) {
  const resolvedParams = await searchParams;
  const rawQuery = resolvedParams?.q?.trim() || "";
  let type = resolvedParams?.type;

  // Auto-detect type if not explicitly set
  if (!type) {
    if (rawQuery.startsWith("#")) {
      type = "tags";
    } else if (rawQuery.startsWith("@")) {
      type = "accounts";
    } else {
      type = "posts";
    }
  }

  const query = rawQuery;
  let accounts = [];
  let tags = [];
  let posts = [];

  if (query) {
    if (type === "posts") {
      posts = await searchPosts(query, 20);
    } else if (type === "accounts") {
      accounts = await searchProfiles(query, 20);
    } else if (type === "tags") {
      tags = await searchTags(query, 20);
    }
  }

  return (
    <div className="max-w-[600px] mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-[var(--ink)] mb-4">Search</h1>

      {/* Search Input (Client Component) */}
      <SearchInput initialQuery={query} initialType={type} />

      {/* Search Type Tabs */}
      <div className="flex border-b border-[var(--line)] bg-[var(--bg)] mt-4 mb-6">
        <Link
          href={`/search?q=${encodeURIComponent(query)}&type=posts`}
          className={`flex-1 py-2.5 text-center text-xs font-semibold tracking-wider uppercase transition-colors ${
            type === "posts"
              ? "text-[var(--ink)] border-b-2 border-[var(--ink)]"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          Posts
        </Link>
        <Link
          href={`/search?q=${encodeURIComponent(query)}&type=accounts`}
          className={`flex-1 py-2.5 text-center text-xs font-semibold tracking-wider uppercase transition-colors ${
            type === "accounts"
              ? "text-[var(--ink)] border-b-2 border-[var(--ink)]"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          Accounts
        </Link>
        <Link
          href={`/search?q=${encodeURIComponent(query)}&type=tags`}
          className={`flex-1 py-2.5 text-center text-xs font-semibold tracking-wider uppercase transition-colors ${
            type === "tags"
              ? "text-[var(--ink)] border-b-2 border-[var(--ink)]"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          Tags
        </Link>
      </div>

      {/* Results or Popular Tags */}
      {!query ? (
        <Suspense fallback={<PopularTagsSkeleton />}>
          <PopularTagsSection />
        </Suspense>
      ) : (
        <div className="space-y-3">
          {type === "posts" && (
            posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <SearchX size={36} strokeWidth={1.5} className="text-[var(--ink-muted)]" aria-hidden="true" />
                <p className="text-sm text-[var(--ink-muted)]">No posts found matching &ldquo;{query}&rdquo;.</p>
              </div>
            ) : (
              posts.map((p) => {
                const likes = p.likesCount ?? p.likes_count ?? 0;
                const comments = p.commentsCount ?? p.comments_count ?? 0;
                const authorName = p.author?.display_name || p.author?.username || "Unknown";
                const username = p.author?.username || "user";
                const avatarUrl = p.author?.avatar_url;
                const time = p.createdAt ? formatRelativeTime(p.createdAt) : "";

                return (
                  <Link
                    key={p.id}
                    href={`/p/${p.id}`}
                    className="flex flex-col p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)] hover:shadow-xs transition-all gap-2"
                  >
                    <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar src={avatarUrl} name={authorName} size={24} />
                        <span className="font-semibold text-[var(--ink)] truncate">@{username}</span>
                        {time && (
                          <>
                            <span>&bull;</span>
                            <span>{time}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="flex items-center gap-1">
                          <Heart size={13} strokeWidth={1.75} className="text-[var(--ink-muted)]" aria-hidden="true" />
                          <span>{formatCompactNumber(likes)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={13} strokeWidth={1.75} className="text-[var(--ink-muted)]" aria-hidden="true" />
                          <span>{formatCompactNumber(comments)}</span>
                        </span>
                      </div>
                    </div>
                    {p.title && (
                      <h2 className="text-sm font-semibold text-[var(--ink)] line-clamp-1">
                        {p.title}
                      </h2>
                    )}
                    <p className="text-xs text-[var(--ink-muted)] line-clamp-2 leading-relaxed">
                      {p.body}
                    </p>
                  </Link>
                );
              })
            )
          )}

          {type === "accounts" && (
            accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <SearchX size={36} strokeWidth={1.5} className="text-[var(--ink-muted)]" aria-hidden="true" />
                <p className="text-sm text-[var(--ink-muted)]">No accounts found for &ldquo;{query}&rdquo;.</p>
              </div>
            ) : (
              accounts.map((user) => (
                <Link
                  key={user.id}
                  href={`/u/${user.username}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-[var(--line)] hover:bg-[var(--surface)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={user.avatar_url}
                      name={user.display_name || user.username}
                      size={40}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-[var(--ink)] truncate">
                        {user.username}
                      </span>
                      <span className="text-xs text-[var(--ink-muted)] truncate">
                        {user.display_name}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--ink-muted)] tabular-nums shrink-0">
                    {formatCompactNumber(user.followers_count || 0)} followers
                  </span>
                </Link>
              ))
            )
          )}

          {type === "tags" && (
            tags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <SearchX size={36} strokeWidth={1.5} className="text-[var(--ink-muted)]" aria-hidden="true" />
                <p className="text-sm text-[var(--ink-muted)]">No tags found for &ldquo;{query}&rdquo;.</p>
              </div>
            ) : (
              tags.map((t) => (
                <Link
                  key={t.id}
                  href={`/tag/${encodeURIComponent(t.name.toLowerCase())}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-[var(--line)] hover:bg-[var(--surface)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-strong)] text-[var(--ink)]">
                      <Hash size={20} strokeWidth={2} aria-hidden="true" />
                    </div>
                    <span className="text-sm font-semibold text-[var(--ink)]">
                      #{t.name}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--ink-muted)] tabular-nums">
                    {formatCompactNumber(t.posts_count || 0)} posts
                  </span>
                </Link>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}
