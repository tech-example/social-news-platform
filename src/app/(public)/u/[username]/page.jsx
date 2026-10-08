import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getProfileByUsername } from "@/server/dal/profiles";
import { getUserPosts } from "@/server/dal/posts";
import { getSession } from "@/server/auth";
import { ProfileHeaderClient } from "./ProfileHeaderClient";
import { DeleteShareButton } from "@/components/profile/DeleteShareButton";
import { ProfileGridSkeleton } from "@/components/ui/skeletons";
import { FlaggedContent } from "@/components/feed/FlaggedContent";
import { Grid3x3, Repeat2, Heart, MessageCircle, FileText, Inbox } from "lucide-react";
import { formatCompactNumber } from "@/lib/format";

export async function generateMetadata({ params }) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return { title: "User Not Found" };

  return {
    title: `${profile.display_name} (@${profile.username}) - SocialNews`,
    description: profile.bio || `Check out ${profile.display_name}'s profile on SocialNews.`,
  };
}

async function UserPostsStream({ userId, tab, isViewer, viewerId, isStaff = false, viewerHideFlagged = true }) {
  const { posts } = await getUserPosts({
    userId,
    tab,
    limit: 24,
  });

  if (posts.length === 0) {
    return (
      <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-[var(--ink-muted)]">
        <Inbox size={32} strokeWidth={1.5} className="opacity-40 mb-1" />
        <p className="text-sm font-medium text-[var(--ink)]">
          {tab === "shares" ? "No shared posts yet" : "No posts published yet"}
        </p>
        <p className="text-xs max-w-xs">
          {tab === "shares"
            ? "Posts shared by this creator will appear here."
            : "When this creator publishes news or articles, they will show up here."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
      {posts.map((post) => {
        const isAuthor = Boolean(viewerId && (viewerId === post.author?.id || viewerId === post.author_id || viewerId === userId));
        const defaultHidden = (isAuthor || isStaff) ? false : (viewerHideFlagged !== false);

        return (
          <div key={post.shareId || post.id} className="grid-card-contain relative aspect-square">
            <div className="group relative block w-full h-full bg-[var(--surface)] border border-[var(--line)] overflow-hidden rounded-lg">
              {post.imageUrl ? (
                <FlaggedContent
                  key={`profile-img-${post.id}`}
                  isFlagged={Boolean(post.is_flagged)}
                  defaultHidden={defaultHidden}
                  className="w-full h-full"
                >
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

                    {/* Hover overlay with Like/Comment counters */}
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 sm:gap-6 text-white font-semibold text-xs sm:text-sm pointer-events-none">
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
                </FlaggedContent>
              ) : (
                <div className="p-2 sm:p-3 h-full flex flex-col justify-center bg-[var(--surface)] text-[var(--ink)]">
                  <FlaggedContent
                    key={`profile-text-${post.id}`}
                    isFlagged={Boolean(post.is_flagged)}
                    defaultHidden={defaultHidden}
                    className="w-full h-full flex flex-col justify-center"
                  >
                    <Link
                      href={`/p/${post.id}`}
                      className="h-full flex flex-col justify-between group/link focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
                    >
                      <FileText size={18} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)] shrink-0" />
                      <p className="text-xs sm:text-sm line-clamp-3 font-semibold leading-snug group-hover/link:underline">
                        {post.title || post.body}
                      </p>
                    </Link>
                  </FlaggedContent>
                </div>
              )}
            </div>

            {/* Allow deleting share if owner and on shares tab */}
            {tab === "shares" && isViewer && post.shareId && (
              <DeleteShareButton shareId={post.shareId} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default async function UserProfilePage({ params, searchParams }) {
  const { username } = await params;
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams?.tab === "shares" ? "shares" : "posts";

  const session = await getSession();
  const viewerId = session?.user?.id || null;
  const isStaff = session?.profile?.role === "moderator" || session?.profile?.role === "admin";
  const viewerHideFlagged = session?.profile?.hide_flagged_content !== false;

  const profile = await getProfileByUsername(username, viewerId);
  if (!profile) {
    notFound();
  }

  return (
    <div className="max-w-[935px] mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* 1. Profile Header Section with Edit Profile & Profile Details Popups */}
      <ProfileHeaderClient initialProfile={profile} viewerId={viewerId} />

      {/* 2. Distinct Posts Collection Section (Separated from Header/Popups) */}
      <section className="bg-[var(--bg)] border border-[var(--line)] rounded-2xl overflow-hidden shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--line)] bg-[var(--surface)] justify-center">
          <Link
            href={`/u/${profile.username}`}
            prefetch
            className={`flex items-center gap-2 py-3.5 px-6 text-xs sm:text-sm font-bold tracking-wider uppercase transition-colors ${
              tab === "posts"
                ? "text-[var(--ink)] border-b-2 border-[var(--ink)] bg-[var(--bg)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            <Grid3x3 size={16} strokeWidth={2} aria-hidden="true" />
            <span>Posts ({formatCompactNumber(profile.posts_count || 0)})</span>
          </Link>
          <Link
            href={`/u/${profile.username}?tab=shares`}
            prefetch
            className={`flex items-center gap-2 py-3.5 px-6 text-xs sm:text-sm font-bold tracking-wider uppercase transition-colors ${
              tab === "shares"
                ? "text-[var(--ink)] border-b-2 border-[var(--ink)] bg-[var(--bg)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            <Repeat2 size={16} strokeWidth={2} aria-hidden="true" />
            <span>Shares</span>
          </Link>
        </div>

        {/* Posts Grid Area */}
        <div className="p-3 sm:p-6">
          <Suspense key={tab} fallback={<ProfileGridSkeleton count={9} />}>
            <UserPostsStream
              userId={profile.id}
              tab={tab}
              isViewer={profile.isViewer}
              viewerId={viewerId}
              isStaff={isStaff}
              viewerHideFlagged={viewerHideFlagged}
            />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
