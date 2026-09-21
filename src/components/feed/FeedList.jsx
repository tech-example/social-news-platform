"use client";
import { PostCard } from "./PostCard";
import { Skeleton } from "@/components/ui/skeleton";

// Mock data as a fallback since the DB is not initialized yet (Phase 1 pending)
const MOCK_POSTS = [
  {
    id: "1",
    author: { username: "tech_insider", display_name: "Tech Insider", avatar_url: null },
    title: "The Future of AI Assistants",
    body: "AI assistants are becoming more embedded in our daily workflows. What are your thoughts on agentic workflows?",
    image_url: null,
    likes_count: 1250,
    comments_count: 84,
    shares_count: 12,
    createdAt: "2h",
  },
  {
    id: "2",
    author: { username: "design_daily", display_name: "Design Daily", avatar_url: null },
    title: null,
    body: "Minimalism in UI design is not about removing elements, it's about adding focus. #design #uiux",
    image_url: "https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=800&auto=format&fit=crop",
    likes_count: 342,
    comments_count: 12,
    shares_count: 3,
    createdAt: "5h",
  }
];

export function FeedList() {
  return (
    <div className="flex flex-col w-full max-w-[470px] mx-auto min-h-screen">
      {MOCK_POSTS.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div aria-busy="true" className="border-b border-[var(--line)] bg-[var(--bg)] py-4 flex flex-col gap-3 max-w-[470px] w-full mx-auto">
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
