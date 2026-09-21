"use client";
import { Inbox } from "lucide-react";
import { PostCard } from "./PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { COPY } from "@/lib/copy";

export function FeedList({ posts = [] }) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col w-full max-w-[470px] mx-auto py-12 px-4">
        <EmptyState
          icon={Inbox}
          title={COPY.feed.emptyTitle}
          description={COPY.feed.emptyDescription}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-[470px] mx-auto min-h-screen">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
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
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="w-full aspect-[4/5]" />
      <div className="px-4 space-y-3 mt-2">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="flex flex-col w-full max-w-[470px] mx-auto min-h-screen" role="status" aria-label="Loading posts…">
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}
