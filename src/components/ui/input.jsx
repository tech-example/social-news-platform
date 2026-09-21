"use client";
import { cn } from "@/lib/cn";

export function Input({
  label,
  id,
  name,
  type = "text",
  error,
  placeholder,
  className = "",
  disabled = false,
  required = false,
  ...props
}) {
  const inputId = id || name;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-[var(--ink)]">
          {label} {required && <span className="text-[var(--danger)]">*</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className={cn(
          "w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border text-base md:text-sm bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] focus-visible:border-transparent",
          error
            ? "border-[var(--danger)] bg-red-50/20"
            : "border-[var(--line)] hover:border-[var(--ink-muted)]",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${inputId}-error`} className="text-xs font-medium text-[var(--danger)]" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
