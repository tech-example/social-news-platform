"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { UserName } from "@/components/ui/user-name";
import { getDisplayName } from "@/lib/user";
import { FollowButton } from "@/components/ui/follow-button";
import { getUserFollowersAction, getUserFollowingAction } from "@/server/actions/social-lists";
import { Users, UserPlus, UserCheck, Loader2, CircleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCompactNumber } from "@/lib/format";

export function FollowListDialog({
  open,
  onClose,
  initialTab = "followers", // "followers" | "following"
  targetUserId,
  followersCount = 0,
  followingCount = 0,
  currentUserId = null,
  onFollowToggled = null,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Sync tab when opened
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const fetchItems = useCallback(async (tabToFetch, cursor = null) => {
    if (!targetUserId) return;
    if (!cursor) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const action = tabToFetch === "followers" ? getUserFollowersAction : getUserFollowingAction;
      const res = await action(targetUserId, cursor);

      if (res?.ok) {
        if (cursor) {
          setItems((prev) => [...prev, ...(res.items || [])]);
        } else {
          setItems(res.items || []);
        }
        setNextCursor(res.nextCursor || null);
      } else {
        setError(res?.error || `Failed to load ${tabToFetch}.`);
      }
    } catch (err) {
      console.error("fetchItems error:", err);
      setError(`Failed to load ${tabToFetch}. Please try again.`);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    if (open && targetUserId) {
      setItems([]);
      setNextCursor(null);
      fetchItems(activeTab, null);
    } else if (!open) {
      setItems([]);
      setNextCursor(null);
      setError(null);
    }
  }, [open, activeTab, targetUserId, fetchItems]);

  const handleTabSwitch = (newTab) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    setItems([]);
    setNextCursor(null);
    setError(null);
  };

  const handleLoadMore = () => {
    if (!nextCursor || isLoadingMore) return;
    fetchItems(activeTab, nextCursor);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col min-h-[300px] max-h-[65vh] -mx-4 -my-4">
        {/* Tab Header */}
        <div className="flex border-b border-[var(--line)] bg-[var(--surface)] shrink-0">
          <button
            type="button"
            onClick={() => handleTabSwitch("followers")}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold text-center border-b-2 transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
              activeTab === "followers"
                ? "border-[var(--ink)] text-[var(--ink)] bg-[var(--bg)] font-bold"
                : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            <span>Followers ({formatCompactNumber(followersCount)})</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch("following")}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold text-center border-b-2 transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
              activeTab === "following"
                ? "border-[var(--ink)] text-[var(--ink)] bg-[var(--bg)] font-bold"
                : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            <span>Following ({formatCompactNumber(followingCount)})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--line)]">
          {/* Skeleton Loading */}
          {isLoading && (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--surface-strong)]" />
                    <div className="space-y-1.5">
                      <div className="w-28 h-3.5 bg-[var(--surface-strong)] rounded" />
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
                onClick={() => fetchItems(activeTab, null)}
                className="min-h-[44px] px-4 gap-1.5 text-xs font-semibold"
              >
                <RotateCcw size={14} aria-hidden="true" />
                <span>Retry</span>
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && items.length === 0 && (
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[var(--surface-strong)] flex items-center justify-center text-[var(--ink-muted)] mb-1">
                <Users size={24} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-[var(--ink)]">
                {activeTab === "followers" ? "No followers yet" : "Not following anyone yet"}
              </p>
              <p className="text-xs text-[var(--ink-muted)]">
                {activeTab === "followers"
                  ? "When accounts follow this user, they will appear here."
                  : "When this user follows accounts, they will appear here."}
              </p>
            </div>
          )}

          {/* Users List */}
          {!isLoading && !error && items.length > 0 && (
            <div className="divide-y divide-[var(--line)]">
              {items.map((user) => {
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

                    {/* Follow button (not on my own row) */}
                    {currentUserId && !isMe ? (
                      <FollowButton
                        targetUserId={user.id}
                        initialFollowing={user.is_following_by_me}
                        size="sm"
                        className="shrink-0 min-h-[44px] min-w-[80px]"
                        onToggle={(newFollowing) => {
                          if (onFollowToggled) {
                            onFollowToggled(user.id, newFollowing, activeTab);
                          }
                        }}
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
      </div>
    </Dialog>
  );
}
