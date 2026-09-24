import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTagPosts } from "@/server/dal/posts";
import { ProfileGridSkeleton } from "@/components/ui/skeletons";
import { Hash, ChevronLeft, Heart, MessageCircle, FileText } from "lucide-react";
import { formatCompactNumber } from "@/lib/format";

export async function generateMetadata({ params }) {
  const { name } = await params;
  return {
    title: `#${name} - SocialNews`,
    description: `Browse latest news and posts tagged with #${name}.`,
  };
}

async function TagPostsStream({ tagName }) {
  const { tag, posts } = await getTagPosts({ tagName, limit: 30 });

  if (!tag) {
    notFound();
  }

  if (posts.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-[var(--ink-muted)]">
        No posts with this hashtag yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-4">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/p/${post.id}`}
          className="grid-card-contain group relative aspect-square bg-[var(--surface)] border border-[var(--line)] overflow-hidden rounded sm:rounded-md focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
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
  );
}

export default async function TagFeedPage({ params }) {
  const { name } = await params;

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6">
      {/* Back button */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
        >
          <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          <span>Back to feed</span>
        </Link>
      </div>

      {/* Tag Header */}
      <header className="flex items-center gap-4 pb-6 mb-6 border-b border-[var(--line)]">
        <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-[var(--surface-strong)] border border-[var(--line)] text-[var(--ink)] shrink-0">
          <Hash size={32} strokeWidth={2} aria-hidden="true" />
        </div>
        <div className="flex flex-col min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
            #{name}
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Explore stories and discussions
          </p>
        </div>
      </header>

      {/* Grid */}
      <Suspense fallback={<ProfileGridSkeleton count={9} />}>
        <TagPostsStream tagName={name} />
      </Suspense>
    </div>
  );
}
