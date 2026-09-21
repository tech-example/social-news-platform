import Link from "next/link";
import { searchProfiles } from "@/server/dal/profiles";
import { searchTags } from "@/server/dal/tags";
import { searchPosts } from "@/server/dal/posts";
import { Avatar } from "@/components/ui/avatar";
import { SearchInput } from "./SearchInput";
import { Hash, User, FileText, SearchX } from "lucide-react";
import { formatCompactNumber } from "@/lib/format";

export const metadata = {
  title: "Search - SocialNews",
  description: "Search accounts, tags, and news articles on SocialNews.",
};

export default async function SearchPage({ searchParams }) {
  const resolvedParams = await searchParams;
  const query = resolvedParams?.q?.trim() || "";
  const type = resolvedParams?.type || "accounts";

  let accounts = [];
  let tags = [];
  let posts = [];

  if (query) {
    if (type === "accounts") {
      accounts = await searchProfiles(query, 20);
    } else if (type === "tags") {
      tags = await searchTags(query, 20);
    } else if (type === "posts") {
      posts = await searchPosts(query, 20);
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
      </div>

      {/* Results */}
      {!query ? (
        <div className="py-12 text-center text-sm text-[var(--ink-muted)]">
          Search for usernames, hashtags, or news topics.
        </div>
      ) : (
        <div className="space-y-3">
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
                  href={`/tag/${t.name}`}
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

          {type === "posts" && (
            posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <SearchX size={36} strokeWidth={1.5} className="text-[var(--ink-muted)]" aria-hidden="true" />
                <p className="text-sm text-[var(--ink-muted)]">No posts found matching &ldquo;{query}&rdquo;.</p>
              </div>
            ) : (
              posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/p/${p.id}`}
                  className="flex flex-col p-3 rounded-lg border border-[var(--line)] hover:bg-[var(--surface)] transition-colors gap-1.5"
                >
                  <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                    <span className="font-semibold text-[var(--ink)]">@{p.author?.username}</span>
                    <span>&bull;</span>
                    <span>{formatCompactNumber(p.likes_count || 0)} likes</span>
                  </div>
                  {p.title && (
                    <h3 className="text-sm font-semibold text-[var(--ink)] line-clamp-1">
                      {p.title}
                    </h3>
                  )}
                  <p className="text-xs text-[var(--ink)] line-clamp-2">
                    {p.body}
                  </p>
                </Link>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}
