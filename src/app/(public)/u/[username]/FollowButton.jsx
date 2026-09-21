"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toggleFollowAction } from "@/server/actions/interactions";
import { useToast } from "@/components/ui/toast";

export function FollowButton({ targetUserId, initialFollowing = false }) {
  const [following, setFollowing] = useState(initialFollowing);
  const { addToast } = useToast();

  const handleToggle = () => {
    const nextState = !following;
    setFollowing(nextState);

    toggleFollowAction(targetUserId)
      .then((res) => {
        if (!res?.ok) {
          setFollowing(!nextState);
          addToast(res?.error || "Failed to update follow status.", "error");
        }
      })
      .catch((err) => {
        console.error("Follow error:", err);
        setFollowing(!nextState);
        addToast("Network error updating follow status.", "error");
      });
  };

  return (
    <Button
      variant={following ? "secondary" : "primary"}
      onClick={handleToggle}
      className="text-xs h-8 px-4 font-semibold transition-all cursor-pointer"
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}
