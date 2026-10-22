"use client";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

/**
 * Reusable Confirmation Dialog component adhering to the design system.
 * Replaces native window.confirm popups with an accessible, themed dialog.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  onClose,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  loading = false,
  onConfirm,
  onCancel,
  children,
}) {
  const handleClose = () => {
    if (loading) return;
    if (onCancel) onCancel();
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const handleConfirm = async (e) => {
    e?.preventDefault?.();
    if (loading) return;
    if (onConfirm) {
      await onConfirm();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      onOpenChange={onOpenChange}
      title={title}
      maxWidth="max-w-md"
    >
      <DialogContent>
        {destructive && description && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-xs text-[var(--danger)]">
            <AlertTriangle
              size={16}
              strokeWidth={2}
              className="shrink-0 mt-0.5 text-[var(--danger)]"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <span className="font-semibold text-[var(--danger)]">Irreversible action</span>
              <p className="text-[var(--danger)]/90 leading-relaxed">{description}</p>
            </div>
          </div>
        )}

        {!destructive && description && (
          <p className="text-sm text-[var(--ink)] leading-relaxed">
            {description}
          </p>
        )}

        {children}
      </DialogContent>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={handleClose}
          disabled={loading}
          autoFocus={destructive}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={destructive ? "destructive" : "primary"}
          onClick={handleConfirm}
          disabled={loading}
          autoFocus={!destructive}
        >
          {loading ? "Processing..." : confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
