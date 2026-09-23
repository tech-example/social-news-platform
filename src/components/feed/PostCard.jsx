"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { InteractiveActions } from "@/components/feed/InteractiveActions";
import { InlineCommentInput } from "@/components/feed/InlineCommentInput";
import { formatRelativeTime } from "@/lib/format";
import { FollowButton } from "@/components/ui/follow-button";
import { ExternalLink, Loader2 } from "lucide-react";
import { getCommentsAction } from "@/server/actions/interactions";

export function PostCard({ post, currentUserId = null }) {
  const [currentPost, setCurrentPost] = useState(post);
  const [expanded, setExpanded] = useState(false);
  const [localComments, setLocalComments] = useState(post.recentComments || []);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.commentsCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [allCommentsLoaded, setAllCommentsLoaded] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    setCurrentPost(post);
    setLocalComments(post.recentComments || []);
    setLocalCommentsCount(post.commentsCount || 0);
  }, [post]);

  const author = currentPost.author || {
    id: currentPost.user_id,
    username: "anonymous",
    display_name: "Anonymous",
    avatar_url: null,
  };

  const isAuthor = currentUserId === (currentPost.author?.id || currentPost.user_id);

  const handleCommentPosted = (comment, tempId = null) => {
    if (tempId) {
      setLocalComments((prev) => prev.map((c) => (c.id === tempId ? comment : c)));
    } else {
      setLocalComments((prev) => [...prev, comment]);
      setLocalCommentsCount((prev) => prev + 1);
      setShowComments(true);
    }
  };


  const handleDelete = () => {
    setIsDeleted(true);
  };

  const handleToggleComments = async () => {
    const nextShow = !showComments;
    setShowComments(nextShow);
    if (nextShow && !allCommentsLoaded && localCommentsCount > localComments.length) {
      setIsLoadingComments(true);
      try {
        const res = await getCommentsAction(currentPost.id);
        if (res?.ok && res.comments) {
          setLocalComments(res.comments);
          setAllCommentsLoaded(true);
        }
      } catch (err) {
        console.error("Failed to fetch comments:", err);
      } finally {
        setIsLoadingComments(false);
      }
    }
  };

  if (isDeleted) return null;

  // Render body with clickable URLs and hashtag links
  const renderBody = (text) => {
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
            className="text-[var(--accent)] font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const displayedComments = showComments
    ? localComments
    : localComments.slice(-2);

  return (
    <article className="feed-card-contain border-b border-[var(--line)] bg-[var(--bg)] py-4 flex flex-col gap-3">
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
                    initialFollowing={currentPost.isFollowingAuthor || false}
                    variant="text"
                    onToggle={(newFollowing) => {
                      setCurrentPost((prev) => ({
                        ...prev,
                        isFollowingAuthor: newFollowing,
                      }));
                    }}
                  />
                </>
              )}
            </div>
            {currentPost.createdAt && (
              <span className="text-xs text-[var(--ink-muted)] shrink-0" suppressHydrationWarning>
                {formatRelativeTime(currentPost.createdAt)}
              </span>
            )}
          </div>
        </div>

        {/* Full page direct navigation */}
        <div className="flex items-center gap-1.5">
          <a
            href={`/p/${currentPost.id}`}
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
      {currentPost.imageUrl ? (
        <div className="relative w-full aspect-4/5 bg-[var(--surface)] max-h-[580px] overflow-hidden">
          <Image
            src={currentPost.imageUrl}
            alt={currentPost.title || "Post image"}
            fill
            sizes="(min-width: 768px) 470px, 100vw"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : null}

      {/* Content & Title */}
      <div className="px-4 flex flex-col gap-1.5">
        {currentPost.title && (
          <Link href={`/p/${currentPost.id}`} className="hover:underline">
            <h2 className="text-base font-bold text-[var(--ink)] line-clamp-2">
              {currentPost.title}
            </h2>
          </Link>
        )}

        <div className="text-sm leading-snug">
          {!currentPost.imageUrl && (
            <span className="font-semibold mr-2 text-[var(--ink)]">{author.username}</span>
          )}
          <span className={expanded ? "break-words" : "line-clamp-3 break-words text-[var(--ink)]"}>
            {renderBody(currentPost.body)}
          </span>
          {currentPost.body && currentPost.body.length > 140 && !expanded && (
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
        {currentPost.tags && currentPost.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {currentPost.tags.map((tag) => (
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

      {/* Interactive Actions (Like, Comment, Share, Ellipsis, Edit) */}
      <div className="px-4 pt-1">
        <InteractiveActions
          postId={currentPost.id}
          postTitle={currentPost.title || currentPost.body?.slice(0, 40)}
          post={currentPost}
          initialLiked={currentPost.isLiked || false}
          initialLikesCount={currentPost.likesCount || 0}
          initialShared={currentPost.isShared || false}
          commentsCount={localCommentsCount}
          sharesCount={currentPost.sharesCount || 0}
          isAuthor={isAuthor}
          onDelete={handleDelete}
          onPostUpdated={(updated) => setCurrentPost((prev) => ({ ...prev, ...updated }))}
          onCommentClick={async () => {
            if (!showComments) {
              await handleToggleComments();
            }
            if (currentUserId) {
              setTimeout(() => {
                const el = document.getElementById(`comment-input-${currentPost.id}`);
                if (el) el.focus();
              }, 50);
            }
          }}
          currentUserId={currentUserId}
        />

        {/* Comments Display */}
        {displayedComments.length > 0 && (
          <div className={`mt-2 space-y-2 ${showComments ? "max-h-72 overflow-y-auto pr-1" : ""}`}>
            {displayedComments.map((c) => (
              <div key={c.id} className="flex items-start gap-2 text-sm leading-snug">
                <Link
                  href={`/u/${c.author?.username || "anonymous"}`}
                  className="shrink-0 pt-0.5 focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] rounded-full"
                  title={c.author?.display_name || c.author?.username}
                >
                  <Avatar
                    src={c.author?.avatar_url}
                    alt={c.author?.display_name || c.author?.username || "User avatar"}
                    name={c.author?.display_name || c.author?.username}
                    size={22}
                  />
                </Link>
                <div className="flex-1 min-w-0 break-words">
                  <Link
                    href={`/u/${c.author?.username || "anonymous"}`}
                    className="font-semibold text-[var(--ink)] hover:underline mr-1.5"
                  >
                    {c.author?.username}
                  </Link>
                  <span className="text-[var(--ink)]">{c.body}</span>
                </div>
              </div>
            ))}
          </div>
        )}


        {/* Loading comments indicator */}
        {isLoadingComments && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] mt-2">
            <Loader2 size={13} className="animate-spin" />
            <span>Loading comments...</span>
          </div>
        )}

        {/* View all comments / Hide comments toggle */}
        {localCommentsCount > 2 && !showComments && (
          <button
            type="button"
            onClick={handleToggleComments}
            className="block text-xs text-[var(--ink-muted)] hover:underline mt-1.5 cursor-pointer text-left"
          >
            View all {localCommentsCount} comments
          </button>
        )}
        {showComments && localCommentsCount > 2 && (
          <button
            type="button"
            onClick={() => setShowComments(false)}
            className="block text-xs text-[var(--ink-muted)] hover:underline mt-1.5 cursor-pointer text-left"
          >
            Hide comments
          </button>
        )}

        {/* Inline Comment Input */}
        {currentUserId && (
          <InlineCommentInput
            postId={currentPost.id}
            onCommentPosted={handleCommentPosted}
          />
        )}
      </div>
    </article>
  );
}

