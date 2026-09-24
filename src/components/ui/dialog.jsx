"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { useMounted } from "@/lib/use-mounted";

export function Dialog({ open, onClose, title, children, maxWidth = "max-w-lg" }) {
  const dialogRef = useRef(null);
  const mounted = useMounted();

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overscroll-contain animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} bg-[var(--bg)] rounded-t-2xl sm:rounded-xl border border-[var(--line)] shadow-xl overflow-hidden flex flex-col max-h-[90dvh] transition-all`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
          <h2 id="dialog-title" className="text-base font-semibold text-[var(--ink)] truncate">
            {title}
          </h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)] hover:text-[var(--ink)]" />
          </IconButton>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}

