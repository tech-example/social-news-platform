import Link from "next/link";
import Image from "next/image";
import { getExplorePosts } from "@/server/dal/posts";
import { Heart, MessageCircle, FileText } from "lucide-react";
import { formatCompactNumber } from "@/lib/format";

export const metadata = {
  title: "Explore - SocialNews",
  description: "Discover trending stories, top engaging posts, and breaking news.",
};

export default async function ExplorePage() {
  const posts = await getExplorePosts({ limit: 24 });

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--ink)]">Explore</h1>
        <p className="text-xs text-[var(--ink-muted)] mt-1">
          Top stories and posts trending across the platform
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="py-16 text-center text-sm text-[var(--ink-muted)]">
          No posts available to explore yet. Be the first to share!
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

              {/* Hover overlay */}
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
  );
}
