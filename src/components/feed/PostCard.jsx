"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Ellipsis, Heart, MessageCircle, Send } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { m } from "framer-motion";

export function PostCard({ post }) {
  const [liked, setLiked] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const formatCount = (count) => {
    return new Intl.NumberFormat("en-US", { notation: "compact" }).format(count);
  };

  const handleLike = () => setLiked(!liked);

  return (
    <article className="border-b border-[var(--line)] bg-[var(--bg)] py-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[var(--surface-strong)] overflow-hidden shrink-0">
            {post.author.avatar_url ? (
              <Image src={post.author.avatar_url} alt={post.author.username} width={32} height={32} className="object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center font-semibold text-xs text-[var(--ink-muted)]">
                {post.author.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-2 min-w-0">
            <Link href={`/u/${post.author.username}`} className="font-semibold text-sm truncate hover:underline text-[var(--ink)]">
              {post.author.username}
            </Link>
            <span className="text-xs text-[var(--ink-muted)] shrink-0">
              {post.createdAt}
            </span>
          </div>
        </div>
        <IconButton label="More options" className="h-8 w-8 min-h-0 min-w-0">
          <Ellipsis size={20} />
        </IconButton>
      </div>

      {/* Media or Text Body */}
      {post.image_url ? (
        <div className="relative w-full aspect-[4/5] bg-[var(--surface)] max-h-[600px]" onDoubleClick={handleLike}>
          <Image src={post.image_url} alt={post.title || "Post image"} fill className="object-cover" />
        </div>
      ) : (
        <div className="px-4 py-6 bg-[var(--surface)]" onDoubleClick={handleLike}>
          {post.title && <h2 className="text-xl font-bold mb-2">{post.title}</h2>}
          <p className="text-[var(--ink)] whitespace-pre-wrap">{post.body}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 px-4">
        <div className="flex items-center gap-4 -ml-2">
          <div className="flex items-center gap-1">
            <IconButton label={liked ? "Unlike" : "Like"} pressed={liked} onClick={handleLike}>
              <m.span whileTap={{ scale: 0.8 }} className="flex items-center justify-center">
                <Heart size={24} strokeWidth={1.75} aria-hidden="true" className={liked ? "text-[var(--like)]" : "text-[var(--ink)]"} fill={liked ? "currentColor" : "none"} />
              </m.span>
            </IconButton>
            <span className="text-sm font-semibold">{formatCount(post.likes_count + (liked ? 1 : 0))}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <IconButton label="Comment">
              <MessageCircle size={24} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>
            <span className="text-sm font-semibold">{formatCount(post.comments_count)}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <IconButton label="Share">
              <Send size={24} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>
          </div>
        </div>

        {/* Caption */}
        {post.image_url && (
          <div className="text-sm">
            <span className="font-semibold mr-2">{post.author.username}</span>
            <span className={expanded ? "break-words" : "line-clamp-2 break-words"}>
              {post.body}
            </span>
            {post.body.length > 100 && !expanded && (
              <button className="text-[var(--ink-muted)] text-sm mt-1 hover:underline" onClick={() => setExpanded(true)}>
                more
              </button>
            )}
          </div>
        )}

        {/* Comments Link */}
        {post.comments_count > 0 && (
          <Link href={`/p/${post.id}`} className="text-sm text-[var(--ink-muted)] hover:underline">
            View all {formatCount(post.comments_count)} comments
          </Link>
        )}

        {/* Add comment input (placeholder) */}
        <div className="flex items-center gap-3 mt-1">
          <input type="text" placeholder="Add a comment…" className="flex-1 text-base md:text-sm bg-transparent outline-none placeholder:text-[var(--ink-muted)]" />
          <button className="text-sm font-semibold text-[var(--accent)] disabled:opacity-50" disabled>
            Post
          </button>
        </div>
      </div>
    </article>
  );
}
