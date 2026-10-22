"use client";
import { useEffect, useRef, useCallback } from "react";
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

  const triggerRef = useRef(null);

  const handleClose = useCallback(() => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  }, [onClose, onOpenChange]);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key === "Tab") {
        const dialogEl = dialogRef.current;
        if (!dialogEl) return;
        const focusables = dialogEl.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const focusableArr = Array.from(focusables).filter(
          (el) => !el.disabled && el.offsetParent !== null
        );
        if (focusableArr.length === 0) return;
        const first = focusableArr[0];
        const last = focusableArr[focusableArr.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);

      // Focus first focusable element inside the dialog (or autofocus element)
      const timer = setTimeout(() => {
        if (!dialogRef.current) return;
        const autoFocused = dialogRef.current.querySelector("[autofocus]");
        if (autoFocused && !autoFocused.disabled) {
          autoFocused.focus();
        } else {
          const firstFocusable = dialogRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (firstFocusable && !firstFocusable.disabled) {
            firstFocusable.focus();
          } else {
            dialogRef.current.focus();
          }
        }
      }, 30);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
        if (triggerRef.current && typeof triggerRef.current.focus === "function") {
          triggerRef.current.focus();
        }
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [open, handleClose]);

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
