"use client";
import { useState, useRef, useEffect } from "react";
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

function CommentActions({ comment, currentUserId, isStaff, onDelete, onReport, onEdit }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
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
  // - Delete: visible per the rule from the previous fix (author with role moderator/admin, or any moderator/admin regardless of authorship).
  // - Report: visible to any signed-in user who is NOT the comment's author, regardless of role.
  const canEdit = Boolean(isAuthor);
  const canDelete = Boolean(isStaff);
  const canReport = Boolean(!isAuthor && currentUserId);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const hasMenuActions = Boolean(canEdit || canDelete || canReport);
  if (!hasMenuActions) return null;

  return (
    <div className="flex items-center gap-1 shrink-0" ref={menuRef}>
      {canDelete && (
        <IconButton
          label={comment.parentId ? "Delete reply" : "Delete comment"}
          onClick={() => onDelete(comment.id)}
          className="text-[var(--danger)]/80 hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 focus-visible:outline-[var(--accent-bright)]"
        >
          <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
        </IconButton>
      )}

      <div className="relative">
        <IconButton
          label="Comment options"
          pressed={open}
          onClick={() => setOpen((prev) => !prev)}
          className="text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] focus-visible:outline-[var(--accent-bright)]"
        >
          <Ellipsis size={16} strokeWidth={1.75} aria-hidden="true" />
        </IconButton>

        {open && (
          <div
            role="menu"
            aria-label="Comment options"
            className="absolute right-0 top-full mt-1 w-40 bg-[var(--bg)] border border-[var(--line)] rounded-xl shadow-lg py-1 z-20"
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
          </div>
        )}
      </div>
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
    if (window.confirm("Are you sure you want to delete this comment?")) {
      // Optimistically remove comment
      const prevComments = comments;
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
      
      deleteCommentAction(commentId, postId)
        .then((res) => {
          if (res?.ok) {
            addToast("Comment deleted.");
          } else {
            setComments(prevComments);
            addToast(res?.error || "Failed to delete comment.", "error");
          }
        })
        .catch((err) => {
          console.error("Delete error:", err);
          setComments(prevComments);
          addToast("Network error deleting comment.", "error");
        });
    }
  };

  // Organize top-level comments and their replies
  const rootComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId) => comments.filter((c) => c.parentId === parentId);

  return (
    <div className="flex flex-col gap-4">
      {/* Existing Comments List */}
      <div className="space-y-3">
        {rootComments.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)] py-4 text-center">
            No comments yet. Start the conversation.
          </p>
        ) : (
          rootComments.map((comment) => {
            const replies = getReplies(comment.id);
            return (
              <div key={comment.id} className="space-y-2 animate-fadeIn">
                <div className="flex items-start justify-between gap-3 group">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Link href={`/u/${comment.author?.username}`} className="shrink-0 pt-0.5">
                      <Avatar
                        src={comment.author?.avatar_url}
                        alt={comment.author?.display_name || comment.author?.username || "User"}
                        name={comment.author?.display_name || comment.author?.username}
                        size={24}
                      />
                    </Link>
                    <div className="text-sm leading-snug break-words flex-1">
                      <Link
                        href={`/u/${comment.author?.username}`}
                        className="font-semibold text-[var(--ink)] hover:underline mr-2"
                      >
                        {comment.author?.username}
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
                            (Boolean(currentUserId && (comment.authorId === currentUserId || comment.author?.id === currentUserId || comment.userId === currentUserId)) || isStaff)
                              ? false
                              : (viewerHideFlagged !== false)
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
                        {Boolean(currentUserId && (comment.authorId === currentUserId || comment.author?.id === currentUserId || comment.userId === currentUserId || comment.isOwner)) && (
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
                  <div className="pl-8 space-y-2 border-l-2 border-[var(--surface-strong)] ml-3">
                    {replies.map((reply) => (
                      <div key={reply.id} className="flex items-start justify-between gap-2 group animate-fadeIn">
                        <div className="flex items-start gap-2 min-w-0">
                          <Link href={`/u/${reply.author?.username}`} className="shrink-0 pt-0.5">
                            <Avatar
                              src={reply.author?.avatar_url}
                              alt={reply.author?.display_name || reply.author?.username || "User"}
                              name={reply.author?.display_name || reply.author?.username}
                              size={20}
                            />
                          </Link>
                          <div className="text-sm leading-snug break-words flex-1">
                            <Link
                              href={`/u/${reply.author?.username}`}
                              className="font-semibold text-[var(--ink)] hover:underline mr-1.5"
                            >
                              {reply.author?.username}
                            </Link>
                            {editingCommentId === reply.id ? (
                              <form onSubmit={(e) => handleSaveEdit(e, reply.id)} className="mt-1 flex items-center gap-2">
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
                                key={`reply-${reply.id}`}
                                isFlagged={Boolean(reply.is_flagged ?? reply.isFlagged)}
                                defaultHidden={
                                  (Boolean(currentUserId && (reply.authorId === currentUserId || reply.author?.id === currentUserId || reply.userId === currentUserId)) || isStaff)
                                    ? false
                                    : (viewerHideFlagged !== false)
                                }
                                contentType="comment"
                              >
                                <span className="text-[var(--ink)]">{reply.body}</span>
                              </FlaggedContent>
                            )}
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--ink-muted)]">
                              <span suppressHydrationWarning>{formatRelativeTime(reply.createdAt)}</span>
                              {currentUserId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingTo(reply);
                                    const el = document.getElementById(`comment-input-${postId}`);
                                    if (el) el.focus();
                                  }}
                                  className="min-h-11 inline-flex items-center px-2 -mx-2 hover:text-[var(--ink)] font-medium cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
                                >
                                  Reply
                                </button>
                              )}
                              {Boolean(currentUserId && (reply.authorId === currentUserId || reply.author?.id === currentUserId || reply.userId === currentUserId || reply.isOwner)) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(reply.id);
                                    setEditBody(reply.body);
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
                          comment={reply}
                          currentUserId={currentUserId}
                          isStaff={isStaff}
                          onDelete={handleDeleteComment}
                          onReport={setReportingComment}
                          onEdit={(r) => {
                            setEditingCommentId(r.id);
                            setEditBody(r.body);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input Box / Sign-in prompt for guests */}
      {currentUserId ? (
        <form onSubmit={handlePostComment} className="pt-3 border-t border-[var(--line)]">
          {replyingTo && (
            <div className="flex items-center justify-between bg-[var(--surface)] px-3 py-1.5 rounded-t text-xs text-[var(--ink-muted)]">
              <span className="flex items-center gap-1">
                <CornerDownRight size={12} strokeWidth={1.75} aria-hidden="true" />
                Replying to <span className="font-semibold text-[var(--ink)]">@{replyingTo.author?.username}</span>
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
              placeholder={replyingTo ? `Reply to @${replyingTo.author?.username}...` : "Add a comment..."}
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
    </div>
  );
}
