import { Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] my-4 w-full max-w-[470px] mx-auto",
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-[var(--surface-strong)] flex items-center justify-center mb-4 text-[var(--ink-muted)]">
        <Icon size={32} strokeWidth={1.5} aria-hidden="true" />
      </div>
      {title && <h3 className="text-base font-semibold text-[var(--ink)] mb-1">{title}</h3>}
      {description && (
        <p className="text-sm text-[var(--ink-muted)] max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
