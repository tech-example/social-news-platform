"use client";
import { Dialog } from "@/components/ui/dialog";
import { OwnerActivitySection } from "./OwnerActivitySection";

export function OwnerActivityDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} title="Activity" maxWidth="max-w-lg">
      <div className="max-h-[65vh] overflow-y-auto -mx-2 px-2 py-1">
        <OwnerActivitySection />
      </div>
    </Dialog>
  );
}
