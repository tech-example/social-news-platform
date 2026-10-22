"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, LoaderCircle } from "lucide-react";
import { deleteShareAction } from "@/server/actions/interactions";
import { useToast } from "@/components/ui/toast";
import { IconButton } from "@/components/ui/icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteShareButton({ shareId }) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const { addToast } = useToast();
  const router = useRouter();

  const handleConfirmDelete = () => {
    startTransition(async () => {
      const res = await deleteShareAction(shareId);
      if (res?.ok) {
        addToast("Repost removed from your profile.");
        setShowConfirm(false);
        router.refresh();
      } else {
        addToast(res?.error || "Failed to remove repost.", "error");
      }
    });
  };

  return (
    <>
      <IconButton
        label="Remove repost"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowConfirm(true);
        }}
        disabled={isPending}
        className="absolute top-2 right-2 z-20 bg-black/65 text-white hover:bg-red-600 transition-colors shadow-md"
      >
        {isPending ? (
          <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
        )}
      </IconButton>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Remove repost?"
        description="This repost will be removed from your profile. The original post remains unaffected."
        confirmLabel="Remove repost"
        cancelLabel="Cancel"
        destructive={true}
        loading={isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
