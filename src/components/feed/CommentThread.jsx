"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { createCommentAction, deleteCommentAction, editCommentAction } from "@/server/actions/interactions";
import { formatRelativeTime } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { Trash2, CornerDownRight, Ellipsis, Flag, Pencil } from "lucide-react";
import { LIMITS } from "@/lib/constants";
import { FlaggedContent } from "@/components/feed/FlaggedContent";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { FloatingMenu } from "@/components/ui/floating-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getDisplayName } from "@/lib/user";
import { UserName } from "@/components/ui/user-name";

function CommentActions({ comment, currentUserId, isStaff, onDelete, onReport, onEdit }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const isAuthor = Boolean(
    currentUserId &&
      (comment.authorId === currentUserId ||
        comment.author_id === currentUserId ||
        comment.author?.id === currentUserId ||
        comment.userId === currentUserId ||
        comment.user_id === currentUserId ||
        comment.isOwner)
  );

  // Independent conditions for each action:
  // - Edit: visible to the comment's own author (any role).
  // - Delete: visible when signed-in user is the comment's author (any role) OR is a moderator/admin.
  // - Report: visible to any signed-in user who is NOT the comment's author, regardless of role.
  const canEdit = Boolean(isAuthor);
  const canDelete = Boolean(isAuthor || isStaff);
  const canReport = Boolean(!isAuthor && currentUserId);

  const hasMenuActions = Boolean(canEdit || canDelete || canReport);
  if (!hasMenuActions) return null;

  return (
    <div className="relative shrink-0">
      <IconButton
        ref={buttonRef}
        label="Comment options"
        pressed={open}
        onClick={() => setOpen((prev) => !prev)}
        className="text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] focus-visible:outline-[var(--accent-bright)]"
      >
        <Ellipsis size={16} strokeWidth={1.75} aria-hidden="true" />
      </IconButton>

      <FloatingMenu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={buttonRef}
        className="w-40"
        ariaLabel="Comment options"
      >
        {canEdit && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              if (onEdit) onEdit(comment);
            }}
            className="w-full min-h-11 flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface)] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
          >
            <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>Edit</span>
          </button>
        )}
        {canReport && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onReport(comment);
            }}
            className="w-full min-h-11 flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface)] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
          >
            <Flag size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--danger)]" />
            <span>Report</span>
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete(comment.id);
            }}
            className="w-full min-h-11 flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--surface)] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
          >
            <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>Delete</span>
          </button>
        )}
      </FloatingMenu>
    </div>
  );
}


export function CommentThread({
  postId,
  initialComments = [],
  currentUserId = null,
  isStaff = false,
  viewerHideFlagged = true,
}) {
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [reportingComment, setReportingComment] = useState(null);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editBody, setEditBody] = useState("");
  const [isEditingPending, setIsEditingPending] = useState(false);
  const { addToast } = useToast();

  const handleSaveEdit = async (e, commentId) => {
    e.preventDefault();
    const clean = editBody.trim();
    if (!clean) return;

    setIsEditingPending(true);
    try {
      const res = await editCommentAction(commentId, clean);
      if (res?.ok) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === commentId) return { ...c, body: clean, is_flagged: res.comment?.is_flagged ?? c.is_flagged };
            return c;
          })
        );
        setEditingCommentId(null);
        setEditBody("");
        addToast("Comment updated.");
      } else {
        addToast(res?.error || "Failed to edit comment.", "error");
      }
    } catch (err) {
      console.error("Failed to edit comment:", err);
      addToast("Network error editing comment.", "error");
    } finally {
      setIsEditingPending(false);
    }
  };

  const handlePostComment = (e) => {
    e.preventDefault();
    if (!currentUserId) {
      addToast("Please sign in to comment.", "error");
      return;
    }
    const commentBody = text.trim();
    if (!commentBody) return;

    const parent = replyingTo;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    
    // Create optimistic comment
    const optimisticComment = {
      id: tempId,
      postId,
      parentId: parent?.id || null,
      body: commentBody,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      author: {
        username: "you",
        display_name: "You",
        avatar_url: null,
      },
    };

    // Update UI instantly
    setComments((prev) => [...prev, optimisticComment]);
    setText("");
    setReplyingTo(null);

    // Sync in background
    createCommentAction(postId, commentBody, parent?.id)
      .then((res) => {
        if (res?.ok && res.comment) {
          // Replace temp comment with permanent comment
          setComments((prev) =>
            prev.map((c) => (c.id === tempId ? res.comment : c))
          );
        } else {
          // Rollback on error
          setComments((prev) => prev.filter((c) => c.id !== tempId));
          setText(commentBody);
          if (parent) setReplyingTo(parent);
          addToast(res?.error || "Failed to post comment.", "error");
        }
      })
      .catch((err) => {
        console.error("Failed to post comment:", err);
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setText(commentBody);
        if (parent) setReplyingTo(parent);
        addToast("Network error posting comment.", "error");
      });
  };

  const handleDeleteComment = (commentId) => {
    setCommentToDelete(commentId);
  };

  const handleConfirmDelete = async () => {
    if (!commentToDelete) return;
    const commentId = commentToDelete;
    setIsDeleting(true);

    const prevComments = comments;
    const idsToDelete = new Set([commentId]);
    let added = true;
    while (added) {
      added = false;
      for (const c of comments) {
        const pid = c.parentId || c.parent_id;
        if (!idsToDelete.has(c.id) && pid && idsToDelete.has(pid)) {
          idsToDelete.add(c.id);
          added = true;
        }
      }
    }
    setComments((prev) => prev.filter((c) => !idsToDelete.has(c.id)));
    setCommentToDelete(null);

    try {
      const res = await deleteCommentAction(commentId, postId);
      if (res?.ok) {
        addToast("Comment deleted.");
      } else {
        setComments(prevComments);
        addToast(res?.error || "Failed to delete comment.", "error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setComments(prevComments);
      addToast("Network error deleting comment.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Build hierarchical comment tree supporting multi-level replies
  const commentTree = useMemo(() => {
    const map = new Map();
    const roots = [];
    comments.forEach((c) => {
      map.set(c.id, { ...c, replies: [] });
    });
    comments.forEach((c) => {
      const node = map.get(c.id);
      const parentId = c.parentId || c.parent_id;
      if (parentId && map.has(parentId)) {
        map.get(parentId).replies.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }, [comments]);

  const renderCommentItem = (comment, depth = 0) => {
    const isCommentAuthor = Boolean(
      currentUserId &&
        (comment.authorId === currentUserId ||
          comment.author_id === currentUserId ||
          comment.author?.id === currentUserId ||
          comment.userId === currentUserId ||
          comment.user_id === currentUserId ||
          comment.isOwner)
    );
    const replies = comment.replies || [];
    const avatarSize = depth > 0 ? 20 : 24;

    return (
      <div key={comment.id} className="space-y-2 animate-fadeIn">
        <div className="flex items-start justify-between gap-3 group">
          <div className="flex items-start gap-2.5 min-w-0">
            <Link href={`/u/${comment.author?.username}`} className="shrink-0 pt-0.5">
              <Avatar
                src={comment.author?.avatar_url}
                alt={getDisplayName(comment.author)}
                name={getDisplayName(comment.author)}
                size={avatarSize}
              />
            </Link>
            <div className="text-sm leading-snug break-words flex-1">
              <Link
                href={`/u/${comment.author?.username}`}
                className="font-semibold text-[var(--ink)] hover:underline mr-2"
              >
                <UserName profile={comment.author} />
              </Link>
              {editingCommentId === comment.id ? (
                <form onSubmit={(e) => handleSaveEdit(e, comment.id)} className="mt-1.5 flex items-center gap-2">
                  <input
                    type="text"
                    value={editBody}
                    maxLength={LIMITS.COMMENT_BODY_MAX}
                    onChange={(e) => setEditBody(e.target.value)}
                    disabled={isEditingPending}
                    autoFocus
                    className="flex-1 px-2.5 py-1 text-xs border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
                  />
                  <Button type="submit" size="sm" disabled={!editBody.trim() || isEditingPending} className="h-7 text-xs px-2.5">
                    Save
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCommentId(null);
                      setEditBody("");
                    }}
                    className="min-h-11 inline-flex items-center px-2 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer rounded"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <FlaggedContent
                  key={`comment-${comment.id}`}
                  isFlagged={Boolean(comment.is_flagged ?? comment.isFlagged)}
                  defaultHidden={
                    isCommentAuthor || isStaff
                      ? false
                      : viewerHideFlagged !== false
                  }
                  contentType="comment"
                >
                  <span className="text-[var(--ink)]">{comment.body}</span>
                </FlaggedContent>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-[var(--ink-muted)]">
                <span suppressHydrationWarning>{formatRelativeTime(comment.createdAt)}</span>
                {currentUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(comment);
                      const el = document.getElementById(`comment-input-${postId}`);
                      if (el) el.focus();
                    }}
                    className="min-h-11 inline-flex items-center px-2 -mx-2 hover:text-[var(--ink)] font-medium cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
                  >
                    Reply
                  </button>
                )}
                {isCommentAuthor && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditBody(comment.body);
                    }}
                    className="min-h-11 inline-flex items-center px-2 -mx-2 hover:text-[var(--ink)] font-medium cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>

          <CommentActions
            comment={comment}
            currentUserId={currentUserId}
            isStaff={isStaff}
            onDelete={handleDeleteComment}
            onReport={setReportingComment}
            onEdit={(c) => {
              setEditingCommentId(c.id);
              setEditBody(c.body);
            }}
          />
        </div>

        {/* Nested Replies */}
        {replies.length > 0 && (
          <div className="pl-6 sm:pl-8 space-y-2 border-l-2 border-[var(--surface-strong)] ml-3">
            {replies.map((reply) => renderCommentItem(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Existing Comments List */}
      <div className="space-y-3">
        {commentTree.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)] py-4 text-center">
            No comments yet. Start the conversation.
          </p>
        ) : (
          commentTree.map((comment) => renderCommentItem(comment, 0))
        )}
      </div>

      {/* Input Box / Sign-in prompt for guests */}
      {currentUserId ? (
        <form onSubmit={handlePostComment} className="pt-3 border-t border-[var(--line)]">
          {replyingTo && (
            <div className="flex items-center justify-between bg-[var(--surface)] px-3 py-1.5 rounded-t text-xs text-[var(--ink-muted)]">
              <span className="flex items-center gap-1">
                <CornerDownRight size={12} strokeWidth={1.75} aria-hidden="true" />
                Replying to <span className="font-semibold text-[var(--ink)]">{getDisplayName(replyingTo.author)}</span>
              </span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="min-h-11 inline-flex items-center px-2 -mx-2 font-medium hover:text-[var(--ink)] cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              id={`comment-input-${postId}`}
              type="text"
              value={text}
              maxLength={LIMITS.COMMENT_BODY_MAX}
              onChange={(e) => setText(e.target.value)}
              placeholder={replyingTo ? `Reply to ${getDisplayName(replyingTo.author)}...` : "Add a comment..."}
              className="flex-1 px-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
            />
            <Button
              type="submit"
              disabled={!text.trim()}
              className="shrink-0 text-sm"
            >
              Post
            </Button>
          </div>
        </form>
      ) : (
        <div className="pt-3 border-t border-[var(--line)] text-center py-3 text-xs text-[var(--ink-muted)]">
          <Link href="/sign-in" className="text-[var(--accent)] font-semibold hover:underline">
            Sign in
          </Link>{" "}
          to comment.
        </div>
      )}

      {reportingComment && (
        <ReportDialog
          open={Boolean(reportingComment)}
          onClose={() => setReportingComment(null)}
          targetType="comment"
          targetId={reportingComment.id}
        />
      )}

      <ConfirmDialog
        open={Boolean(commentToDelete)}
        onOpenChange={(open) => !open && setCommentToDelete(null)}
        title="Delete this comment?"
        description="This action cannot be undone. The comment and any replies will be permanently removed."
        confirmLabel="Delete comment"
        cancelLabel="Cancel"
        destructive={true}
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
