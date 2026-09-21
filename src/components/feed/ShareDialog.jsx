"use client";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { sharePostAction } from "@/server/actions/interactions";
import { useToast } from "@/components/ui/toast";
import { LIMITS } from "@/lib/constants";

export function ShareDialog({ open, onClose, postId, postTitle, onShareSuccess }) {
  const [note, setNote] = useState("");
  const { addToast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    const shareNote = note.trim();
    
    // Close modal and update UI instantly
    setNote("");
    onClose();
    if (onShareSuccess) onShareSuccess();
    addToast("Post shared to your profile.");

    // Sync in background
    sharePostAction(postId, shareNote).then((res) => {
      if (!res?.ok) {
        addToast(res?.error || "Failed to share post.", "error");
      }
    }).catch((err) => {
      console.error("Share error:", err);
      addToast("Network error sharing post.", "error");
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Share Post">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {postTitle && (
          <div className="p-3 bg-[var(--surface)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink-muted)]">
            Sharing: <span className="font-semibold text-[var(--ink)]">{postTitle}</span>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="share-note" className="text-sm font-medium text-[var(--ink)]">
            Add a note (optional)
          </label>
          <textarea
            id="share-note"
            rows={3}
            value={note}
            maxLength={LIMITS.SHARE_NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What do you think about this?"
            className="w-full px-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
          />
          <div className="flex justify-end text-xs text-[var(--ink-muted)] tabular-nums">
            {note.length} / {LIMITS.SHARE_NOTE_MAX}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Share Now
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
