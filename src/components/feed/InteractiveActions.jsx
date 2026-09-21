"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Send, Ellipsis, Link as LinkIcon, Flag, Trash2, Repeat } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { ShareDialog } from "@/components/feed/ShareDialog";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { toggleLikeAction, sharePostAction } from "@/server/actions/interactions";
import { deletePostAction } from "@/server/actions/posts";
import { formatCompactNumber } from "@/lib/format";
import { useToast } from "@/components/ui/toast";

export function InteractiveActions({
  postId,
  postTitle = "",
  initialLiked = false,
  initialLikesCount = 0,
  commentsCount = 0,
  sharesCount: initialSharesCount = 0,
  isAuthor = false,
  commentHref = null,
  onDelete = null,
}) {
  const [likeState, setLikeState] = useState({
    isLiked: initialLiked,
    count: initialLikesCount,
  });
  const [justLiked, setJustLiked] = useState(false);
  const [localSharesCount, setLocalSharesCount] = useState(initialSharesCount);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const { addToast } = useToast();

  const handleLike = () => {
    const willBeLiked = !likeState.isLiked;
    const newCount = willBeLiked
      ? likeState.count + 1
      : Math.max(0, likeState.count - 1);

    // Instant local state update
    setLikeState({ isLiked: willBeLiked, count: newCount });
    if (willBeLiked) {
      setJustLiked(true);
      setTimeout(() => setJustLiked(false), 400);
    }

    // Background server call
    toggleLikeAction(postId)
      .then((res) => {
        if (!res?.ok) {
          // Revert on error
          setLikeState({
            isLiked: !willBeLiked,
            count: willBeLiked ? Math.max(0, newCount - 1) : newCount + 1,
          });
          addToast(res?.error || "Failed to update like.", "error");
        }
      })
      .catch((err) => {
        console.error("Like error:", err);
        setLikeState({
          isLiked: !willBeLiked,
          count: willBeLiked ? Math.max(0, newCount - 1) : newCount + 1,
        });
        addToast("Network error updating like.", "error");
      });
  };

  const handleQuickShare = () => {
    setShareMenuOpen(false);
    setLocalSharesCount((prev) => prev + 1);
    addToast("Post shared to your profile.");

    sharePostAction(postId).then((res) => {
      if (!res?.ok) {
        setLocalSharesCount((prev) => Math.max(0, prev - 1));
        addToast(res?.error || "Failed to share post.", "error");
      }
    }).catch((err) => {
      console.error("Share error:", err);
      setLocalSharesCount((prev) => Math.max(0, prev - 1));
      addToast("Network error sharing post.", "error");
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/p/${postId}`;
    navigator.clipboard.writeText(url).then(
      () => {
        addToast("Link copied to clipboard.");
        setMenuOpen(false);
        setShareMenuOpen(false);
      },
      () => {
        addToast("Failed to copy link.", "error");
      }
    );
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      setIsDeleted(true);
      deletePostAction(postId).then((res) => {
        if (res?.ok) {
          addToast("Post deleted.");
          if (onDelete) onDelete(postId);
        } else {
          setIsDeleted(false);
          addToast(res?.error || "Failed to delete post.", "error");
        }
      }).catch((err) => {
        console.error("Delete error:", err);
        setIsDeleted(false);
        addToast("Network error deleting post.", "error");
      });
    }
  };

  const handleShareSuccess = () => {
    setLocalSharesCount((prev) => prev + 1);
  };

  if (isDeleted) {
    return (
      <div className="py-4 text-center text-xs text-[var(--ink-muted)] italic animate-fadeIn">
        Post deleted.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Top Action Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Like */}
          <IconButton
            label={likeState.isLiked ? "Unlike post" : "Like post"}
            pressed={likeState.isLiked}
            onClick={handleLike}
          >
            <Heart
              size={24}
              strokeWidth={likeState.isLiked ? 2 : 1.75}
              aria-hidden="true"
              className={`transition-colors ${
                likeState.isLiked
                  ? `text-[var(--like)] ${justLiked ? "animate-heartPop" : ""}`
                  : "text-[var(--ink)] hover:text-[var(--ink-muted)]"
              }`}
              fill={likeState.isLiked ? "currentColor" : "none"}
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
            <IconButton
              label="Comment on post"
              onClick={() => {
                const el = document.getElementById(`comment-input-${postId}`);
                if (el) el.focus();
              }}
            >
              <MessageCircle size={24} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>
          )}

          {/* Share with Quick Menu */}
          <div className="relative">
            <IconButton
              label="Share post"
              onClick={() => setShareMenuOpen(!shareMenuOpen)}
            >
              <Send size={22} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink)] -rotate-12" />
            </IconButton>

            {shareMenuOpen && (
              <div className="absolute left-0 bottom-full mb-1 w-48 bg-[var(--bg)] border border-[var(--line)] rounded-xl shadow-xl py-1.5 z-40 animate-slideDown">
                <button
                  type="button"
                  onClick={handleQuickShare}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface)] text-left cursor-pointer"
                >
                  <Repeat size={15} strokeWidth={2} className="text-[var(--accent)]" />
                  <span>Repost to Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShareMenuOpen(false);
                    setShareOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] text-left cursor-pointer"
                >
                  <Send size={14} strokeWidth={1.75} className="text-[var(--ink-muted)]" />
                  <span>Share with note...</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] text-left border-t border-[var(--line)] cursor-pointer"
                >
                  <LinkIcon size={14} strokeWidth={1.75} className="text-[var(--ink-muted)]" />
                  <span>Copy link</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* More Menu */}
        <div className="relative">
          <IconButton label="More post options" onClick={() => setMenuOpen(!menuOpen)}>
            <Ellipsis size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)] hover:text-[var(--ink)]" />
          </IconButton>

          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-1 w-44 bg-[var(--bg)] border border-[var(--line)] rounded-xl shadow-xl py-1 z-30 animate-slideDown">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] text-left cursor-pointer"
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
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--surface)] text-left cursor-pointer"
              >
                <Flag size={14} strokeWidth={1.75} aria-hidden="true" />
                <span>Report Post</span>
              </button>
              {isAuthor && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--surface)] text-left border-t border-[var(--line)] cursor-pointer"
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
        <span>{formatCompactNumber(likeState.count)} likes</span>
        {commentsCount > 0 && (
          <span className="text-[var(--ink-muted)] font-normal">
            {formatCompactNumber(commentsCount)} comments
          </span>
        )}
        {localSharesCount > 0 && (
          <span className="text-[var(--ink-muted)] font-normal">
            {formatCompactNumber(localSharesCount)} shares
          </span>
        )}
      </div>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        postId={postId}
        postTitle={postTitle}
        onShareSuccess={handleShareSuccess}
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
