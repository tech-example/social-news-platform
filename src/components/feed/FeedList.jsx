"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { PostCard } from "./PostCard";
import { PostCardSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { COPY } from "@/lib/copy";

export function FeedList({ initialPosts = [], initialCursor = null, filter = "latest", currentUserId = null }) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setPosts(initialPosts);
    setCursor(initialCursor);
  }, [initialPosts, initialCursor, filter]);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor)}&filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) => [...prev, ...data.posts]);
        setCursor(data.nextCursor);
      }
    } catch (err) {
      console.error("Failed to load more posts:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, filter]);

  if (posts.length === 0) {
    const isFollowingFilter = filter === "following";
    return (
      <div className="flex flex-col w-full max-w-[470px] mx-auto py-12 px-4">
        <EmptyState
          icon={Inbox}
          title={isFollowingFilter ? "No posts from followed creators" : COPY.feed.emptyTitle}
          description={
            isFollowingFilter
              ? "You haven't followed any creators yet, or they haven't posted recently. Explore Latest News to find creators to follow!"
              : COPY.feed.emptyDescription
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
        <PostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}

      {/* Load more: show skeleton placeholder cards while fetching */}
      {loadingMore && (
        <div role="status" aria-busy="true" aria-label="Loading more posts...">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}

      {cursor && !loadingMore && (
        <div className="py-6 flex justify-center">
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
