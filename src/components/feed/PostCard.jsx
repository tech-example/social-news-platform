"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { InteractiveActions } from "@/components/feed/InteractiveActions";
import { InlineCommentInput } from "@/components/feed/InlineCommentInput";
import { formatRelativeTime } from "@/lib/format";
import { FollowButton } from "@/components/ui/follow-button";
import { ExternalLink } from "lucide-react";

export function PostCard({ post, currentUserId = null }) {
  const [expanded, setExpanded] = useState(false);
  const [localComments, setLocalComments] = useState(post.recentComments || []);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.commentsCount || 0);
  const [isDeleted, setIsDeleted] = useState(false);

  const author = post.author || {
    id: post.user_id,
    username: "anonymous",
    display_name: "Anonymous",
    avatar_url: null,
  };

  const isAuthor = currentUserId === (post.author?.id || post.user_id);

  const handleCommentPosted = (comment) => {
    setLocalComments((prev) => [...prev, comment]);
    setLocalCommentsCount((prev) => prev + 1);
  };

  const handleDelete = () => {
    setIsDeleted(true);
  };

  if (isDeleted) return null;

  // Render body with hashtag highlighting
  const renderBody = (text) => {
    if (!text) return null;
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("#")) {
        const tag = part.slice(1).toLowerCase();
        return (
          <Link
            key={i}
            href={`/tag/${tag}`}
            className="text-[var(--accent)] font-medium hover:underline"
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

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
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/u/${author.username}`}
                className="font-semibold text-sm truncate hover:underline text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] rounded"
              >
                {author.username}
              </Link>
              {currentUserId && !isAuthor && author.id && (
                <>
                  <span className="text-xs text-[var(--ink-muted)]">•</span>
                  <FollowButton
                    targetUserId={author.id}
                    initialFollowing={post.isFollowingAuthor || false}
                    variant="text"
                  />
                </>
              )}
            </div>
            {post.createdAt && (
              <span className="text-xs text-[var(--ink-muted)] shrink-0" suppressHydrationWarning>
                {formatRelativeTime(post.createdAt)}
              </span>
            )}
          </div>
        </div>

        {/* Full page direct navigation */}
        <div className="flex items-center gap-1.5">
          <a
            href={`/p/${post.id}`}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
            title="Open standalone full page"
            aria-label="Open standalone full page"
          >
            <span className="hidden sm:inline">Full page</span>
            <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
          </a>
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
            {renderBody(post.body)}
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
          commentsCount={localCommentsCount}
          sharesCount={post.sharesCount || 0}
          isAuthor={isAuthor}
          onDelete={handleDelete}
        />

        {/* Recent Comments Preview */}
        {localComments.length > 0 && (
          <div className="mt-2 space-y-1">
            {localComments.slice(-2).map((c) => (
              <div key={c.id} className="text-sm">
                <Link
                  href={`/u/${c.author?.username}`}
                  className="font-semibold text-[var(--ink)] hover:underline mr-1.5"
                >
                  {c.author?.username}
                </Link>
                <span className="text-[var(--ink)]">{c.body}</span>
              </div>
            ))}
          </div>
        )}

        {/* View all comments link */}
        {localCommentsCount > 2 && (
          <Link
            href={`/p/${post.id}`}
            className="block text-xs text-[var(--ink-muted)] hover:underline mt-1.5"
          >
            View all {localCommentsCount} comments
          </Link>
        )}

        {/* Inline Comment Input */}
        {currentUserId && (
          <InlineCommentInput
            postId={post.id}
            onCommentPosted={handleCommentPosted}
          />
        )}
      </div>
    </article>
  );
}
