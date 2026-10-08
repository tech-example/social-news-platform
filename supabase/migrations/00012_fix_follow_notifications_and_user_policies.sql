-- Migration: 00012_fix_follow_notifications_and_user_policies.sql
-- Description:
--   1. Drop duplicate follow triggers and make notify_on_follow idempotent to prevent duplicate notifications.
--   2. Restrict comment deletion policy so regular users cannot delete comments (only moderators/admins).
--   3. Ensure profiles.hide_flagged_content has default true and handle_new_user explicitly sets it to true.
--   4. One-time deduplication cleanup for notifications.

-- 1. Deduplicate follow triggers and make notify_on_follow idempotent
drop trigger if exists notify_on_follow on public.follows;
drop trigger if exists notify_on_follow_trigger on public.follows;
drop trigger if exists follow_notification_trigger on public.follows;
drop trigger if exists on_follow_created on public.follows;
drop trigger if exists tr_notify_on_follow on public.follows;
drop trigger if exists tr_follow_notification on public.follows;

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.follower_id <> new.following_id then
    -- Deduplication guard: ignore if identical notification was created within the last 5 seconds
    if not exists (
      select 1 from public.notifications
      where recipient_id = new.following_id
        and actor_id = new.follower_id
        and type = 'follow'
        and created_at >= now() - interval '5 seconds'
    ) then
      insert into public.notifications (recipient_id, actor_id, type)
      values (new.following_id, new.follower_id, 'follow');
    end if;
  end if;
  return new;
end;
$$;

create trigger notify_on_follow_trigger
  after insert on public.follows
  for each row execute function public.notify_on_follow();

-- 2. Restrict comment delete policy: only moderators and admins may delete/remove comments
drop policy if exists "delete_own_comment" on public.comments;
drop policy if exists "staff_delete_comment" on public.comments;
create policy "staff_delete_comment"
  on public.comments for delete
  using (
    public.current_role_is('moderator')
    or public.current_role_is('admin')
  );

-- 3. Ensure hide_flagged_content default is true and handle_new_user sets it
alter table public.profiles
  alter column hide_flagged_content set default true;

update public.profiles
  set hide_flagged_content = true
  where hide_flagged_content is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw_username text;
  v_clean_username text;
  v_display_name text;
  v_count int := 0;
begin
  v_raw_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(trim(split_part(new.email, '@', 1)), ''),
    'user_' || substr(new.id::text, 1, 6)
  );

  v_clean_username := lower(regexp_replace(v_raw_username, '[^a-zA-Z0-9_]', '', 'g'));
  v_clean_username := substr(v_clean_username, 1, 20);

  if length(v_clean_username) = 0 then
    v_clean_username := 'user_' || substr(new.id::text, 1, 6);
  end if;

  while exists (select 1 from public.profiles where username = v_clean_username) loop
    v_count := v_count + 1;
    v_clean_username := substr(v_clean_username, 1, 20) || '_' || v_count;
  end loop;

  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    v_clean_username
  );
  v_display_name := substr(v_display_name, 1, 60);

  insert into public.profiles (id, username, display_name, avatar_url, role, hide_flagged_content)
  values (
    new.id,
    v_clean_username,
    v_display_name,
    new.raw_user_meta_data->>'avatar_url',
    'user',
    true
  );

  return new;
end;
$$;

-- 4. One-time cleanup of any exact-duplicate follow notification rows
delete from public.notifications n1
where n1.type = 'follow'
  and exists (
    select 1
    from public.notifications n2
    where n2.type = 'follow'
      and n2.recipient_id = n1.recipient_id
      and n2.actor_id = n1.actor_id
      and n2.created_at = n1.created_at
      and n2.id < n1.id
  );

notify pgrst, 'reload schema';
