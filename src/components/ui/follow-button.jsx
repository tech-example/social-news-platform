"use client";
import { useState, useEffect, useTransition } from "react";
import { toggleFollowAction } from "@/server/actions/interactions";
import { useToast } from "@/components/ui/toast";
import { UserCheck, UserPlus } from "lucide-react";

export function FollowButton({
  targetUserId,
  initialFollowing = false,
  size = "sm",
  variant = "button", // "button" | "compact" | "text"
  className = "",
  onToggle = null,
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing]);

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const nextState = !following;
    setFollowing(nextState);
    if (onToggle) onToggle(nextState);

    startTransition(async () => {
      try {
        const res = await toggleFollowAction(targetUserId);
        if (!res?.ok) {
          setFollowing(!nextState);
          if (onToggle) onToggle(!nextState);
          if (res?.code === "UNAUTHENTICATED" || res?.error === "UNAUTHENTICATED") {
            addToast("Please sign in to follow creators.", "error");
          } else {
            addToast(res?.error || "Failed to update follow status.", "error");
          }
        } else if (typeof res.following === "boolean") {
          setFollowing(res.following);
          if (onToggle) onToggle(res.following);
        }
      } catch (err) {
        console.error("Follow error:", err);
        setFollowing(!nextState);
        if (onToggle) onToggle(!nextState);
        addToast("Network error updating follow status.", "error");
      }
    });
  };


  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-all cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${
          following
            ? "text-[var(--ink-muted)] hover:text-[var(--ink)] bg-[var(--surface)] hover:bg-[var(--surface-strong)]"
            : "text-[var(--accent)] hover:text-[var(--accent-hover)] font-bold"
        } ${className}`}
        aria-label={following ? "Unfollow user" : "Follow user"}
      >
        {following ? (
          <>
            <UserCheck size={13} strokeWidth={2} aria-hidden="true" />
            <span>Following</span>
          </>
        ) : (
          <>
            <UserPlus size={13} strokeWidth={2} aria-hidden="true" />
            <span>Follow</span>
          </>
        )}
      </button>
    );
  }

  if (variant === "text") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`text-xs font-semibold py-1 px-1 cursor-pointer select-none transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${
          following
            ? "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            : "text-[var(--accent)] hover:text-[var(--accent-hover)] font-bold"
        } ${className}`}
        aria-label={following ? "Unfollow user" : "Follow user"}
      >
        {following ? "Following" : "Follow"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center justify-center font-semibold rounded-lg transition-all active:scale-[0.96] cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
        size === "sm"
          ? "min-h-[36px] px-3.5 text-xs gap-1.5"
          : size === "xs"
          ? "min-h-[32px] px-2.5 text-[11px] gap-1"
          : "min-h-[40px] px-4 text-xs gap-1.5"
      } ${
        following
          ? "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-strong)]"
          : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-xs"
      } ${className}`}
      aria-label={following ? "Unfollow user" : "Follow user"}
    >
      {following ? (
        <>
          <UserCheck size={14} strokeWidth={2} aria-hidden="true" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus size={14} strokeWidth={2} aria-hidden="true" />
          <span>Follow</span>
        </>
      )}
    </button>
  );
}
