"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { UserName } from "@/components/ui/user-name";
import { getDisplayName } from "@/lib/user";
import { FollowButton } from "@/components/ui/follow-button";
import { getOwnerRecentActivityAction } from "@/server/actions/social-lists";
import { formatRelativeTime } from "@/lib/format";
import { Heart, UserPlus, Sparkles, Loader2, CircleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OwnerActivitySection({ className = "" }) {
  const [grouped, setGrouped] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActivity = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getOwnerRecentActivityAction();
      if (res?.ok) {
        setGrouped(res.grouped || []);
        setTotalCount(res.totalCount || 0);
      } else {
        setError(res?.error || "Failed to load recent activity.");
      }
    } catch (err) {
      console.error("fetchActivity error:", err);
      setError("Failed to load activity. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Loading Skeleton */}
      {isLoading && (
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-strong)]" />
                <div className="space-y-1.5">
                  <div className="w-48 h-3.5 bg-[var(--surface-strong)] rounded" />
                  <div className="w-20 h-3 bg-[var(--surface-strong)] rounded" />
                </div>
              </div>
              <div className="w-16 h-7 bg-[var(--surface-strong)] rounded-lg" />
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
            onClick={fetchActivity}
            className="min-h-[44px] px-4 gap-1.5 text-xs font-semibold"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && totalCount === 0 && (
        <div className="p-10 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-strong)] flex items-center justify-center text-[var(--ink-muted)] mb-1">
            <Sparkles size={24} strokeWidth={1.5} aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-[var(--ink)]">No recent activity</p>
          <p className="text-xs text-[var(--ink-muted)] max-w-sm">
            When people like your posts or follow you, your direct activity log will be recorded and grouped here permanently.
          </p>
        </div>
      )}

      {/* Grouped Activity Items */}
      {!isLoading && !error && totalCount > 0 && (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.date} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)] px-4">
                {group.date}
              </h3>

              <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl divide-y divide-[var(--line)] overflow-hidden shadow-xs">
                {group.items.map((item) => {
                  const actor = item.actor;
                  if (!actor) return null;
                  const displayName = getDisplayName(actor);

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-[var(--surface)] transition-colors min-h-[56px]"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Link
                          href={`/u/${actor.username}`}
                          className="shrink-0 group focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded-full"
                        >
                          <Avatar
                            src={actor.avatar_url}
                            name={displayName}
                            size={40}
                          />
                        </Link>

                        <div className="flex flex-col min-w-0 text-left text-xs sm:text-sm text-[var(--ink)]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/u/${actor.username}`}
                              className="font-semibold text-[var(--ink)] hover:underline inline-flex items-center gap-1"
                            >
                              <UserName profile={actor} />
                            </Link>

                            {item.type === "like" ? (
                              <span className="text-[var(--ink-muted)] inline-flex items-center gap-1">
                                <Heart size={13} className="text-[var(--like)] fill-current shrink-0" aria-hidden="true" />
                                <span>liked your post</span>
                                {item.post && (
                                  <Link
                                    href={`/p/${item.post.id}`}
                                    className="font-medium text-[var(--ink)] hover:text-[var(--accent)] hover:underline truncate max-w-[160px] sm:max-w-xs inline-block align-bottom"
                                  >
                                    &ldquo;{item.post.title}&rdquo;
                                  </Link>
                                )}
                              </span>
                            ) : item.type === "follow" ? (
                              <span className="text-[var(--ink-muted)] inline-flex items-center gap-1">
                                <UserPlus size={13} className="text-[var(--accent)] shrink-0" aria-hidden="true" />
                                <span>started following you</span>
                              </span>
                            ) : null}
                          </div>

                          <span className="text-[11px] text-[var(--ink-muted)] mt-0.5">
                            {formatRelativeTime(item.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Follow back button for new followers */}
                      {item.type === "follow" && (
                        <FollowButton
                          targetUserId={actor.id}
                          initialFollowing={actor.is_following_by_me}
                          size="sm"
                          className="shrink-0 min-h-[44px] min-w-[80px]"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
