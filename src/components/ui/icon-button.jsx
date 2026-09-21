"use client";
export function IconButton({ label, pressed, className = "", children, ...props }) {
  if (process.env.NODE_ENV !== "production" && !label) throw new Error("IconButton requires a label");
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
