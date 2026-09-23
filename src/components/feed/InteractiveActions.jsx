"use client";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Send, Ellipsis, Link as LinkIcon, Flag, Trash2, Repeat, Pencil } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { ShareDialog } from "@/components/feed/ShareDialog";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { EditPostDialog } from "@/components/feed/EditPostDialog";
import { toggleLikeAction, sharePostAction, unsharePostAction } from "@/server/actions/interactions";
import { deletePostAction } from "@/server/actions/posts";
import { formatCompactNumber } from "@/lib/format";
import { useToast } from "@/components/ui/toast";

/**
 * Checks a server action result for UNAUTHENTICATED and shows a sign-in toast.
 */
function useAuthGuard() {
  const { addToast } = useToast();
  const guard = useCallback(
    (res) => {
      if (res?.code === "UNAUTHENTICATED" || res?.error === "UNAUTHENTICATED") {
        addToast("กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ (Please sign in to continue)", "error");
        return true;
      }
      return false;
    },
    [addToast],
  );
  return guard;
}

export function InteractiveActions({
  postId,
  postTitle = "",
  post = null,
  initialLiked = false,
  initialLikesCount = 0,
  initialShared = false,
  commentsCount = 0,
  sharesCount: initialSharesCount = 0,
  isAuthor = false,
  commentHref = null,
  onCommentClick = null,
  onDelete = null,
  onPostUpdated = null,
  currentUserId = null,
}) {
  const [likeState, setLikeState] = useState({
    isLiked: initialLiked,
    count: initialLikesCount,
  });
  const [justLiked, setJustLiked] = useState(false);
  const [shareState, setShareState] = useState({
    isShared: post?.isShared || initialShared,
    count: initialSharesCount,
  });
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const { addToast } = useToast();
  const authGuard = useAuthGuard();

  useEffect(() => {
    setLikeState({
      isLiked: initialLiked,
      count: initialLikesCount,
    });
  }, [initialLiked, initialLikesCount]);

  useEffect(() => {
    setShareState({
      isShared: post?.isShared || initialShared,
      count: initialSharesCount,
    });
  }, [post?.isShared, initialShared, initialSharesCount]);

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShareMenuOpen(false);
        setMenuOpen(false);
      }
    };
    if (shareMenuOpen || menuOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [shareMenuOpen, menuOpen]);

  const handleLike = () => {
    // Client-side pre-check: if not logged in, prompt user immediately
    if (!currentUserId) {
      addToast("กรุณาเข้าสู่ระบบเพื่อกดถูกใจ (Please sign in to like)", "error");
      return;
    }

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
          if (authGuard(res)) {
            setLikeState({ isLiked: !willBeLiked, count: willBeLiked ? Math.max(0, newCount - 1) : newCount + 1 });
            return;
          }
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
    if (!currentUserId) {
      addToast("กรุณาเข้าสู่ระบบเพื่อรีโพสต์ (Please sign in to repost)", "error");
      setShareMenuOpen(false);
      return;
    }

    if (shareState.isShared) {
      addToast("คุณได้รีโพสต์นี้ไปแล้ว ไม่สามารถรีโพสต์ซ้ำได้ (Already reposted)", "info");
      setShareMenuOpen(false);
      return;
    }

    setShareMenuOpen(false);
    setShareState((prev) => ({ isShared: true, count: prev.count + 1 }));
    addToast("Post reposted to your profile.");

    sharePostAction(postId).then((res) => {
      if (!res?.ok) {
        setShareState((prev) => ({ isShared: false, count: Math.max(0, prev.count - 1) }));
        if (authGuard(res)) return;
        addToast(res?.error || "Failed to repost post.", "error");
      }
    }).catch((err) => {
      console.error("Share error:", err);
      setShareState((prev) => ({ isShared: false, count: Math.max(0, prev.count - 1) }));
      addToast("Network error sharing post.", "error");
    });
  };

  const handleUnshare = () => {
    if (!currentUserId) {
      addToast("กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ (Please sign in)", "error");
      setShareMenuOpen(false);
      return;
    }

    setShareMenuOpen(false);
    setShareState((prev) => ({ isShared: false, count: Math.max(0, prev.count - 1) }));
    addToast("Repost removed from your profile.");

    unsharePostAction(postId).then((res) => {
      if (!res?.ok) {
        setShareState((prev) => ({ isShared: true, count: prev.count + 1 }));
        if (authGuard(res)) return;
        addToast(res?.error || "Failed to remove repost.", "error");
      }
    }).catch((err) => {
      console.error("Unshare error:", err);
      setShareState((prev) => ({ isShared: true, count: prev.count + 1 }));
      addToast("Network error removing repost.", "error");
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
          if (authGuard(res)) return;
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
    setShareState((prev) => ({ isShared: true, count: prev.count + 1 }));
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
          {onCommentClick ? (
            <IconButton
              label="Comment on post"
              onClick={onCommentClick}
            >
              <MessageCircle size={24} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>
          ) : commentHref ? (
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
                if (!currentUserId) {
                  addToast("กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น", "error");
                  return;
                }
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
              pressed={shareState.isShared}
              onClick={() => setShareMenuOpen(!shareMenuOpen)}
            >
              <Send
                size={22}
                strokeWidth={shareState.isShared ? 2 : 1.75}
                aria-hidden="true"
                className={`-rotate-12 transition-colors ${
                  shareState.isShared ? "text-[var(--accent)]" : "text-[var(--ink)]"
                }`}
              />
            </IconButton>

            {shareMenuOpen && (
              <>
                {/* Transparent backdrop for clicking outside */}
                <div
                  className="fixed inset-0 z-30 bg-transparent cursor-default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareMenuOpen(false);
                  }}
                  aria-hidden="true"
                />

                <div className="absolute left-0 bottom-full mb-1 w-52 bg-[var(--bg)] border border-[var(--line)] rounded-xl shadow-xl py-1.5 z-40 animate-slideDown">
                  {shareState.isShared ? (
                    <button
                      type="button"
                      onClick={handleUnshare}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--surface)] text-left cursor-pointer"
                    >
                      <Trash2 size={15} strokeWidth={1.75} className="text-[var(--danger)]" />
                      <span>Remove Repost (ลบการรีโพสต์)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleQuickShare}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface)] text-left cursor-pointer"
                    >
                      <Repeat size={15} strokeWidth={2} className="text-[var(--accent)]" />
                      <span>Repost to Profile</span>
                    </button>
                  )}

                  {!shareState.isShared && (
                    <button
                      type="button"
                      onClick={() => {
                        setShareMenuOpen(false);
                        if (!currentUserId) {
                          addToast("กรุณาเข้าสู่ระบบเพื่อแชร์โพสต์", "error");
                          return;
                        }
                        setShareOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] text-left cursor-pointer"
                    >
                      <Send size={14} strokeWidth={1.75} className="text-[var(--ink-muted)]" />
                      <span>Share with note...</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] text-left border-t border-[var(--line)] cursor-pointer"
                  >
                    <LinkIcon size={14} strokeWidth={1.75} className="text-[var(--ink-muted)]" />
                    <span>Copy link</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* More Menu */}
        <div className="relative">
          <IconButton label="More post options" onClick={() => setMenuOpen(!menuOpen)}>
            <Ellipsis size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)] hover:text-[var(--ink)]" />
          </IconButton>

          {menuOpen && (
            <>
              {/* Transparent backdrop for clicking outside */}
              <div
                className="fixed inset-0 z-20 bg-transparent cursor-default"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
                aria-hidden="true"
              />

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
                    if (!currentUserId) {
                      addToast("กรุณาเข้าสู่ระบบเพื่อรายงานโพสต์", "error");
                      return;
                    }
                    setReportOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--surface)] text-left cursor-pointer"
                >
                  <Flag size={14} strokeWidth={1.75} aria-hidden="true" />
                  <span>Report Post</span>
                </button>
                {isAuthor && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setEditOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] text-left border-t border-[var(--line)] cursor-pointer"
                    >
                      <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
                      <span>Edit Post</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--surface)] text-left border-t border-[var(--line)] cursor-pointer"
                    >
                      <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                      <span>Delete Post</span>
                    </button>
                  </>
                )}
              </div>
            </>
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
        {shareState.count > 0 && (
          <span className="text-[var(--ink-muted)] font-normal">
            {formatCompactNumber(shareState.count)} shares
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

      {post && (
        <EditPostDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          post={post}
          onPostUpdated={onPostUpdated}
        />
      )}
    </div>
  );
}

