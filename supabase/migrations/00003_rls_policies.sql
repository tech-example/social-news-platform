-- Migration: 00003_rls_policies.sql
-- Description: Row Level Security (RLS) policies for all tables and role helper functions

-- 1. Helper function for role-based policy evaluation
create or replace function public.current_role_is(min_role user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case role
             when 'admin' then 3
             when 'moderator' then 2
             else 1
           end
           >= case min_role
                when 'admin' then 3
                when 'moderator' then 2
                else 1
              end
    from public.profiles
    where id = auth.uid() and not is_suspended
  ), false);
$$;

-- 2. Enable RLS on all public tables (Default Deny)
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.tags enable row level security;
alter table public.post_tags enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;
alter table public.comments enable row level security;
alter table public.shares enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.report_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.activity_events enable row level security;

-- 3. Profiles Policies
drop policy if exists "profiles_are_public" on public.profiles;
create policy "profiles_are_public"
  on public.profiles for select
  using (true);

drop policy if exists "update_own_profile" on public.profiles;
create policy "update_own_profile"
  on public.profiles for update
  using (id = auth.uid() and not is_suspended)
  with check (id = auth.uid());

drop policy if exists "admins_manage_profiles" on public.profiles;
create policy "admins_manage_profiles"
  on public.profiles for all
  using (public.current_role_is('admin'));

-- 4. Posts Policies
drop policy if exists "read_published_posts" on public.posts;
create policy "read_published_posts"
  on public.posts for select
  using (
    status = 'published'
    or author_id = auth.uid()
    or public.current_role_is('moderator')
  );

drop policy if exists "insert_own_post" on public.posts;
create policy "insert_own_post"
  on public.posts for insert
  with check (
    author_id = auth.uid()
    and public.current_role_is('user')
  );

drop policy if exists "update_own_post" on public.posts;
create policy "update_own_post"
  on public.posts for update
  using (
    (author_id = auth.uid() and status <> 'removed')
    or public.current_role_is('moderator')
  )
  with check (
    (author_id = auth.uid() and status <> 'removed')
    or public.current_role_is('moderator')
  );

drop policy if exists "delete_own_post" on public.posts;
create policy "delete_own_post"
  on public.posts for delete
  using (
    author_id = auth.uid()
    or public.current_role_is('admin')
  );

-- 5. Tags Policies
drop policy if exists "tags_are_public" on public.tags;
create policy "tags_are_public"
  on public.tags for select
  using (true);

drop policy if exists "users_insert_tags" on public.tags;
create policy "users_insert_tags"
  on public.tags for insert
  with check (public.current_role_is('user'));

drop policy if exists "moderators_manage_tags" on public.tags;
create policy "moderators_manage_tags"
  on public.tags for all
  using (public.current_role_is('moderator'));

-- 6. Post Tags Policies
drop policy if exists "post_tags_are_public" on public.post_tags;
create policy "post_tags_are_public"
  on public.post_tags for select
  using (true);

drop policy if exists "authors_manage_post_tags" on public.post_tags;
create policy "authors_manage_post_tags"
  on public.post_tags for all
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_tags.post_id
        and (p.author_id = auth.uid() or public.current_role_is('moderator'))
    )
  );

-- 7. Likes Policies
drop policy if exists "likes_are_public" on public.likes;
create policy "likes_are_public"
  on public.likes for select
  using (true);

drop policy if exists "like_as_self" on public.likes;
create policy "like_as_self"
  on public.likes for insert
  with check (
    user_id = auth.uid()
    and public.current_role_is('user')
  );

drop policy if exists "unlike_as_self" on public.likes;
create policy "unlike_as_self"
  on public.likes for delete
  using (user_id = auth.uid());

-- 8. Follows Policies
drop policy if exists "follows_are_public" on public.follows;
create policy "follows_are_public"
  on public.follows for select
  using (true);

drop policy if exists "follow_as_self" on public.follows;
create policy "follow_as_self"
  on public.follows for insert
  with check (
    follower_id = auth.uid()
    and follower_id <> following_id
    and public.current_role_is('user')
  );

drop policy if exists "unfollow_as_self" on public.follows;
create policy "unfollow_as_self"
  on public.follows for delete
  using (follower_id = auth.uid());

-- 9. Comments Policies
drop policy if exists "read_published_comments" on public.comments;
create policy "read_published_comments"
  on public.comments for select
  using (
    status = 'published'
    or author_id = auth.uid()
    or public.current_role_is('moderator')
  );

drop policy if exists "insert_own_comment" on public.comments;
create policy "insert_own_comment"
  on public.comments for insert
  with check (
    author_id = auth.uid()
    and public.current_role_is('user')
  );

drop policy if exists "update_own_comment" on public.comments;
create policy "update_own_comment"
  on public.comments for update
  using (
    (author_id = auth.uid() and status <> 'removed')
    or public.current_role_is('moderator')
  );

drop policy if exists "delete_own_comment" on public.comments;
create policy "delete_own_comment"
  on public.comments for delete
  using (
    author_id = auth.uid()
    or public.current_role_is('admin')
  );

-- 10. Shares Policies
drop policy if exists "shares_are_public" on public.shares;
create policy "shares_are_public"
  on public.shares for select
  using (true);

drop policy if exists "share_as_self" on public.shares;
create policy "share_as_self"
  on public.shares for insert
  with check (
    user_id = auth.uid()
    and public.current_role_is('user')
  );

drop policy if exists "unshare_as_self" on public.shares;
create policy "unshare_as_self"
  on public.shares for delete
  using (user_id = auth.uid());

-- 11. Notifications Policies
drop policy if exists "read_own_notifications" on public.notifications;
create policy "read_own_notifications"
  on public.notifications for select
  using (recipient_id = auth.uid());

drop policy if exists "update_own_notifications" on public.notifications;
create policy "update_own_notifications"
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "delete_own_notifications" on public.notifications;
create policy "delete_own_notifications"
  on public.notifications for delete
  using (recipient_id = auth.uid());

-- 12. Reports Policies
drop policy if exists "insert_report_as_reporter" on public.reports;
create policy "insert_report_as_reporter"
  on public.reports for insert
  with check (
    reporter_id = auth.uid()
    and public.current_role_is('user')
  );

drop policy if exists "reporter_reads_own_reports" on public.reports;
create policy "reporter_reads_own_reports"
  on public.reports for select
  using (
    reporter_id = auth.uid()
    or public.current_role_is('moderator')
  );

drop policy if exists "moderators_update_reports" on public.reports;
create policy "moderators_update_reports"
  on public.reports for update
  using (public.current_role_is('moderator'))
  with check (public.current_role_is('moderator'));

-- 13. Report Events Policies
drop policy if exists "moderators_read_report_events" on public.report_events;
create policy "moderators_read_report_events"
  on public.report_events for select
  using (public.current_role_is('moderator'));

-- 14. Audit Logs Policies
drop policy if exists "moderators_read_audit_logs" on public.audit_logs;
create policy "moderators_read_audit_logs"
  on public.audit_logs for select
  using (public.current_role_is('moderator'));

-- 15. Activity Events (Private, server service-role only)
-- No public policies created, so direct client access is completely denied by default RLS.
