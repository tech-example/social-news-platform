"use client";
import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleFollowAction } from "@/server/actions/interactions";
import { useToast } from "@/components/ui/toast";

export function FollowButton({ targetUserId, initialFollowing = false }) {
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  const [following, setFollowing] = useOptimistic(
    initialFollowing,
    (state) => !state
  );

  const handleToggle = () => {
    startTransition(async () => {
      setFollowing(!following);
      const res = await toggleFollowAction(targetUserId);
      if (!res.ok) {
        addToast(res.error || "Failed to update follow status.", "error");
      }
    });
  };

  return (
    <Button
      variant={following ? "secondary" : "primary"}
      onClick={handleToggle}
      disabled={isPending}
      className="text-xs h-8 px-4"
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}
