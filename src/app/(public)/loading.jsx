import { PostCardSkeleton } from "@/components/feed/FeedList";

export default function Loading() {
  return (
    <div className="flex flex-col w-full max-w-[470px] mx-auto min-h-screen">
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}
