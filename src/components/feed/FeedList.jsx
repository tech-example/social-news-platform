"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Inbox, LoaderCircle } from "lucide-react";
import { PostCard } from "./PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { COPY } from "@/lib/copy";

export function FeedList({ initialPosts = [], initialCursor = null, filter = "latest", currentUserId = null }) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setPosts(initialPosts);
    setCursor(initialCursor);
  }, [initialPosts, initialCursor, filter]);

  const handleLoadMore = async () => {
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
  };

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

      {cursor && (
        <div className="py-6 flex justify-center">
          <Button
            variant="secondary"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full max-w-xs"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                Loading older posts...
              </span>
            ) : (
              "Load More Posts"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div
      aria-busy="true"
      className="border-b border-[var(--line)] bg-[var(--bg)] py-4 flex flex-col gap-3 max-w-[470px] w-full mx-auto"
    >
      <div className="flex items-center px-4 gap-3">
        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="w-full aspect-4/5 max-h-[400px]" />
      <div className="px-4 space-y-2 mt-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="flex flex-col w-full max-w-[470px] mx-auto" role="status" aria-label="Loading posts...">
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}
