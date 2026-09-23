"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { InteractiveActions } from "@/components/feed/InteractiveActions";
import { CommentThread } from "@/components/feed/CommentThread";
import { IconButton } from "@/components/ui/icon-button";
import { FollowButton } from "@/components/ui/follow-button";
import { X, ExternalLink } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";

export function InterceptedPostTopSheet({ post: initialPost, comments = [], viewerId = null }) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);

  const handleClose = () => {
    router.back();
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!post) return null;

  const author = post.author || {
    id: post.user_id,
    username: "anonymous",
    display_name: "Anonymous",
    avatar_url: null,
  };

  const isAuthor = viewerId === (post.author?.id || post.author_id || post.user_id);

  // Render body with clickable links and hashtags
  const renderBodyWithLinks = (text) => {
    if (!text) return null;
    const parts = text.split(/(https?:\/\/[^\s]+|#[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("http://") || part.startsWith("https://")) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline break-all hover:opacity-85 font-normal"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      if (part.startsWith("#")) {
        const tag = part.slice(1).toLowerCase();
        return (
          <Link
            key={i}
            href={`/tag/${tag}`}
            onClick={handleClose}
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

    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Post by ${author.username}`}
      className="fixed inset-0 z-50 flex justify-center items-start pt-2 sm:pt-6 px-2 sm:px-4 pointer-events-none overscroll-contain"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-200"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Top Dropdown Sheet Card */}
      <div className="relative pointer-events-auto w-full max-w-2xl bg-[var(--bg)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88dvh] animate-slideDown z-10">
        {/* Top Handle Bar */}
        <div className="w-10 h-1 bg-[var(--line)] rounded-full mx-auto mt-2 mb-1 shrink-0" />

        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)] shrink-0 bg-[var(--bg)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href={`/u/${author.username}`}
              onClick={handleClose}
              className="flex items-center gap-2.5 min-w-0 group"
            >
              <Avatar
                src={author.avatar_url}
                name={author.display_name || author.username}
                size={34}
              />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm text-[var(--ink)] truncate group-hover:underline">
                  {author.username}
                </span>
                {post.createdAt && (
                  <span className="text-xs text-[var(--ink-muted)] truncate" suppressHydrationWarning>
                    {formatRelativeTime(post.createdAt)}
                  </span>
                )}
              </div>
            </Link>

            {viewerId && !isAuthor && author.id && (
              <FollowButton
                targetUserId={author.id}
                initialFollowing={post.isFollowingAuthor || false}
                variant="compact"
                className="ml-1"
                onToggle={(newFollowing) => {
                  setPost((prev) => ({
                    ...prev,
                    isFollowingAuthor: newFollowing,
                  }));
                }}
              />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={`/p/${post.id}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--surface)] rounded-md transition-colors"
              title="Open standalone page"
            >
              <span>Full page</span>
              <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
            </a>
            <IconButton label="Close preview" onClick={handleClose}>
              <X size={18} strokeWidth={2} aria-hidden="true" className="text-[var(--ink)]" />
            </IconButton>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Post Image (if any) */}
          {post.imageUrl && (
            <div className="relative w-full aspect-4/3 max-h-[360px] bg-[var(--surface)] border-b border-[var(--line)]">
              <Image
                src={post.imageUrl}
                alt={post.title || "Post image preview"}
                fill
                sizes="(min-width: 640px) 670px, 100vw"
                className="object-contain"
                unoptimized
                priority
              />
            </div>
          )}

          {/* Post Text & Hashtags */}
          <div className="p-4 space-y-2">
            {post.title && (
              <h2 className="text-base font-bold text-[var(--ink)] leading-snug">
                {post.title}
              </h2>
            )}
            <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
              {renderBodyWithLinks(post.body)}
            </p>

            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tag/${tag}`}
                    onClick={handleClose}
                    className="text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="px-4 py-2 border-y border-[var(--line)] bg-[var(--bg)]">
            <InteractiveActions
              postId={post.id}
              postTitle={post.title || post.body?.slice(0, 40)}
              post={post}
              initialLiked={post.isLiked || false}
              initialLikesCount={post.likesCount || 0}
              commentsCount={post.commentsCount || comments.length || 0}
              sharesCount={post.sharesCount || 0}
              isAuthor={isAuthor}
              onPostUpdated={(updated) => setPost((prev) => ({ ...prev, ...updated }))}
              currentUserId={viewerId}
            />
          </div>

          {/* Comments Section */}
          <div className="p-4 bg-[var(--surface)]">
            <h3 className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider mb-3">
              Comments
            </h3>
            <CommentThread
              postId={post.id}
              initialComments={comments}
              currentUserId={viewerId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
