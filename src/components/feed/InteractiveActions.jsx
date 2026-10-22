"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Send, Ellipsis, Link as LinkIcon, Flag, Trash2, Repeat, Pencil } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { ShareDialog } from "@/components/feed/ShareDialog";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { EditPostDialog } from "@/components/feed/EditPostDialog";
import { FloatingMenu } from "@/components/ui/floating-menu";
import { toggleLikeAction, sharePostAction, unsharePostAction } from "@/server/actions/interactions";
import { deletePostAction } from "@/server/actions/posts";
import { formatCompactNumber } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Checks a server action result for UNAUTHENTICATED and shows a sign-in toast.
 */
function useAuthGuard() {
  const { addToast } = useToast();
  const guard = useCallback(
    (res) => {
      if (res?.code === "UNAUTHENTICATED" || res?.error === "UNAUTHENTICATED") {
        addToast("Please sign in to continue.", "error");
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
  isStaff = false,
  commentHref = null,
  onCommentClick = null,
  onDelete = null,
  onPostUpdated = null,
  currentUserId = null,
}) {
  const shareAnchorRef = useRef(null);
  const moreAnchorRef = useRef(null);

  const canEdit = Boolean(isAuthor);
  const canDelete = Boolean(isAuthor || isStaff);
  const canReport = Boolean(!isAuthor && currentUserId);
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
      addToast("Please sign in to like this post.", "error");
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
      addToast("Please sign in to repost.", "error");
      setShareMenuOpen(false);
      return;
    }

    if (shareState.isShared) {
      addToast("You have already reposted this post.", "info");
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
      addToast("Please sign in to continue.", "error");
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

  const handleDeleteClick = () => {
    setMenuOpen(false);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteConfirmOpen(false);
    setIsDeleted(true);

    try {
      const res = await deletePostAction(postId);
      if (res?.ok) {
        addToast("Post deleted.");
        if (onDelete) onDelete(postId);
      } else {
        setIsDeleted(false);
        if (authGuard(res)) return;
        addToast(res?.error || "Failed to delete post.", "error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setIsDeleted(false);
      addToast("Network error deleting post.", "error");
    } finally {
      setIsDeleting(false);
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
                  addToast("Please sign in to comment.", "error");
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
              ref={shareAnchorRef}
              label="Share post"
              pressed={shareState.isShared || shareMenuOpen}
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

            <FloatingMenu
              open={shareMenuOpen}
              onClose={() => setShareMenuOpen(false)}
              anchorRef={shareAnchorRef}
              className="w-52"
              align="left"
              ariaLabel="Share post options"
            >
              {shareState.isShared ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleUnshare}
                  className="w-full min-h-11 flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--surface)] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
                >
                  <Trash2 size={16} strokeWidth={1.75} className="text-[var(--danger)] shrink-0" />
                  <span>Remove Repost</span>
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleQuickShare}
                  className="w-full min-h-11 flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface)] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
                >
                  <Repeat size={16} strokeWidth={2} className="text-[var(--accent)] shrink-0" />
                  <span>Repost to Profile</span>
                </button>
              )}

              {!shareState.isShared && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShareMenuOpen(false);
                    if (!currentUserId) {
                      addToast("Please sign in to share.", "error");
                      return;
                    }
                    setShareOpen(true);
                  }}
                  className="w-full min-h-11 flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
                >
                  <Send size={16} strokeWidth={1.75} className="text-[var(--ink-muted)] shrink-0" />
                  <span>Share with note...</span>
                </button>
              )}

              <button
                type="button"
                role="menuitem"
                onClick={handleCopyLink}
                className="w-full min-h-11 flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] text-left border-t border-[var(--line)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
              >
                <LinkIcon size={16} strokeWidth={1.75} className="text-[var(--ink-muted)] shrink-0" />
                <span>Copy link</span>
              </button>
            </FloatingMenu>
          </div>
        </div>

        {/* More Menu */}
        <div className="relative">
          <IconButton
            ref={moreAnchorRef}
            label="More post options"
            pressed={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Ellipsis size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)] hover:text-[var(--ink)]" />
          </IconButton>

          <FloatingMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            anchorRef={moreAnchorRef}
            className="w-44"
            ariaLabel="More post options"
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleCopyLink}
              className="w-full min-h-11 flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
            >
              <LinkIcon size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
              <span>Copy Link</span>
            </button>
            {canReport && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  if (!currentUserId) {
                    addToast("Please sign in to report.", "error");
                    return;
                  }
                  setReportOpen(true);
                }}
                className="w-full min-h-11 flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--surface)] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
              >
                <Flag size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
                <span>Report Post</span>
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setEditOpen(true);
                }}
                className="w-full min-h-11 flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] text-left border-t border-[var(--line)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
              >
                <Pencil size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
                <span>Edit Post</span>
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                role="menuitem"
                onClick={handleDeleteClick}
                className="w-full min-h-11 flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--surface)] text-left border-t border-[var(--line)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
              >
                <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
                <span>Delete Post</span>
              </button>
            )}
          </FloatingMenu>
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
        isFlagged={Boolean(post?.is_flagged)}
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

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this post?"
        description="This action cannot be undone. The post, its comments, and associated likes will be permanently removed."
        confirmLabel="Delete post"
        cancelLabel="Cancel"
        destructive={true}
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

