"use client";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  asChild,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-lg transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

  const sizeStyles = {
    sm: "min-h-[36px] px-3 text-xs gap-1.5",
    md: "min-h-[44px] px-4 text-sm gap-2",
    lg: "min-h-[48px] px-6 text-base gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-[var(--accent)] text-white hover:opacity-90 active:opacity-100",
    secondary:
      "bg-[var(--surface-strong)] text-[var(--ink)] hover:bg-[var(--line)]",
    outline:
      "border border-[var(--line)] bg-transparent text-[var(--ink)] hover:bg-[var(--surface)]",
    ghost:
      "bg-transparent text-[var(--ink)] hover:bg-[var(--surface-strong)]",
    danger:
      "bg-[var(--danger)] text-white hover:opacity-90 active:opacity-100",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {loading ? (
        <>
          <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
