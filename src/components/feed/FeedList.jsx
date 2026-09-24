"use client";
import { useState, useEffect, useRef, useCallback, startTransition, memo } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { PostCard } from "./PostCard";
import { PostCardSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { COPY } from "@/lib/copy";

// Memoize PostCard so unchanged items skip re-render during list appends
const MemoizedPostCard = memo(PostCard);
MemoizedPostCard.displayName = "MemoizedPostCard";


export function FeedList({
  initialPosts = [],
  initialCursor = null,
  filter = "latest",
  tag = null,
  currentUserId = null,
  emptyTitle = null,
  emptyDescription = null,
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false); // Prevent duplicate IntersectionObserver fires

  useEffect(() => {
    setPosts(initialPosts);
    setCursor(initialCursor);
  }, [initialPosts, initialCursor, filter, tag]);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const url = tag
        ? `/api/feed?cursor=${encodeURIComponent(cursor)}&tag=${encodeURIComponent(tag)}`
        : `/api/feed?cursor=${encodeURIComponent(cursor)}&filter=${encodeURIComponent(filter)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Use startTransition to keep the UI responsive during large state updates
        startTransition(() => {
          setPosts((prev) => [...prev, ...data.posts]);
          setCursor(data.nextCursor);
        });
      }
    } catch (err) {
      console.error("Failed to load more posts:", err);
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [cursor, filter, tag]);

  // IntersectionObserver for automatic infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && cursor && !loadingRef.current) {
          handleLoadMore();
        }
      },
      { rootMargin: "400px" }, // Pre-fetch 400px before reaching the bottom
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, handleLoadMore]);

  if (posts.length === 0) {
    const isFollowingFilter = filter === "following";
    return (
      <div className="flex flex-col w-full max-w-[470px] mx-auto py-12 px-4">
        <EmptyState
          icon={Inbox}
          title={emptyTitle || (isFollowingFilter ? "No posts from followed creators" : COPY.feed.emptyTitle)}
          description={
            emptyDescription ||
            (isFollowingFilter
              ? "You haven't followed any creators yet, or they haven't posted recently. Explore Latest News to find creators to follow!"
              : COPY.feed.emptyDescription)
          }
          action={
            isFollowingFilter ? (
              <Link
                href="/"
                className="inline-flex items-center justify-center font-semibold rounded-lg transition-colors cursor-pointer select-none bg-[var(--surface-strong)] text-[var(--ink)] hover:bg-[var(--line)] min-h-[36px] px-3 text-xs mt-2"
              >
                Explore Latest News
              </Link>
            ) : null
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-[470px] mx-auto">
      {posts.map((post) => (
        <MemoizedPostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}

      {/* Load more: show skeleton placeholder cards while fetching */}
      {loadingMore && (
        <div role="status" aria-busy="true" aria-label="Loading more posts...">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}

      {/* Sentinel for IntersectionObserver auto-load */}
      {cursor && !loadingMore && (
        <div ref={sentinelRef} className="py-6 flex justify-center">
          <Button
            variant="secondary"
            onClick={handleLoadMore}
            className="w-full max-w-xs"
          >
            Load More Posts
          </Button>
        </div>
      )}
    </div>
  );
}
