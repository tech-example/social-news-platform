"use client";
import { useState, useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Send, Ellipsis, Link as LinkIcon, Flag, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { ShareDialog } from "@/components/feed/ShareDialog";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { toggleLikeAction } from "@/server/actions/interactions";
import { deletePostAction } from "@/server/actions/posts";
import { formatCompactNumber } from "@/lib/format";
import { useToast } from "@/components/ui/toast";

export function InteractiveActions({
  postId,
  postTitle = "",
  initialLiked = false,
  initialLikesCount = 0,
  commentsCount = 0,
  sharesCount = 0,
  isAuthor = false,
  commentHref = null,
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  const [optimisticState, setOptimisticState] = useOptimistic(
    { isLiked: initialLiked, count: initialLikesCount },
    (state) => ({
      isLiked: !state.isLiked,
      count: state.isLiked ? Math.max(0, state.count - 1) : state.count + 1,
    })
  );

  const handleLike = () => {
    startTransition(async () => {
      setOptimisticState();
      const res = await toggleLikeAction(postId);
      if (!res.ok) {
        addToast(res.error || "Failed to update like.", "error");
      }
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/p/${postId}`;
    navigator.clipboard.writeText(url).then(
      () => {
        addToast("Link copied to clipboard.");
        setMenuOpen(false);
      },
      () => {
        addToast("Failed to copy link.", "error");
      }
    );
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      startTransition(async () => {
        const res = await deletePostAction(postId);
        if (res.ok) {
          addToast("Post deleted.");
        } else {
          addToast(res.error || "Failed to delete post.", "error");
        }
      });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Top Action Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Like */}
          <IconButton
            label={optimisticState.isLiked ? "Unlike post" : "Like post"}
            pressed={optimisticState.isLiked}
            onClick={handleLike}
            disabled={isPending}
          >
            <Heart
              size={24}
              strokeWidth={optimisticState.isLiked ? 2 : 1.75}
              aria-hidden="true"
              className={optimisticState.isLiked ? "text-[var(--like)]" : "text-[var(--ink)]"}
              fill={optimisticState.isLiked ? "currentColor" : "none"}
            />
          </IconButton>

          {/* Comment */}
          {commentHref ? (
            <Link
              href={commentHref}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--ink)] hover:bg-[var(--surface)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
              aria-label="View comments"
            >
              <MessageCircle size={24} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          ) : (
            <IconButton label="Comment on post" onClick={() => {
              const el = document.getElementById(`comment-input-${postId}`);
              if (el) el.focus();
            }}>
              <MessageCircle size={24} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>
          )}

          {/* Share */}
          <IconButton label="Share post" onClick={() => setShareOpen(true)}>
            <Send size={22} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink)] -rotate-12" />
          </IconButton>
        </div>

        {/* More Menu */}
        <div className="relative">
          <IconButton label="More post options" onClick={() => setMenuOpen(!menuOpen)}>
            <Ellipsis size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)] hover:text-[var(--ink)]" />
          </IconButton>

          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-1 w-44 bg-[var(--bg)] border border-[var(--line)] rounded-lg shadow-lg py-1 z-30 animate-fadeIn">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] text-left"
              >
                <LinkIcon size={14} strokeWidth={1.75} aria-hidden="true" />
                <span>Copy Link</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setReportOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--surface)] text-left"
              >
                <Flag size={14} strokeWidth={1.75} aria-hidden="true" />
                <span>Report Post</span>
              </button>
              {isAuthor && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--surface)] text-left border-t border-[var(--line)]"
                >
                  <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                  <span>Delete Post</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Numerical Counters Row */}
      <div className="flex items-center gap-3 text-xs font-semibold text-[var(--ink)] px-1">
        <span>{formatCompactNumber(optimisticState.count)} likes</span>
        {commentsCount > 0 && (
          <span className="text-[var(--ink-muted)] font-normal">
            {formatCompactNumber(commentsCount)} comments
          </span>
        )}
        {sharesCount > 0 && (
          <span className="text-[var(--ink-muted)] font-normal">
            {formatCompactNumber(sharesCount)} shares
          </span>
        )}
      </div>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        postId={postId}
        postTitle={postTitle}
      />

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="post"
        targetId={postId}
      />
    </div>
  );
}
