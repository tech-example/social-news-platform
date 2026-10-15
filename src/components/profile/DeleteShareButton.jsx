"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteShareAction } from "@/server/actions/interactions";
import { useToast } from "@/components/ui/toast";
import { IconButton } from "@/components/ui/icon-button";

export function DeleteShareButton({ shareId }) {
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();
  const router = useRouter();

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm("Remove this repost from your profile?")) {
      return;
    }

    startTransition(async () => {
      const res = await deleteShareAction(shareId);
      if (res?.ok) {
        addToast("Repost removed from your profile.");
        router.refresh();
      } else {
        addToast(res?.error || "Failed to remove repost.", "error");
      }
    });
  };

  return (
    <IconButton
      label="Remove repost"
      onClick={handleDelete}
      disabled={isPending}
      className="absolute top-2 right-2 z-20 bg-black/65 text-white hover:bg-red-600 transition-colors shadow-md"
    >
      {isPending ? (
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
      )}
    </IconButton>
  );
}
