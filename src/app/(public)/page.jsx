import Link from "next/link";
import { getFeedPosts } from "@/server/dal/posts";
import { getSuggestedProfiles } from "@/server/dal/profiles";
import { getTrendingTags } from "@/server/dal/tags";
import { getSession } from "@/server/auth";
import { FeedList } from "@/components/feed/FeedList";
import { Avatar } from "@/components/ui/avatar";
import { Hash } from "lucide-react";

export const revalidate = 0; // Dynamic feed

export default async function HomeFeedPage({ searchParams }) {
  const resolvedParams = await searchParams;
  const filter = resolvedParams?.filter === "following" ? "following" : "latest";

  const session = await getSession();
  const viewerId = session?.user?.id || null;

  const [feedData, suggestedUsers, trendingTags] = await Promise.all([
    getFeedPosts({
      cursor: null,
      limit: 10,
      viewerId,
      filter,
    }),
    getSuggestedProfiles(viewerId, 5),
    getTrendingTags(6),
  ]);

  return (
    <div className="flex justify-center gap-8 px-0 sm:px-4 py-0 sm:py-6">
      {/* Main Feed Column (Max 470px) */}
      <div className="w-full max-w-[470px] shrink-0">
        {/* Feed Filter Tabs (when authenticated) */}
        {session && (
          <div className="flex border-b border-[var(--line)] bg-[var(--bg)] mb-2 sticky top-14 md:top-0 z-10">
            <Link
              href="/"
              className={`flex-1 py-3 text-center text-sm font-semibold transition-colors ${
                filter === "latest"
                  ? "text-[var(--ink)] border-b-2 border-[var(--ink)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              Latest News
            </Link>
            <Link
              href="/?filter=following"
              className={`flex-1 py-3 text-center text-sm font-semibold transition-colors ${
                filter === "following"
                  ? "text-[var(--ink)] border-b-2 border-[var(--ink)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              Following
            </Link>
          </div>
        )}

        <FeedList
          key={filter}
          initialPosts={feedData.posts}
          initialCursor={feedData.nextCursor}
          filter={filter}
          currentUserId={viewerId}
        />
      </div>

      {/* Right Rail (Visible on >= lg / 1024px) */}
      <aside className="hidden lg:flex flex-col w-[300px] shrink-0 gap-6 select-none pt-4">
        {/* Current User Mini Profile or Guest CTA */}
        {session ? (
          <div className="flex items-center justify-between">
            <Link href={`/u/${session.profile.username}`} className="flex items-center gap-3 min-w-0">
              <Avatar
                src={session.profile.avatar_url}
                name={session.profile.display_name || session.profile.username}
                size={44}
              />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm text-[var(--ink)] truncate">
                  {session.profile.username}
                </span>
                <span className="text-xs text-[var(--ink-muted)] truncate">
                  {session.profile.display_name}
                </span>
              </div>
            </Link>
            <Link
              href="/settings"
              className="text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              Settings
            </Link>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-center">
            <p className="text-sm font-semibold text-[var(--ink)] mb-1">
              Join SocialNews
            </p>
            <p className="text-xs text-[var(--ink-muted)] mb-3">
              Sign in to interact, publish stories, and follow trusted reporters.
            </p>
            <div className="flex gap-2 justify-center">
              <Link
                href="/sign-in"
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[var(--ink)] text-white hover:opacity-90 transition-opacity"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] hover:bg-[var(--surface-strong)] transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}

        {/* Suggested Accounts */}
        {suggestedUsers.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
                Suggested for you
              </span>
              <Link href="/explore" className="text-xs font-semibold text-[var(--ink)] hover:underline">
                See all
              </Link>
            </div>
            <div className="space-y-3">
              {suggestedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-2">
                  <Link href={`/u/${user.username}`} className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      src={user.avatar_url}
                      name={user.display_name || user.username}
                      size={32}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-[var(--ink)] truncate">
                        {user.username}
                      </span>
                      <span className="text-[11px] text-[var(--ink-muted)] truncate">
                        {user.followers_count || 0} followers
                      </span>
                    </div>
                  </Link>
                  <Link
                    href={`/u/${user.username}`}
                    className="text-xs font-semibold text-[var(--accent)] hover:underline shrink-0"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Tags */}
        {trendingTags.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
              Trending Topics
            </span>
            <div className="flex flex-wrap gap-1.5">
              {trendingTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.name}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--surface-strong)] transition-colors"
                >
                  <Hash size={12} strokeWidth={2} aria-hidden="true" className="text-[var(--ink-muted)]" />
                  <span>{tag.name}</span>
                  <span className="text-[10px] text-[var(--ink-muted)] tabular-nums">
                    ({tag.posts_count})
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="text-[11px] text-[var(--ink-muted)] space-y-1">
          <p>SocialNews &copy; {new Date().getFullYear()}</p>
          <p>A social format web application for news and content.</p>
        </div>
      </aside>
    </div>
  );
}
