"use client";
import { useState, useTransition } from "react";
import { restorePostAction, restoreCommentAction } from "@/server/actions/moderation";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/format";
import { Eye, FileText, MessageSquare } from "lucide-react";

export function ContentReviewClient({ hiddenPosts: initialPosts = [], hiddenComments: initialComments = [] }) {
  const { addToast } = useToast();
  const [tab, setTab] = useState("posts");
  const [isPending, startTransition] = useTransition();
  const [posts, setPosts] = useState(initialPosts);
  const [comments, setComments] = useState(initialComments);

  const handleRestorePost = (postId) => {
    startTransition(async () => {
      const res = await restorePostAction(postId);
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        addToast("Post restored to public view.");
      } else {
        addToast(res.error || "Failed to restore post.", "error");
      }
    });
  };

  const handleRestoreComment = (commentId) => {
    startTransition(async () => {
      const res = await restoreCommentAction(commentId);
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        addToast("Comment restored to public view.");
      } else {
        addToast(res.error || "Failed to restore comment.", "error");
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
          <span>Hidden Posts ({posts.length})</span>
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
          <span>Hidden Comments ({comments.length})</span>
        </button>
      </div>

      {tab === "posts" && (
        <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
          {posts.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--ink-muted)]">
              No hidden posts. Content is healthy.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Author</TableHead>
                  <TableHead>Title & Body</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs font-semibold">
                      @{p.author?.username || "anonymous"}
                    </TableCell>
                    <TableCell className="text-xs max-w-md">
                      {p.title && <strong className="block text-[var(--ink)]">{p.title}</strong>}
                      <span className="text-[var(--ink-muted)] line-clamp-2">{p.body}</span>
                    </TableCell>
                    <TableCell className="text-xs text-[var(--ink-muted)]" suppressHydrationWarning>
                      {formatRelativeTime(p.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        onClick={() => handleRestorePost(p.id)}
                        disabled={isPending}
                        className="text-xs h-7 px-3"
                      >
                        <Eye size={13} strokeWidth={1.75} aria-hidden="true" className="mr-1.5 text-[var(--success)]" />
                        Restore
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
              No hidden comments.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Author</TableHead>
                  <TableHead>Comment Body</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comments.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-semibold">
                      @{c.author?.username || "anonymous"}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--ink)] max-w-md line-clamp-2">
                      {c.body}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--ink-muted)]" suppressHydrationWarning>
                      {formatRelativeTime(c.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        onClick={() => handleRestoreComment(c.id)}
                        disabled={isPending}
                        className="text-xs h-7 px-3"
                      >
                        <Eye size={13} strokeWidth={1.75} aria-hidden="true" className="mr-1.5 text-[var(--success)]" />
                        Restore
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
