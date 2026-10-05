import { notFound } from "next/navigation";
import { getPostById, getCommentsForPost } from "@/server/dal/posts";
import { getSession } from "@/server/auth";
import { InterceptedPostTopSheet } from "./InterceptedPostTopSheet";

export const dynamic = "force-dynamic";

export default async function InterceptedPostModalPage({ params }) {
  const { postId } = await params;
  const session = await getSession();
  const viewerId = session?.user?.id || null;

  const [post, comments] = await Promise.all([
    getPostById(postId, viewerId),
    getCommentsForPost(postId, viewerId),
  ]);

  if (!post) {
    return notFound();
  }

  const isAuthor = viewerId === post.author?.id;
  const isStaff = session?.profile?.role === "moderator" || session?.profile?.role === "admin";
  const defaultHidden = (isAuthor || isStaff) ? false : (session?.profile?.hide_flagged_content ?? true);

  return (
    <InterceptedPostTopSheet
      post={post}
      comments={comments || []}
      viewerId={viewerId}
      defaultHidden={defaultHidden}
      isStaff={isStaff}
      viewerHideFlagged={session?.profile?.hide_flagged_content ?? true}
    />
  );
}
