import Image from "next/image";
import { cn } from "@/lib/cn";

export function Avatar({
  src,
  alt = "User avatar",
  name = "",
  size = 32,
  className = "",
}) {
  const initial = (name || alt || "?").charAt(0).toUpperCase();

  return (
    <div
      style={{ width: size, height: size }}
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
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      ) : (
        <span
          className="font-semibold text-[var(--ink-muted)]"
          style={{ fontSize: Math.max(10, Math.floor(size * 0.4)) }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
