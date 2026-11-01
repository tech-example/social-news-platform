"use client";
import { useState, useTransition } from "react";
import { restorePostAction, restoreCommentAction } from "@/server/actions/moderation";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { Eye, FileText, MessageSquare } from "lucide-react";
import { FlaggedContent } from "@/components/feed/FlaggedContent";
import { useAdminLocale } from "@/lib/i18n/AdminLocaleProvider";
import { getDisplayName } from "@/lib/user";

export function ContentReviewClient({ hiddenPosts: initialPosts = [], hiddenComments: initialComments = [] }) {
  const { addToast } = useToast();
  const { t, formatRelative } = useAdminLocale();
  const [tab, setTab] = useState("posts");
  const [isPending, startTransition] = useTransition();
  const [posts, setPosts] = useState(initialPosts);
  const [comments, setComments] = useState(initialComments);

  const handleRestorePost = (postId) => {
    startTransition(async () => {
      const res = await restorePostAction(postId);
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        addToast(t("moderation.toast_post_restored", "Post restored to public view."));
      } else {
        addToast(res.error || t("moderation.toast_error_restore_post", "Failed to restore post."), "error");
      }
    });
  };

  const handleRestoreComment = (commentId) => {
    startTransition(async () => {
      const res = await restoreCommentAction(commentId);
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        addToast(t("moderation.toast_comment_restored", "Comment restored to public view."));
      } else {
        addToast(res.error || t("moderation.toast_error_restore_comment", "Failed to restore comment."), "error");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-[var(--line)]">
        <button
          type="button"
          onClick={() => setTab("posts")}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
            tab === "posts"
              ? "text-[var(--ink)] border-b-2 border-[var(--ink)]"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          <FileText size={15} strokeWidth={2} aria-hidden="true" />
          <span>{t("moderation.content_tab_posts", { count: posts.length }, `Hidden Posts (${posts.length})`)}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("comments")}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
            tab === "comments"
              ? "text-[var(--ink)] border-b-2 border-[var(--ink)]"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          <MessageSquare size={15} strokeWidth={2} aria-hidden="true" />
          <span>{t("moderation.content_tab_comments", { count: comments.length }, `Hidden Comments (${comments.length})`)}</span>
        </button>
      </div>

      {tab === "posts" && (
        <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
          {posts.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--ink-muted)]">
              {t("moderation.content_empty_posts", "No hidden posts. Content is healthy.")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("moderation.content_col_author", "Author")}</TableHead>
                  <TableHead>{t("moderation.content_col_title_body", "Title & Body")}</TableHead>
                  <TableHead>{t("moderation.content_col_created", "Created")}</TableHead>
                  <TableHead className="text-right">{t("moderation.content_col_actions", "Action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs font-semibold">
                      {getDisplayName(p.author)}
                    </TableCell>
                    <TableCell className="text-xs max-w-md">
                      <FlaggedContent
                        isFlagged={Boolean(p.is_flagged)}
                        defaultHidden={false}
                        contentType="post"
                      >
                        {p.title && <strong className="block text-[var(--ink)]">{p.title}</strong>}
                        <span className="text-[var(--ink-muted)] line-clamp-2">{p.body}</span>
                      </FlaggedContent>
                    </TableCell>
                    <TableCell className="text-xs text-[var(--ink-muted)]" suppressHydrationWarning>
                      {formatRelative(p.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        onClick={() => handleRestorePost(p.id)}
                        disabled={isPending}
                        className="text-xs h-7 px-3"
                      >
                        <Eye size={13} strokeWidth={1.75} aria-hidden="true" className="mr-1.5 text-[var(--success)]" />
                        {t("moderation.content_btn_restore", "Restore")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {tab === "comments" && (
        <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
          {comments.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--ink-muted)]">
              {t("moderation.content_empty_comments", "No hidden comments.")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("moderation.content_col_author", "Author")}</TableHead>
                  <TableHead>{t("moderation.content_col_comment_body", "Comment Body")}</TableHead>
                  <TableHead>{t("moderation.content_col_created", "Created")}</TableHead>
                  <TableHead className="text-right">{t("moderation.content_col_actions", "Action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comments.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-semibold">
                      {getDisplayName(c.author)}
                    </TableCell>
                    <TableCell className="text-xs max-w-md">
                      <FlaggedContent
                        isFlagged={Boolean(c.is_flagged)}
                        defaultHidden={false}
                        contentType="comment"
                      >
                        <span className="text-[var(--ink)]">{c.body}</span>
                      </FlaggedContent>
                    </TableCell>
                    <TableCell className="text-xs text-[var(--ink-muted)]" suppressHydrationWarning>
                      {formatRelative(c.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        onClick={() => handleRestoreComment(c.id)}
                        disabled={isPending}
                        className="text-xs h-7 px-3"
                      >
                        <Eye size={13} strokeWidth={1.75} aria-hidden="true" className="mr-1.5 text-[var(--success)]" />
                        {t("moderation.content_btn_restore", "Restore")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
