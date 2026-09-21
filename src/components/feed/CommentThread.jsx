"use client";
import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { createCommentAction, deleteCommentAction } from "@/server/actions/interactions";
import { formatRelativeTime } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { Trash2, CornerDownRight } from "lucide-react";
import { LIMITS } from "@/lib/constants";

export function CommentThread({ postId, initialComments = [], currentUserId = null }) {
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const { addToast } = useToast();

  const handlePostComment = (e) => {
    e.preventDefault();
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
                    <Link href={`/u/${comment.author?.username}`}>
                      <Avatar
                        src={comment.author?.avatar_url}
                        alt={comment.author?.display_name || "User"}
                        size="sm"
                      />
                    </Link>
                    <div className="text-sm leading-snug break-words">
                      <Link
                        href={`/u/${comment.author?.username}`}
                        className="font-semibold text-[var(--ink)] hover:underline mr-2"
                      >
                        {comment.author?.username}
                      </Link>
                      <span className="text-[var(--ink)]">{comment.body}</span>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--ink-muted)]">
                        <span suppressHydrationWarning>{formatRelativeTime(comment.createdAt)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTo(comment);
                            const el = document.getElementById(`comment-input-${postId}`);
                            if (el) el.focus();
                          }}
                          className="hover:text-[var(--ink)] font-medium cursor-pointer"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>

                  {(currentUserId === (comment.authorId || comment.author?.id) || comment.isOwner) && (
                    <IconButton
                      label="Delete comment"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" className="text-[var(--danger)]" />
                    </IconButton>
                  )}
                </div>

                {/* Nested Replies */}
                {replies.length > 0 && (
                  <div className="pl-8 space-y-2 border-l-2 border-[var(--surface-strong)] ml-3">
                    {replies.map((reply) => (
                      <div key={reply.id} className="flex items-start justify-between gap-2 group animate-fadeIn">
                        <div className="flex items-start gap-2 min-w-0">
                          <Link href={`/u/${reply.author?.username}`}>
                            <Avatar
                              src={reply.author?.avatar_url}
                              alt={reply.author?.display_name || "User"}
                              size="xs"
                            />
                          </Link>
                          <div className="text-sm leading-snug break-words">
                            <Link
                              href={`/u/${reply.author?.username}`}
                              className="font-semibold text-[var(--ink)] hover:underline mr-1.5"
                            >
                              {reply.author?.username}
                            </Link>
                            <span className="text-[var(--ink)]">{reply.body}</span>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--ink-muted)]">
                              <span suppressHydrationWarning>{formatRelativeTime(reply.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {(currentUserId === (reply.authorId || reply.author?.id) || reply.isOwner) && (
                          <IconButton
                            label="Delete reply"
                            onClick={() => handleDeleteComment(reply.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={13} strokeWidth={1.75} aria-hidden="true" className="text-[var(--danger)]" />
                          </IconButton>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input Box */}
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
              className="font-medium hover:text-[var(--ink)]"
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
    </div>
  );
}
