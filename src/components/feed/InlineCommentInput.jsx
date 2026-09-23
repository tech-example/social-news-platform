"use client";
import { useState } from "react";
import { createCommentAction } from "@/server/actions/interactions";
import { useToast } from "@/components/ui/toast";

export function InlineCommentInput({ postId, onCommentPosted, currentUserId = null }) {
  const [text, setText] = useState("");
  const { addToast } = useToast();

  if (!currentUserId) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const commentBody = text.trim();
    if (!commentBody) return;

    // Instant optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimisticComment = {
      id: tempId,
      postId,
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
    if (onCommentPosted) onCommentPosted(optimisticComment);

    // Background sync
    createCommentAction(postId, commentBody)
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

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
      <input
        id={`comment-input-${postId}`}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment..."
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
  );
}
