"use client";
import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { editPostAction } from "@/server/actions/posts";
import { useToast } from "@/components/ui/toast";
import { LIMITS } from "@/lib/constants";
import { Hash, X } from "lucide-react";

export function EditPostDialog({ open, onClose, post, onPostUpdated }) {
  const [title, setTitle] = useState(post.title || "");
  const [body, setBody] = useState(post.body || "");
  const [tags, setTags] = useState(post.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (!clean) return;
    if (tags.length >= LIMITS.POST_MAX_TAGS) {
      addToast(`Maximum ${LIMITS.POST_MAX_TAGS} tags allowed.`, "error");
      return;
    }
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (t) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!body.trim()) {
      addToast("Post content cannot be empty.", "error");
      return;
    }

    startTransition(async () => {
      const res = await editPostAction(post.id, {
        title: title.trim() || undefined,
        body: body.trim(),
        imageUrl: post.imageUrl || undefined,
        tags,
      });

      if (res?.ok) {
        addToast("Post updated successfully.");
        if (onPostUpdated) {
          onPostUpdated({
            title: title.trim() || null,
            body: body.trim(),
            tags,
          });
        }
        onClose();
      } else {
        addToast(res?.error || "Failed to update post.", "error");
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Edit Post">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-title" className="text-sm font-semibold text-[var(--ink)]">
            Title (optional)
          </label>
          <input
            id="edit-title"
            type="text"
            value={title}
            maxLength={LIMITS.POST_TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title..."
            className="w-full px-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-body" className="text-sm font-semibold text-[var(--ink)]">
            Content
          </label>
          <textarea
            id="edit-body"
            rows={5}
            required
            value={body}
            maxLength={LIMITS.POST_BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your news or thought..."
            className="w-full px-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] resize-none"
          />
          <div className="flex justify-end text-xs text-[var(--ink-muted)] tabular-nums">
            {body.length} / {LIMITS.POST_BODY_MAX}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-[var(--ink)]">
            Hashtags
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-[var(--ink-muted)]">#</span>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="tag (press Enter)"
                className="w-full pl-7 pr-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)]"
              />
            </div>
            <Button type="button" variant="secondary" onClick={handleAddTag}>
              Add
            </Button>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)]"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-[var(--danger)] cursor-pointer"
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--line)]">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
