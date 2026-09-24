import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPostById, getCommentsForPost } from "@/server/dal/posts";
import { getSession } from "@/server/auth";
import { Avatar } from "@/components/ui/avatar";
import { InteractiveActions } from "@/components/feed/InteractiveActions";
import { CommentThread } from "@/components/feed/CommentThread";
import { FollowButton } from "@/components/ui/follow-button";
import { ChevronLeft, Hash } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";

export async function generateMetadata({ params }) {
  const { postId } = await params;
  const post = await getPostById(postId);
  if (!post) return { title: "Post Not Found" };

  return {
    title: `${post.title || post.author?.username || "Post"} - SocialNews`,
    description: post.body?.slice(0, 150),
  };
}

function renderBodyWithLinks(text) {
  if (!text) return null;
  const parts = text.split(/(https?:\/\/[^\s]+|#[a-zA-Z0-9_]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("http://") || part.startsWith("https://")) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] underline break-all hover:opacity-85 font-normal"
        >
          {part}
        </a>
      );
    }
    if (part.startsWith("#")) {
      const rawTag = part.slice(1);
      const tag = rawTag.toLowerCase();
      return (
        <Link
          key={i}
          href={`/tag/${encodeURIComponent(tag)}`}
          className="inline-flex items-center text-[var(--accent)] font-medium hover:underline"
        >
          <Hash size={13} strokeWidth={2} className="shrink-0 mr-0.5" aria-hidden="true" />
          <span>{tag}</span>
        </Link>
      );
    }
    return part;
  });
}

export default async function PostDetailPage({ params }) {
  const { postId } = await params;
  const session = await getSession();
  const viewerId = session?.user?.id || null;

  const [post, comments] = await Promise.all([
    getPostById(postId, viewerId),
    getCommentsForPost(postId, viewerId),
  ]);

  if (!post) {
    notFound();
  }

  const isAuthor = viewerId === post.author?.id;

  return (
    <div className="max-w-[935px] mx-auto px-4 py-4 sm:py-6">
      {/* Back button */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] rounded"
        >
          <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
          <span>Back to feed</span>
        </Link>
      </div>

      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs flex flex-col md:flex-row">
        {/* Left: Media or highlighted text */}
        <div className="flex-1 bg-[var(--surface)] border-b md:border-b-0 md:border-r border-[var(--line)] flex items-center justify-center min-h-[300px] md:min-h-[500px]">
          {post.imageUrl ? (
            <div className="relative w-full aspect-4/5 max-h-[650px]">
              <Image
                src={post.imageUrl}
                alt={post.title || "Post image"}
                fill
                sizes="(min-width: 768px) 550px, 100vw"
                className="object-contain"
                unoptimized
                priority
              />
            </div>
          ) : (
            <div className="p-8 max-w-lg text-center flex flex-col items-center justify-center gap-3">
              {post.title && (
                <h1 className="text-2xl font-bold text-[var(--ink)]">{post.title}</h1>
              )}
              <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
                {renderBodyWithLinks(post.body)}
              </p>
            </div>
          )}
        </div>

        {/* Right: Author info, Caption, Comments, Actions */}
        <div className="w-full md:w-[380px] shrink-0 flex flex-col h-[550px] bg-[var(--bg)]">
          {/* Author Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--line)]">
            <div className="flex items-center gap-3 min-w-0">
              <Link href={`/u/${post.author?.username}`} className="flex items-center gap-3 min-w-0 group">
                <Avatar
                  src={post.author?.avatar_url}
                  name={post.author?.display_name || post.author?.username}
                  size={36}
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm text-[var(--ink)] truncate group-hover:underline">
                    {post.author?.username}
                  </span>
                  <span className="text-xs text-[var(--ink-muted)] truncate">
                    {post.author?.display_name}
                  </span>
                </div>
              </Link>

              {viewerId && !isAuthor && post.author?.id && (
                <FollowButton
                  targetUserId={post.author.id}
                  initialFollowing={post.isFollowingAuthor || false}
                  variant="compact"
                  className="ml-1"
                />
              )}
            </div>

            {post.createdAt && (
              <span className="text-xs text-[var(--ink-muted)] shrink-0" suppressHydrationWarning>
                {formatRelativeTime(post.createdAt)}
              </span>
            )}
          </div>

          {/* Post Caption + Hashtags (if image exists) */}
          {post.imageUrl && (
            <div className="p-4 border-b border-[var(--line)] space-y-2 bg-[var(--surface)]">
              {post.title && (
                <h2 className="text-sm font-bold text-[var(--ink)]">{post.title}</h2>
              )}
              <p className="text-sm text-[var(--ink)] whitespace-pre-wrap">
                {renderBodyWithLinks(post.body)}
              </p>
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {post.tags.map((tag) => {
                    const normalized = tag.toLowerCase().replace(/^#/, "");
                    return (
                      <Link
                        key={tag}
                        href={`/tag/${encodeURIComponent(normalized)}`}
                        className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--accent)] hover:underline"
                      >
                        <Hash size={12} strokeWidth={2} aria-hidden="true" className="shrink-0" />
                        <span>{normalized}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Comments List (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4">
            <CommentThread
              postId={post.id}
              initialComments={comments}
              currentUserId={viewerId}
            />
          </div>

          {/* Action Row at Bottom */}
          <div className="p-4 border-t border-[var(--line)] bg-[var(--bg)]">
            <InteractiveActions
              postId={post.id}
              postTitle={post.title || post.body?.slice(0, 40)}
              post={post}
              initialLiked={post.isLiked || false}
              initialLikesCount={post.likesCount || 0}
              initialShared={post.isShared || false}
              commentsCount={post.commentsCount || 0}
              sharesCount={post.sharesCount || 0}
              isAuthor={isAuthor}
              currentUserId={viewerId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

