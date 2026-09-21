import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getProfileByUsername } from "@/server/dal/profiles";
import { getUserPosts } from "@/server/dal/posts";
import { getSession } from "@/server/auth";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "./FollowButton";
import { Grid3x3, Repeat2, Heart, MessageCircle, FileText } from "lucide-react";
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

export default async function UserProfilePage({ params, searchParams }) {
  const { username } = await params;
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams?.tab === "shares" ? "shares" : "posts";

  const session = await getSession();
  const viewerId = session?.user?.id || null;

  const profile = await getProfileByUsername(username, viewerId);
  if (!profile) {
    notFound();
  }

  const { posts } = await getUserPosts({
    userId: profile.id,
    tab,
    limit: 24,
  });

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6 sm:py-8">
      {/* Profile Header */}
      <header className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-12 pb-8 border-b border-[var(--line)]">
        {/* Avatar */}
        <div className="shrink-0">
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name || profile.username}
            size={110}
            className="w-24 h-24 sm:w-36 sm:h-36 ring-2 ring-[var(--line)]"
          />
        </div>

        {/* Profile Info */}
        <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left gap-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)] truncate">
              {profile.username}
            </h1>

            {profile.isViewer ? (
              <Link href="/settings">
                <Button variant="secondary" className="text-xs h-8 px-4">
                  Edit Profile
                </Button>
              </Link>
            ) : viewerId ? (
              <FollowButton targetUserId={profile.id} initialFollowing={profile.isFollowing} />
            ) : (
              <Link href="/sign-in">
                <Button variant="primary" className="text-xs h-8 px-4">
                  Follow
                </Button>
              </Link>
            )}
          </div>

          {/* Counts Row */}
          <div className="flex items-center gap-6 sm:gap-8 text-sm text-[var(--ink)]">
            <div>
              <strong className="tabular-nums">{formatCompactNumber(profile.posts_count || 0)}</strong>{" "}
              <span className="text-[var(--ink-muted)]">posts</span>
            </div>
            <div>
              <strong className="tabular-nums">{formatCompactNumber(profile.followers_count || 0)}</strong>{" "}
              <span className="text-[var(--ink-muted)]">followers</span>
            </div>
            <div>
              <strong className="tabular-nums">{formatCompactNumber(profile.following_count || 0)}</strong>{" "}
              <span className="text-[var(--ink-muted)]">following</span>
            </div>
          </div>

          {/* Bio & Details */}
          <div className="text-sm text-[var(--ink)] space-y-1 max-w-lg">
            <p className="font-semibold">{profile.display_name}</p>
            {profile.bio && (
              <p className="text-[var(--ink-muted)] whitespace-pre-wrap">{profile.bio}</p>
            )}
          </div>
        </div>
      </header>

      {/* Profile Tabs */}
      <div className="flex border-b border-[var(--line)] bg-[var(--bg)] justify-center">
        <Link
          href={`/u/${profile.username}`}
          className={`flex items-center gap-2 py-3 px-6 text-xs sm:text-sm font-semibold tracking-wider uppercase transition-colors ${
            tab === "posts"
              ? "text-[var(--ink)] border-b-2 border-[var(--ink)]"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          <Grid3x3 size={16} strokeWidth={2} aria-hidden="true" />
          <span>Posts</span>
        </Link>
        <Link
          href={`/u/${profile.username}?tab=shares`}
          className={`flex items-center gap-2 py-3 px-6 text-xs sm:text-sm font-semibold tracking-wider uppercase transition-colors ${
            tab === "shares"
              ? "text-[var(--ink)] border-b-2 border-[var(--ink)]"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          <Repeat2 size={16} strokeWidth={2} aria-hidden="true" />
          <span>Shares</span>
        </Link>
      </div>

      {/* 3-Column Square Grid */}
      <div className="mt-4">
        {posts.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--ink-muted)]">
            {tab === "shares" ? "No shared posts yet." : "No posts published yet."}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 sm:gap-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/p/${post.id}`}
                className="group relative aspect-square bg-[var(--surface)] border border-[var(--line)] overflow-hidden rounded sm:rounded-md focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
              >
                {post.imageUrl ? (
                  <Image
                    src={post.imageUrl}
                    alt={post.title || "Post thumbnail"}
                    fill
                    sizes="(min-width: 768px) 300px, 33vw"
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="p-3 sm:p-4 h-full flex flex-col justify-between bg-[var(--surface)] text-[var(--ink)]">
                    <FileText size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)]" />
                    <p className="text-xs sm:text-sm line-clamp-3 font-medium">
                      {post.title || post.body}
                    </p>
                  </div>
                )}

                {/* Hover overlay with Like/Comment counts */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 sm:gap-6 text-white font-semibold text-xs sm:text-sm">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
