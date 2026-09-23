import Image from "next/image";
import { cn } from "@/lib/cn";

const SIZE_MAP = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 56,
};

export function Avatar({
  src,
  alt = "User avatar",
  name = "",
  size = 32,
  className = "",
}) {
  const pixelSize = typeof size === "number" ? size : (SIZE_MAP[size] || parseInt(size, 10) || 32);
  const initial = (name || alt || "?").charAt(0).toUpperCase();

  return (
    <div
      style={{ width: `${pixelSize}px`, height: `${pixelSize}px` }}
      className={cn(
        "relative rounded-full overflow-hidden shrink-0 bg-[var(--surface-strong)] flex items-center justify-center select-none border border-[var(--line)]",
        className
      )}
      aria-hidden={!alt}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={pixelSize}
          height={pixelSize}
          className="object-cover w-full h-full"
        />
      ) : (
        <span
          className="font-semibold text-[var(--ink-muted)]"
          style={{ fontSize: Math.max(9, Math.floor(pixelSize * 0.4)) }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}

