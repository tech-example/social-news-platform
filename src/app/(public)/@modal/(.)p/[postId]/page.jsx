"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { InteractiveActions } from "@/components/feed/InteractiveActions";
import { CommentThread } from "@/components/feed/CommentThread";
import { IconButton } from "@/components/ui/icon-button";
import { X, LoaderCircle } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";

export default function InterceptedPostModal() {
  const router = useRouter();
  const params = useParams();
  const postId = params.postId;

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/feed?limit=1`);
        // Or fetch specific post endpoint
        const detailRes = await fetch(`/p/${postId}`, { headers: { Accept: "application/json" } });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [postId]);

  const handleClose = () => {
    router.back();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overscroll-contain animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-[var(--bg)] rounded-xl border border-[var(--line)] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85dvh]">
        <div className="absolute top-3 right-3 z-20">
          <IconButton label="Close post preview" onClick={handleClose}>
            <X size={20} strokeWidth={2} aria-hidden="true" className="text-[var(--ink)] bg-[var(--bg)] rounded-full p-0.5 shadow-xs" />
          </IconButton>
        </div>

        <div className="flex-1 p-6 flex flex-col justify-center items-center text-center">
          <p className="text-sm text-[var(--ink-muted)]">Viewing post details</p>
          <Link href={`/p/${postId}`} className="mt-2 text-sm font-semibold text-[var(--accent)] hover:underline">
            Open full page
          </Link>
        </div>
      </div>
    </div>
  );
}
