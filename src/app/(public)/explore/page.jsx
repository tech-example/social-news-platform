import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { getExplorePosts } from "@/server/dal/posts";
import { getSession } from "@/server/auth";
import { ProfileGridSkeleton } from "@/components/ui/skeletons";
import { FlaggedContent } from "@/components/feed/FlaggedContent";
import { Heart, MessageCircle, FileText } from "lucide-react";
import { formatCompactNumber } from "@/lib/format";

export const metadata = {
  title: "Explore - SocialNews",
  description: "Discover trending stories, top engaging posts, and breaking news.",
};

async function ExploreGrid({ viewerId, isStaff = false, viewerHideFlagged = true }) {
  const posts = await getExplorePosts({ limit: 24 });

  if (posts.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-[var(--ink-muted)]">
        No posts available to explore yet. Be the first to share!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-4">
      {posts.map((post) => {
        const isAuthor = Boolean(viewerId && (viewerId === post.author?.id || viewerId === post.author_id));
        const defaultHidden = (isAuthor || isStaff) ? false : viewerHideFlagged;

        return (
          <div
            key={post.id}
            className="grid-card-contain group relative aspect-square bg-[var(--surface)] border border-[var(--line)] overflow-hidden rounded sm:rounded-md"
          >
            {post.imageUrl ? (
              <Link
                href={`/p/${post.id}`}
                className="relative block w-full h-full focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
              >
                <Image
                  src={post.imageUrl}
                  alt={post.title || "Post thumbnail"}
                  fill
                  sizes="(min-width: 768px) 300px, 33vw"
                  className="object-cover transition-transform duration-200 group-hover:scale-105"
                  unoptimized
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 sm:gap-6 text-white font-semibold text-xs sm:text-sm pointer-events-none">
                  <span className="flex items-center gap-1.5">
                    <Heart size={18} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
                    <span className="tabular-nums">{formatCompactNumber(post.likesCount || 0)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle size={18} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
                    <span className="tabular-nums">{formatCompactNumber(post.commentsCount || 0)}</span>
                  </span>
                </div>
              </Link>
            ) : (
              <div className="p-2 sm:p-3 h-full flex flex-col justify-center bg-[var(--surface)] text-[var(--ink)]">
                <FlaggedContent
                  key={`explore-text-${post.id}`}
                  isFlagged={Boolean(post.is_flagged)}
                  defaultHidden={defaultHidden}
                  className="w-full h-full flex flex-col justify-center"
                >
                  <Link
                    href={`/p/${post.id}`}
                    className="h-full flex flex-col justify-between group/link focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
                  >
                    <FileText size={18} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)] shrink-0" />
                    <p className="text-xs sm:text-sm line-clamp-3 font-medium group-hover/link:underline">
                      {post.title || post.body}
                    </p>
                  </Link>
                </FlaggedContent>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default async function ExplorePage() {
  const session = await getSession();
  const viewerId = session?.user?.id || null;
  const isStaff = session?.profile?.role === "moderator" || session?.profile?.role === "admin";
  const viewerHideFlagged = session?.profile?.hide_flagged_content ?? true;

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--ink)]">Explore</h1>
        <p className="text-xs text-[var(--ink-muted)] mt-1">
          Top stories and posts trending across the platform
        </p>
      </div>

      <Suspense fallback={<ProfileGridSkeleton count={9} />}>
        <ExploreGrid
          viewerId={viewerId}
          isStaff={isStaff}
          viewerHideFlagged={viewerHideFlagged}
        />
      </Suspense>
    </div>
  );
}
