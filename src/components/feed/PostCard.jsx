"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { InteractiveActions } from "@/components/feed/InteractiveActions";
import { formatRelativeTime } from "@/lib/format";

export function PostCard({ post, currentUserId = null }) {
  const [expanded, setExpanded] = useState(false);

  const author = post.author || {
    id: post.user_id,
    username: "anonymous",
    display_name: "Anonymous",
    avatar_url: null,
  };

  const isAuthor = currentUserId === (post.author?.id || post.user_id);

  return (
    <article className="border-b border-[var(--line)] bg-[var(--bg)] py-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/u/${author.username}`}
            className="shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] rounded-full"
          >
            <Avatar
              src={author.avatar_url}
              alt={author.display_name || author.username}
              name={author.display_name || author.username}
              size={36}
            />
          </Link>
          <div className="flex flex-col min-w-0">
            <Link
              href={`/u/${author.username}`}
              className="font-semibold text-sm truncate hover:underline text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] rounded"
            >
              {author.username}
            </Link>
            {post.createdAt && (
              <span className="text-xs text-[var(--ink-muted)] shrink-0" suppressHydrationWarning>
                {formatRelativeTime(post.createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Media or Text Body */}
      {post.imageUrl ? (
        <div className="relative w-full aspect-4/5 bg-[var(--surface)] max-h-[580px] overflow-hidden">
          <Image
            src={post.imageUrl}
            alt={post.title || "Post image"}
            fill
            sizes="(min-width: 768px) 470px, 100vw"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : null}

      {/* Content & Title */}
      <div className="px-4 flex flex-col gap-1.5">
        {post.title && (
          <Link href={`/p/${post.id}`} className="hover:underline">
            <h2 className="text-base font-bold text-[var(--ink)] line-clamp-2">
              {post.title}
            </h2>
          </Link>
        )}

        <div className="text-sm leading-snug">
          {!post.imageUrl && (
            <span className="font-semibold mr-2 text-[var(--ink)]">{author.username}</span>
          )}
          <span className={expanded ? "break-words" : "line-clamp-3 break-words text-[var(--ink)]"}>
            {post.body}
          </span>
          {post.body && post.body.length > 140 && !expanded && (
            <button
              type="button"
              className="text-[var(--ink-muted)] text-sm ml-1 hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
              onClick={() => setExpanded(true)}
            >
              more
            </button>
          )}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/tag/${tag}`}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Actions (Like, Comment, Share, Ellipsis) */}
      <div className="px-4 pt-1">
        <InteractiveActions
          postId={post.id}
          postTitle={post.title || post.body?.slice(0, 40)}
          initialLiked={post.isLiked || false}
          initialLikesCount={post.likesCount || 0}
          commentsCount={post.commentsCount || 0}
          sharesCount={post.sharesCount || 0}
          isAuthor={isAuthor}
          commentHref={`/p/${post.id}`}
        />

        {/* Link to post detail if comments exist */}
        {post.commentsCount > 0 && (
          <Link
            href={`/p/${post.id}`}
            className="block text-xs text-[var(--ink-muted)] hover:underline mt-1.5"
          >
            View all {post.commentsCount} comments
          </Link>
        )}
      </div>
    </article>
  );
}
