"use client";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus } from "lucide-react";

export function LoginPromptDialog({ open, onClose, title = "Sign in to continue", description = "Join the community to see who liked this post and follow other accounts." }) {
  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center p-2 space-y-4">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-strong)] flex items-center justify-center text-[var(--ink)]">
          <LogIn size={24} strokeWidth={1.75} aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
            {description}
          </p>
        </div>

        <div className="w-full flex flex-col gap-2 pt-2">
          <Link href="/sign-in" className="w-full">
            <Button variant="primary" className="w-full min-h-[44px] text-sm font-semibold gap-2">
              <LogIn size={16} strokeWidth={2} aria-hidden="true" />
              <span>Sign In</span>
            </Button>
          </Link>

          <Link href="/sign-up" className="w-full">
            <Button variant="outline" className="w-full min-h-[44px] text-sm font-semibold gap-2">
              <UserPlus size={16} strokeWidth={2} aria-hidden="true" />
              <span>Create Account</span>
            </Button>
          </Link>
        </div>
      </div>
    </Dialog>
  );
}
