"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { createPostAction } from "@/server/actions/posts";
import { useToast } from "@/components/ui/toast";
import { compressImage, formatFileSize } from "@/lib/compress-image";
import { ImagePlus, X, Hash, LoaderCircle } from "lucide-react";
import { LIMITS } from "@/lib/constants";

export function PostComposer() {
  const router = useRouter();
  const { addToast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (!clean) return;
    if (tags.length >= LIMITS.POST_MAX_TAGS) {
      addToast(`Maximum ${LIMITS.POST_MAX_TAGS} tags allowed.`, "error");
      return;
    }
    if (tags.includes(clean)) {
      setTagInput("");
      return;
    }
    setTags([...tags, clean]);
    setTagInput("");
  };

  const handleRemoveTag = (t) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Compress image before uploading
      setUploadStatus("Compressing...");
      const { file: compressedFile, originalSize, compressedSize } = await compressImage(file);

      setUploadStatus("Uploading...");
      const formData = new FormData();
      formData.append("file", compressedFile);

      const res = await fetch("/api/upload-url", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setImageUrl(data.url);
        if (compressedSize < originalSize) {
          const reduction = Math.round((1 - compressedSize / originalSize) * 100);
          addToast(`Image compressed: ${formatFileSize(originalSize)} to ${formatFileSize(compressedSize)} (${reduction}% smaller)`);
        } else {
          addToast("Image uploaded successfully.");
        }
      } else {
        addToast(data.error || "Failed to upload image.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error uploading file.", "error");
    } finally {
      setIsUploading(false);
      setUploadStatus("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!body.trim()) {
      addToast("Post body cannot be empty.", "error");
      return;
    }

    startTransition(async () => {
      const res = await createPostAction({
        title: title.trim() || undefined,
        body: body.trim(),
        imageUrl: imageUrl.trim() || undefined,
        tags,
      });

      if (res.ok) {
        addToast("Post published successfully!");
        router.push(res.postId ? `/p/${res.postId}` : "/");
      } else {
        addToast(res.error || "Failed to create post.", "error");
      }
    });
  };

  return (
    <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-4 sm:p-6 shadow-xs max-w-xl mx-auto">
      <h1 className="text-xl font-bold text-[var(--ink)] mb-4">Create New Post</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Optional Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="post-title" className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
            Title (Optional)
          </label>
          <input
            id="post-title"
            type="text"
            value={title}
            maxLength={LIMITS.POST_TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your post a title..."
            className="w-full px-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
          />
        </div>

        {/* Body Textarea */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="post-body" className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
            Caption & Content *
          </label>
          <textarea
            id="post-body"
            rows={5}
            value={body}
            maxLength={LIMITS.POST_BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your news update, opinion, or story..."
            required
            className="w-full px-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
          />
          <div className="flex justify-end text-xs text-[var(--ink-muted)] tabular-nums">
            {body.length} / {LIMITS.POST_BODY_MAX}
          </div>
        </div>

        {/* Media / Image */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
            Cover Image (Optional)
          </span>

          {imageUrl ? (
            <div className="relative aspect-4/3 w-full max-h-60 rounded-lg overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
              <Image
                src={imageUrl}
                alt="Post preview"
                fill
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                aria-label="Remove image"
              >
                <X size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-[var(--line)] rounded-lg cursor-pointer hover:bg-[var(--surface)] transition-colors text-sm text-[var(--ink-muted)] font-medium">
                {isUploading ? (
                  <LoaderCircle size={18} strokeWidth={1.75} className="animate-spin" aria-hidden="true" />
                ) : (
                  <ImagePlus size={18} strokeWidth={1.75} aria-hidden="true" />
                )}
                <span>{isUploading ? (uploadStatus || "Processing...") : "Upload Image"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="sr-only"
                />
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Or paste image URL..."
                className="flex-1 px-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
              />
            </div>
          )}
        </div>

        {/* Hashtags */}
        <div className="flex flex-col gap-2">
          <label htmlFor="tag-input" className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
            Hashtags (Up to 10)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash size={16} strokeWidth={1.75} aria-hidden="true" className="absolute left-3 top-2.5 text-[var(--ink-muted)]" />
              <input
                id="tag-input"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="news, politics, tech..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
              />
            </div>
            <Button variant="secondary" type="button" onClick={handleAddTag}>
              Add Tag
            </Button>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--surface-strong)] text-[var(--ink)] border border-[var(--line)]"
                >
                  #{t}
                  <IconButton label={`Remove tag ${t}`} onClick={() => handleRemoveTag(t)}>
                    <X size={12} strokeWidth={2} aria-hidden="true" className="text-[var(--ink-muted)] hover:text-[var(--danger)]" />
                  </IconButton>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--line)]">
          <Button variant="ghost" type="button" onClick={() => router.back()} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || isUploading || !body.trim()}>
            {isPending ? "Publishing..." : "Publish Post"}
          </Button>
        </div>
      </form>
    </div>
  );
}
