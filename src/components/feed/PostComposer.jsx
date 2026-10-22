"use client";
import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { createPostAction } from "@/server/actions/posts";
import { useToast } from "@/components/ui/toast";
import {
  ImagePlus,
  Upload,
  ImageOff,
  AlertCircle,
  X,
  Hash,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { LIMITS } from "@/lib/constants";

/**
 * Format file size into a human-readable string.
 */
function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extract hashtags from body text. Matches #word patterns.
 */
function extractHashtagsFromText(text) {
  const matches = text.match(/#([a-zA-Z0-9_]+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

const ALLOWED_MIME_TYPES = new Set(LIMITS.ALLOWED_IMAGE_TYPES);
const ALLOWED_EXTS = LIMITS.ALLOWED_IMAGE_EXTENSIONS;

export function PostComposer() {
  const router = useRouter();
  const { addToast } = useToast();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);

  // Local-only image state (never uploaded to Storage until post submission)
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileError, setFileError] = useState("");
  const [dragState, setDragState] = useState("idle"); // "idle" | "valid" | "invalid"

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const dragCounterRef = useRef(0);

  // Keep previewUrlRef in sync and cleanup on unmount to prevent memory leaks
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  /**
   * Validate a file client-side before previewing.
   */
  const validateFile = useCallback((file) => {
    if (!file) {
      return { valid: false, error: "No file selected." };
    }

    const name = file.name || "";
    const lowerName = name.toLowerCase();
    const hasValidExt = ALLOWED_EXTS.some((ext) => lowerName.endsWith(ext));
    const hasValidMime = file.type ? ALLOWED_MIME_TYPES.has(file.type.toLowerCase()) : false;

    // Check extension and mime type
    if (!hasValidExt && !hasValidMime) {
      return {
        valid: false,
        error: "This file type isn't supported. Use JPEG, PNG, WebP, GIF, or AVIF.",
      };
    }

    // Enforce size limits: 10MB for GIF (animation headroom), 5MB for static images
    const isGif = file.type === "image/gif" || lowerName.endsWith(".gif");
    const maxBytes = isGif ? LIMITS.MAX_UPLOAD_GIF_BYTES : LIMITS.MAX_UPLOAD_IMAGE_BYTES;
    const maxMB = isGif ? "10MB" : "5MB";

    if (file.size > maxBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File is too large (${sizeMB}MB). Maximum allowed is ${maxMB}.`,
      };
    }

    return { valid: true };
  }, []);

  /**
   * Select a valid image file, revoking the previous preview URL if one exists.
   */
  const handleFileSelection = useCallback((file) => {
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setFileError(validation.error);
      return;
    }

    // Revoke previous object URL if replacing an image
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setImageFile(file);
    setPreviewUrl(objectUrl);
    setFileError("");
  }, [validateFile]);

  /**
   * Remove selected image without any server round-trip.
   */
  const handleRemoveImage = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setImageFile(null);
    setPreviewUrl(null);
    setFileError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  /**
   * Drag-and-drop event handlers with visual state indication.
   */
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;

    const items = Array.from(e.dataTransfer?.items || []);
    if (items.length > 0) {
      const hasFiles = items.some((item) => item.kind === "file");
      if (!hasFiles) {
        setDragState("invalid");
        setFileError("This file type isn't supported. Use JPEG, PNG, WebP, GIF, or AVIF.");
        return;
      }

      // Check if item mime type is explicitly known and unsupported
      const knownMimes = items
        .filter((item) => item.kind === "file" && item.type)
        .map((item) => item.type.toLowerCase());

      if (knownMimes.length > 0) {
        const anyValid = knownMimes.some((type) => ALLOWED_MIME_TYPES.has(type));
        if (!anyValid) {
          setDragState("invalid");
          setFileError("This file type isn't supported. Use JPEG, PNG, WebP, GIF, or AVIF.");
          return;
        }
      }
      setDragState("valid");
    } else {
      setDragState("valid");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = dragState === "invalid" ? "none" : "copy";
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDragState("idle");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDragState("idle");

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) {
      // Reject dropped text or external URLs per Step 5
      const textData = e.dataTransfer?.getData("text/plain");
      if (textData) {
        setFileError("External image URLs cannot be dropped. Please upload or drop an image file.");
      }
      return;
    }

    handleFileSelection(files[0]);
  };

  /**
   * Clipboard paste handler: only accepts image files from clipboard, never text URLs.
   */
  const handlePaste = useCallback(
    (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFileSelection(file);
            return;
          }
        }
      }
      // If text/URL was pasted, standard browser handling applies for text inputs,
      // but it will NEVER be interpreted or accepted as an image source.
    },
    [handleFileSelection]
  );

  const handleAddTag = useCallback(
    (tagName) => {
      const clean = (tagName || tagInput).trim().replace(/^#/, "").toLowerCase();
      if (!clean) return;
      if (tags.length >= LIMITS.POST_MAX_TAGS) {
        addToast(`Maximum ${LIMITS.POST_MAX_TAGS} tags allowed.`, "error");
        return;
      }
      if (tags.includes(clean)) {
        if (!tagName) setTagInput("");
        return;
      }
      setTags((prev) => [...prev, clean]);
      if (!tagName) setTagInput("");
    },
    [tagInput, tags, addToast]
  );

  const handleRemoveTag = (t) => {
    setTags(tags.filter((item) => item !== t));
  };

  // Auto-detect hashtags in body when user types space after #word
  const handleBodyChange = (e) => {
    const val = e.target.value;
    setBody(val);

    if (val.endsWith(" ") || val.endsWith("\n")) {
      const words = val.trimEnd().split(/\s+/);
      const lastWord = words[words.length - 1];
      if (lastWord && /^#[a-zA-Z0-9_]{1,}$/.test(lastWord)) {
        const tagName = lastWord.slice(1).toLowerCase();
        if (!tags.includes(tagName) && tags.length < LIMITS.POST_MAX_TAGS) {
          setTags((prev) => [...prev, tagName]);
        }
      }
    }
  };

  /**
   * Submit the post. Sends multipart form data with the raw image file to the server.
   * Compression, format conversion (including animated GIF to animated WebP), dual sizing,
   * and Supabase Storage upload happen authoritatively server-side on submit.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) {
      addToast("Post body cannot be empty.", "error");
      return;
    }

    const bodyTags = extractHashtagsFromText(body);
    const allTags = [...new Set([...tags, ...bodyTags])].slice(0, LIMITS.POST_MAX_TAGS);

    setIsSubmitting(true);
    setSubmitStatus(imageFile ? "Optimizing & uploading image..." : "Publishing post...");

    try {
      const formData = new FormData();
      if (title.trim()) {
        formData.append("title", title.trim());
      }
      formData.append("body", body.trim());
      if (allTags.length > 0) {
        formData.append("tags", JSON.stringify(allTags));
      }
      if (imageFile) {
        formData.append("image", imageFile);
      }

      startTransition(async () => {
        try {
          const res = await createPostAction(formData);

          if (res.ok) {
            addToast("Post published successfully!");
            if (previewUrlRef.current) {
              URL.revokeObjectURL(previewUrlRef.current);
              previewUrlRef.current = null;
            }
            router.push(res.postId ? `/p/${res.postId}` : "/");
          } else {
            addToast(res.error || "Failed to create post.", "error");
            setIsSubmitting(false);
            setSubmitStatus("");
          }
        } catch (err) {
          console.error("Submission error:", err);
          addToast("Failed to create post. Please try again.", "error");
          setIsSubmitting(false);
          setSubmitStatus("");
        }
      });
    } catch (err) {
      console.error(err);
      addToast("An unexpected error occurred.", "error");
      setIsSubmitting(false);
      setSubmitStatus("");
    }
  };

  const isBusy = isSubmitting || isPending;
  const isGif = imageFile?.type === "image/gif" || imageFile?.name?.toLowerCase().endsWith(".gif");

  return (
    <div
      onPaste={handlePaste}
      className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-4 sm:p-6 shadow-xs max-w-xl mx-auto"
    >
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
            disabled={isBusy}
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
            onChange={handleBodyChange}
            disabled={isBusy}
            placeholder="Write your news update, opinion, or story... Use #hashtags to tag your post"
            required
            className="w-full px-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
          />
          <div className="flex justify-between text-xs text-[var(--ink-muted)] tabular-nums">
            <span className="text-[var(--accent)]">Tip: Type #tag then space to auto-add hashtags</span>
            <span>
              {body.length} / {LIMITS.POST_BODY_MAX}
            </span>
          </div>
        </div>

        {/* Image Attachment Dropzone & Preview (Pure local state until submit) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
              Cover Image (Optional)
            </span>
            {previewUrl && (
              <span className="text-xs text-[var(--ink-muted)]">Held locally until post is published</span>
            )}
          </div>

          {/* Hidden native file input for accessibility and click-to-browse */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelection(file);
            }}
            disabled={isBusy}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />

          {previewUrl && imageFile ? (
            /* Selected Image Preview State */
            <div className="relative rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2">
              <div className="relative w-full max-h-72 aspect-16/10 rounded-md overflow-hidden bg-[var(--surface-strong)] flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Post preview"
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={isBusy}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black/90 focus-visible:outline-2 focus-visible:outline-white transition-colors cursor-pointer"
                  aria-label="Remove image"
                >
                  <X size={16} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>

              {/* File details & change button */}
              <div className="flex items-center justify-between gap-2 pt-2 px-1 text-xs">
                <div className="flex items-center gap-1.5 min-w-0 text-[var(--ink-muted)]">
                  <span className="truncate font-medium text-[var(--ink)]">{imageFile.name}</span>
                  <span className="shrink-0">• {formatFileSize(imageFile.size)}</span>
                  {isGif && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-[var(--surface-strong)] border border-[var(--line)] text-[10px] font-semibold text-[var(--accent)] uppercase">
                      Animated GIF
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  className="shrink-0 text-xs"
                >
                  <RefreshCw size={12} strokeWidth={1.75} aria-hidden="true" />
                  Change
                </Button>
              </div>
            </div>
          ) : (
            /* Dropzone with Idle, Valid Drag, and Invalid Drag Visual States */
            <div
              tabIndex={0}
              role="button"
              aria-label="Upload post image: drag and drop an image here or press Enter or Space to choose a file"
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (!isBusy) fileInputRef.current?.click();
              }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !isBusy) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-center select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] ${
                dragState === "valid"
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : dragState === "invalid"
                  ? "border-[var(--danger)] bg-[var(--danger)]/5"
                  : "border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-strong)] hover:border-[var(--line-strong)]"
              } ${isBusy ? "opacity-50 pointer-events-none" : ""}`}
            >
              {dragState === "valid" ? (
                <>
                  <Upload size={32} strokeWidth={1.75} className="text-[var(--accent)] mb-2" aria-hidden="true" />
                  <span className="font-semibold text-sm text-[var(--accent)]">Drop image here</span>
                  <span className="text-xs text-[var(--ink-muted)] mt-1">Release to select this file</span>
                </>
              ) : dragState === "invalid" ? (
                <>
                  <ImageOff size={32} strokeWidth={1.75} className="text-[var(--danger)] mb-2" aria-hidden="true" />
                  <span className="font-semibold text-sm text-[var(--danger)]">Unsupported file type</span>
                  <span className="text-xs text-[var(--danger)] mt-1">
                    Use JPEG, PNG, WebP, GIF, or AVIF
                  </span>
                </>
              ) : (
                <>
                  <ImagePlus size={32} strokeWidth={1.75} className="text-[var(--ink-muted)] mb-2" aria-hidden="true" />
                  <span className="font-semibold text-sm text-[var(--ink)]">
                    Drag an image here, or click to choose a file
                  </span>
                  <span className="text-xs text-[var(--ink-muted)] mt-1">
                    JPEG, PNG, WebP, GIF (including animated), or AVIF • Max 5MB (10MB for GIF)
                  </span>
                </>
              )}
            </div>
          )}

          {/* Inline Validation Error */}
          {fileError && (
            <div
              role="alert"
              className="flex items-center gap-2 p-2.5 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5 text-xs text-[var(--danger)]"
            >
              <AlertCircle size={14} strokeWidth={2} className="shrink-0" aria-hidden="true" />
              <span>{fileError}</span>
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
                disabled={isBusy}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Or add manually: news, politics, tech..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-[var(--line)] rounded-lg bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
              />
            </div>
            <Button variant="secondary" type="button" onClick={() => handleAddTag()} disabled={isBusy}>
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
                  <IconButton label={`Remove tag ${t}`} onClick={() => handleRemoveTag(t)} disabled={isBusy}>
                    <X size={12} strokeWidth={2} aria-hidden="true" className="text-[var(--ink-muted)] hover:text-[var(--danger)]" />
                  </IconButton>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Uploading / Processing State feedback during post submission */}
        {isBusy && (
          <div
            role="status"
            className="flex items-center gap-2.5 p-3 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] text-xs text-[var(--ink)]"
          >
            <LoaderCircle size={16} strokeWidth={2} className="animate-spin text-[var(--accent)] shrink-0" aria-hidden="true" />
            <span>{submitStatus || "Publishing post..."}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--line)]">
          <Button variant="ghost" type="button" onClick={() => router.back()} disabled={isBusy}>
            Cancel
          </Button>
          <Button type="submit" disabled={isBusy || !body.trim()}>
            {isBusy ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle size={16} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                <span>{imageFile ? "Optimizing & Publishing..." : "Publishing..."}</span>
              </span>
            ) : (
              "Publish Post"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
