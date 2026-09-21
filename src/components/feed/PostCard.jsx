"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Ellipsis, Heart, MessageCircle, Send } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Avatar } from "@/components/ui/avatar";
import { m } from "framer-motion";
import { formatCompactNumber, formatRelativeTime } from "@/lib/format";
import { COPY } from "@/lib/copy";

export function PostCard({ post }) {
  const [liked, setLiked] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleLike = () => setLiked((prev) => !prev);

  const likesCount = (post.likes_count || 0) + (liked ? 1 : 0);
  const commentsCount = post.comments_count || 0;
  const author = post.author || { username: "anonymous", display_name: "Anonymous", avatar_url: null };

  return (
    <article className="border-b border-[var(--line)] bg-[var(--bg)] py-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/u/${author.username}`} className="shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] rounded-full">
            <Avatar src={author.avatar_url} alt={author.username} name={author.display_name || author.username} size={32} />
          </Link>
          <div className="flex items-baseline gap-2 min-w-0">
            <Link href={`/u/${author.username}`} className="font-semibold text-sm truncate hover:underline text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] rounded">
              {author.username}
            </Link>
            {post.created_at && (
              <span className="text-xs text-[var(--ink-muted)] shrink-0">
                {formatRelativeTime(post.created_at)}
              </span>
            )}
          </div>
        </div>
        <IconButton label="More options" className="h-8 w-8 min-h-0 min-w-0 text-[var(--ink)]">
          <Ellipsis size={20} aria-hidden="true" />
        </IconButton>
      </div>

      {/* Media or Text Body */}
      {post.image_url ? (
        <div className="relative w-full aspect-[4/5] bg-[var(--surface)] max-h-[600px] overflow-hidden" onDoubleClick={handleLike}>
          <Image
            src={post.image_url}
            alt={post.title || "Post image"}
            fill
            sizes="(min-width: 768px) 470px, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="px-4 py-6 bg-[var(--surface)]" onDoubleClick={handleLike}>
          {post.title && <h2 className="text-xl font-bold mb-2 text-[var(--ink)]">{post.title}</h2>}
          <p className="text-[var(--ink)] whitespace-pre-wrap leading-relaxed">{post.body}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 px-4">
        <div className="flex items-center gap-4 -ml-2">
          <div className="flex items-center gap-1">
            <IconButton label={liked ? COPY.actions.unlike : COPY.actions.like} pressed={liked} onClick={handleLike}>
              <m.span whileTap={{ scale: 0.8 }} className="flex items-center justify-center">
                <Heart
                  size={24}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className={liked ? "text-[var(--like)]" : "text-[var(--ink)]"}
                  fill={liked ? "currentColor" : "none"}
                />
              </m.span>
            </IconButton>
            <span className="text-sm font-semibold tabular-nums">{formatCompactNumber(likesCount)}</span>
          </div>

          <div className="flex items-center gap-1">
            <IconButton label={COPY.actions.comment}>
              <MessageCircle size={24} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink)]" />
            </IconButton>
            <span className="text-sm font-semibold tabular-nums">{formatCompactNumber(commentsCount)}</span>
          </div>

          <div className="flex items-center gap-1">
            <IconButton label={COPY.actions.share}>
              <Send size={24} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink)]" />
            </IconButton>
          </div>
        </div>

        {/* Caption */}
        {post.image_url && (
          <div className="text-sm leading-snug">
            <span className="font-semibold mr-2 text-[var(--ink)]">{author.username}</span>
            <span className={expanded ? "break-words" : "line-clamp-2 break-words"}>
              {post.body}
            </span>
            {post.body && post.body.length > 100 && !expanded && (
              <button
                type="button"
                className="text-[var(--ink-muted)] text-sm ml-1 hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
                onClick={() => setExpanded(true)}
              >
                {COPY.post.more}
              </button>
            )}
          </div>
        )}

        {/* Comments Link */}
        {commentsCount > 0 && (
          <Link href={`/p/${post.id}`} className="text-sm text-[var(--ink-muted)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] rounded">
            {COPY.post.viewAllComments(formatCompactNumber(commentsCount))}
          </Link>
        )}

        {/* Add comment input */}
        <div className="flex items-center gap-3 mt-1">
          <input
            type="text"
            placeholder={COPY.post.addCommentPlaceholder}
            className="flex-1 text-base md:text-sm bg-transparent outline-none placeholder:text-[var(--ink-muted)] text-[var(--ink)]"
          />
          <button
            type="button"
            className="text-sm font-semibold text-[var(--accent)] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            disabled
          >
            {COPY.actions.post}
          </button>
        </div>
      </div>
    </article>
  );
}
