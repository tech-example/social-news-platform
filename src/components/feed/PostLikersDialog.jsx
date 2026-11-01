"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { UserName } from "@/components/ui/user-name";
import { getDisplayName } from "@/lib/user";
import { FollowButton } from "@/components/ui/follow-button";
import { getPostLikersAction } from "@/server/actions/social-lists";
import { Heart, Loader2, CircleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PostLikersDialog({ open, onClose, postId, initialLikesCount = 0, currentUserId = null }) {
  const [likers, setLikers] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [totalCount, setTotalCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const fetchLikers = useCallback(async () => {
    if (!postId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPostLikersAction(postId, null);
      if (res?.ok) {
        setLikers(res.items || []);
        setNextCursor(res.nextCursor || null);
        if (typeof res.totalCount === "number") {
          setTotalCount(res.totalCount);
        }
      } else {
        setError(res?.error || "Failed to load likes.");
      }
    } catch (err) {
      console.error("fetchLikers error:", err);
      setError("Failed to load likes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (open) {
      fetchLikers();
    } else {
      setLikers([]);
      setNextCursor(null);
      setError(null);
    }
  }, [open, fetchLikers]);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await getPostLikersAction(postId, nextCursor);
      if (res?.ok) {
        setLikers((prev) => [...prev, ...(res.items || [])]);
        setNextCursor(res.nextCursor || null);
      } else {
        setError(res?.error || "Failed to load more likes.");
      }
    } catch (err) {
      console.error("handleLoadMore error:", err);
      setError("Failed to load more likes.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const title = totalCount > 0 ? `Likes (${totalCount})` : "Likes";

  return (
    <Dialog open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex flex-col min-h-[260px] max-h-[60vh] -mx-4 -my-4 divide-y divide-[var(--line)]">
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-strong)]" />
                  <div className="space-y-1.5">
                    <div className="w-24 h-3.5 bg-[var(--surface-strong)] rounded" />
                    <div className="w-16 h-3 bg-[var(--surface-strong)] rounded" />
                  </div>
                </div>
                <div className="w-20 h-7 bg-[var(--surface-strong)] rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
            <CircleAlert size={32} className="text-[var(--danger)]" aria-hidden="true" />
            <p className="text-sm text-[var(--ink)] font-medium">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLikers}
              className="min-h-[44px] px-4 gap-1.5 text-xs font-semibold"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Retry</span>
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && likers.length === 0 && (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-strong)] flex items-center justify-center text-[var(--ink-muted)] mb-1">
              <Heart size={24} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-[var(--ink)]">No likes yet</p>
            <p className="text-xs text-[var(--ink-muted)]">When someone likes this post, they will appear here.</p>
          </div>
        )}

        {/* Likers List */}
        {!isLoading && !error && likers.length > 0 && (
          <div className="divide-y divide-[var(--line)] overflow-y-auto flex-1">
            {likers.map((user) => {
              const displayName = getDisplayName(user);
              const isMe = currentUserId && user.id === currentUserId;

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-[var(--surface)] transition-colors min-h-[56px]"
                >
                  <Link
                    href={`/u/${user.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 group hover:opacity-85 focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded-lg p-0.5"
                  >
                    <Avatar
                      src={user.avatar_url}
                      name={displayName}
                      size={40}
                      className="shrink-0"
                    />
                    <div className="flex flex-col min-w-0 text-left">
                      <UserName
                        profile={user}
                        className="text-sm font-semibold text-[var(--ink)] truncate group-hover:underline"
                      />
                    </div>
                  </Link>

                  {/* Follow button */}
                  {currentUserId && !isMe ? (
                    <FollowButton
                      targetUserId={user.id}
                      initialFollowing={user.is_following_by_me}
                      size="sm"
                      className="shrink-0 min-h-[44px] min-w-[80px]"
                    />
                  ) : null}
                </div>
              );
            })}

            {/* Load More Button */}
            {nextCursor && (
              <div className="p-3 flex justify-center bg-[var(--surface)]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="min-h-[44px] w-full text-xs font-semibold gap-2"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                      <span>Loading more...</span>
                    </>
                  ) : (
                    <span>Load more</span>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
