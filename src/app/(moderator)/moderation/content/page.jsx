import { requireRole } from "@/server/auth";
import { getAdminClient } from "@/server/admin-client";
import { ContentReviewClient } from "./ContentReviewClient";

export const metadata = {
  title: "Content Review - Moderation",
};

export default async function ContentReviewPage() {
  await requireRole("moderator");
  const adminSupabase = getAdminClient();

  const [{ data: hiddenPosts }, { data: hiddenComments }] = await Promise.all([
    adminSupabase
      .from("posts")
      .select("id, title, body, status, created_at, author:profiles!posts_author_id_fkey(username)")
      .eq("status", "hidden")
      .order("updated_at", { ascending: false })
      .limit(30),
    adminSupabase
      .from("comments")
      .select("id, post_id, body, status, created_at, author:profiles!comments_author_id_fkey(username)")
      .eq("status", "hidden")
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">
      <div className="pb-4 border-b border-[var(--line)]">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
          Content Review
        </h1>
        <p className="text-xs text-[var(--ink-muted)]">
          Inspect hidden and moderated content with quick restoration options
        </p>
      </div>

      <ContentReviewClient
        hiddenPosts={hiddenPosts || []}
        hiddenComments={hiddenComments || []}
      />
    </div>
  );
}
