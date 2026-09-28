"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { useMounted } from "@/lib/use-mounted";

export function Dialog({
  open,
  onClose,
  onOpenChange,
  title,
  children,
  maxWidth = "max-w-lg",
}) {
  const dialogRef = useRef(null);
  const mounted = useMounted();

  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && open) {
        handleClose();
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
  }, [open, onClose, onOpenChange]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overscroll-contain animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} bg-[var(--bg)] rounded-t-2xl sm:rounded-xl border border-[var(--line)] shadow-xl overflow-hidden flex flex-col max-h-[90dvh] transition-all relative`}
      >
        {title ? (
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
            <h2 id="dialog-title" className="text-base font-semibold text-[var(--ink)] truncate">
              {title}
            </h2>
            <IconButton label="Close dialog" onClick={handleClose}>
              <X size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)] hover:text-[var(--ink)]" />
            </IconButton>
          </div>
        ) : (
          <div className="absolute top-3 right-3 z-10">
            <IconButton label="Close dialog" onClick={handleClose}>
              <X size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)] hover:text-[var(--ink)]" />
            </IconButton>
          </div>
        )}
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function DialogContent({ children, className = "" }) {
  return <div className={`space-y-4 ${className}`}>{children}</div>;
}

export function DialogHeader({ children, className = "" }) {
  return <div className={`space-y-1 mb-2 ${className}`}>{children}</div>;
}

export function DialogTitle({ children, className = "" }) {
  return <h2 id="dialog-title" className={`text-base font-bold text-[var(--ink)] ${className}`}>{children}</h2>;
}

export function DialogFooter({ children, className = "" }) {
  return <div className={`flex items-center justify-end gap-2 pt-3 border-t border-[var(--line)] ${className}`}>{children}</div>;
}
