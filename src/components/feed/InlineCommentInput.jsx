"use client";
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createCommentAction } from "@/server/actions/interactions";
import { useToast } from "@/components/ui/toast";
import { getDisplayName } from "@/lib/user";

export function InlineCommentInput({
  postId,
  onCommentPosted,
  currentUserId = null,
  replyingTo = null,
  onCancelReply = null,
}) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  if (!currentUserId) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const commentBody = text.trim();
    if (!commentBody) return;

    const parentId = replyingTo?.id || null;

    // Instant optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimisticComment = {
      id: tempId,
      postId,
      parentId,
      body: commentBody,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      author: {
        username: "you",
        display_name: "You",
        avatar_url: null,
      },
    };

    // Clear input immediately and notify parent
    setText("");
    if (onCancelReply) onCancelReply();
    if (onCommentPosted) onCommentPosted(optimisticComment);

    // Background sync
    createCommentAction(postId, commentBody, parentId)
      .then((res) => {
        if (res?.ok && res?.comment) {
          if (onCommentPosted) onCommentPosted(res.comment, tempId);
        } else if (!res?.ok) {
          addToast(res?.error || "Failed to post comment.", "error");
          setText(commentBody);
        }
      })
      .catch((err) => {
        console.error("Comment submission error:", err);
        addToast("Network error posting comment.", "error");
        setText(commentBody);
      });
  };

  const replyName = replyingTo ? getDisplayName(replyingTo.author || replyingTo) : "";

  return (
    <div className="mt-2">
      {replyingTo && (
        <div className="flex items-center justify-between text-xs text-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 rounded-md mb-1.5 border border-[var(--accent)]/20">
          <span>Replying to <strong>{replyName}</strong></span>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer p-0.5 rounded"
            aria-label="Cancel reply"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          id={`comment-input-${postId}`}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={replyingTo ? `Reply to ${replyName}...` : "Add a comment..."}
          maxLength={500}
          className="flex-1 px-3 py-1.5 text-sm border-0 bg-transparent text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="text-sm font-semibold text-[var(--accent-bright)] disabled:opacity-30 hover:text-[var(--accent)] transition-colors cursor-pointer disabled:cursor-default"
        >
          Post
        </button>
      </form>
    </div>
  );
}
