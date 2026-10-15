-- Migration 00017: Allow moderators and admins to delete comments via RLS
-- Allows deletion when caller has role 'moderator' or 'admin', regardless of authorship.
-- Regular 'user' role authors cannot delete comments (they may only edit them).

drop policy if exists "delete_own_comment" on public.comments;
drop policy if exists "staff_delete_comment" on public.comments;

create policy "staff_delete_comment"
  on public.comments for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'admin')
        and not is_suspended
    )
  );
