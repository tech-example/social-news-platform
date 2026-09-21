import { cn } from "@/lib/cn";

export function Badge({
  children,
  icon: Icon,
  variant = "default",
  className = "",
  ...props
}) {
  const variantStyles = {
    default: "bg-[var(--surface-strong)] text-[var(--ink)] border-[var(--line)]",
    accent: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/30",
    success: "bg-emerald-50 text-[var(--success)] border-emerald-200",
    warning: "bg-amber-50 text-[var(--warning)] border-amber-200",
    danger: "bg-rose-50 text-[var(--danger)] border-rose-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border tabular-nums select-none",
        variantStyles[variant] || variantStyles.default,
        className
      )}
      {...props}
    >
      {Icon && <Icon size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />}
      <span>{children}</span>
    </span>
  );
}
