-- Migration 00018: Allow comment author and staff to delete comments
-- Reverses earlier restriction so regular 'user' role authors can delete their own comments.
-- Retains moderation capability for moderators and admins to delete any comment.

drop policy if exists "delete_own_comment" on public.comments;
drop policy if exists "staff_delete_comment" on public.comments;
drop policy if exists "delete_comment" on public.comments;

create policy "delete_comment"
  on public.comments for delete
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'admin')
        and not is_suspended
    )
  );
