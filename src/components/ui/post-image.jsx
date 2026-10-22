"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

/**
 * Universal PostImage component with error handling and "no image" fallback.
 * Renders an ImageOff fallback container matching the aspect ratio and footprint
 * if the image fails to load or if the source is missing/invalid.
 */
export function PostImage({
  src,
  thumbnailSrc = null,
  alt = "Post image",
  fill = false,
  width,
  height,
  className = "",
  containerClassName = "",
  sizes = "(min-width: 768px) 470px, 100vw",
  priority = false,
  unoptimized = false,
  fallbackText = "Image unavailable",
  useThumbnail = false,
}) {
  const [hasError, setHasError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  if (prevSrc !== src) {
    setPrevSrc(src);
    setHasError(false);
  }

  const activeSrc = useThumbnail && thumbnailSrc ? thumbnailSrc : src || thumbnailSrc;

  if (!activeSrc || hasError) {
    return (
      <div
        role="img"
        aria-label={fallbackText}
        className={`w-full h-full min-h-[120px] flex flex-col items-center justify-center gap-1.5 bg-[var(--surface)] text-[var(--ink-muted)] border border-[var(--line)] p-4 select-none ${containerClassName}`}
      >
        <ImageOff size={24} strokeWidth={1.5} aria-hidden="true" className="opacity-70" />
        <span className="text-xs font-medium text-[var(--ink-muted)] text-center tracking-tight">
          {fallbackText}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={activeSrc}
      alt={alt}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
