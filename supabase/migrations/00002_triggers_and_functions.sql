-- Migration: 00002_triggers_and_functions.sql
-- Description: Core triggers, counter maintenance, notifications, and atomic RPC functions

-- 1. Updated_at timestamp trigger
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_posts_updated_at on public.posts;
create trigger touch_posts_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_comments_updated_at on public.comments;
create trigger touch_comments_updated_at
  before update on public.comments
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_reports_updated_at on public.reports;
create trigger touch_reports_updated_at
  before update on public.reports
  for each row execute function public.touch_updated_at();

-- 2. Auth hook: create profile on user registration
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
  -- Extract username from metadata or email prefix
  v_raw_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );

  -- Sanitize username: lowercase, letters/numbers/underscores only
  v_clean_username := lower(regexp_replace(v_raw_username, '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(v_clean_username) < 3 then
    v_clean_username := 'user_' || substr(md5(random()::text), 1, 6);
  end if;
  v_clean_username := substr(v_clean_username, 1, 24);

  -- Ensure uniqueness
  while exists (select 1 from public.profiles where username = v_clean_username) loop
    v_count := v_count + 1;
    v_clean_username := substr(v_clean_username, 1, 20) || '_' || v_count;
  end loop;

  -- Extract display name
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    v_clean_username
  );
  v_display_name := substr(v_display_name, 1, 60);

  insert into public.profiles (id, username, display_name, avatar_url, role)
  values (
    new.id,
    v_clean_username,
    v_display_name,
    new.raw_user_meta_data->>'avatar_url',
    'user'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Column protection: prevent non-admins from altering role or suspension status
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
begin
  if (old.role is distinct from new.role) or (old.is_suspended is distinct from new.is_suspended) then
    -- Allow service_role
    if current_setting('request.jwt.claim.role', true) = 'service_role' then
      return new;
    end if;

    -- Check if current authenticated user is an admin
    select role into v_caller_role
    from public.profiles
    where id = auth.uid();

    if v_caller_role is distinct from 'admin' then
      raise exception 'Only administrators can modify user role or suspension status';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profiles_columns_trigger on public.profiles;
create trigger protect_profiles_columns_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- 4. Counter maintenance triggers
-- 4a. Likes count
create or replace function public.maintain_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists maintain_likes_count_trigger on public.likes;
create trigger maintain_likes_count_trigger
  after insert or delete on public.likes
  for each row execute function public.maintain_likes_count();

-- 4b. Comments count
create or replace function public.maintain_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists maintain_comments_count_trigger on public.comments;
create trigger maintain_comments_count_trigger
  after insert or delete on public.comments
  for each row execute function public.maintain_comments_count();

-- 4c. Shares count
create or replace function public.maintain_shares_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set shares_count = shares_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set shares_count = greatest(0, shares_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists maintain_shares_count_trigger on public.shares;
create trigger maintain_shares_count_trigger
  after insert or delete on public.shares
  for each row execute function public.maintain_shares_count();

-- 4d. Posts count on profile
create or replace function public.maintain_posts_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set posts_count = posts_count + 1 where id = new.author_id;
  elsif (tg_op = 'DELETE') then
    update public.profiles set posts_count = greatest(0, posts_count - 1) where id = old.author_id;
  end if;
  return null;
end;
$$;

drop trigger if exists maintain_posts_count_trigger on public.posts;
create trigger maintain_posts_count_trigger
  after insert or delete on public.posts
  for each row execute function public.maintain_posts_count();

-- 4e. Follows count
create or replace function public.maintain_follows_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
  elsif (tg_op = 'DELETE') then
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    update public.profiles set followers_count = greatest(0, followers_count - 1) where id = old.following_id;
  end if;
  return null;
end;
$$;

drop trigger if exists maintain_follows_count_trigger on public.follows;
create trigger maintain_follows_count_trigger
  after insert or delete on public.follows
  for each row execute function public.maintain_follows_count();

-- 4f. Tags posts count
create or replace function public.maintain_tags_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.tags set posts_count = posts_count + 1 where id = new.tag_id;
  elsif (tg_op = 'DELETE') then
    update public.tags set posts_count = greatest(0, posts_count - 1) where id = old.tag_id;
  end if;
  return null;
end;
$$;

drop trigger if exists maintain_tags_count_trigger on public.post_tags;
create trigger maintain_tags_count_trigger
  after insert or delete on public.post_tags
  for each row execute function public.maintain_tags_count();

-- 5. Notification Triggers (Skips self actions)
-- 5a. Like notification
create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient_id uuid;
begin
  select author_id into v_recipient_id from public.posts where id = new.post_id;
  if v_recipient_id is not null and v_recipient_id <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    values (v_recipient_id, new.user_id, 'like', new.post_id);
  end if;
  return new;
end;
$$;

drop trigger if exists notify_on_like_trigger on public.likes;
create trigger notify_on_like_trigger
  after insert on public.likes
  for each row execute function public.notify_on_like();

-- 5b. Comment notification
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient_id uuid;
  v_parent_author_id uuid;
begin
  -- If reply to another comment, notify parent author
  if new.parent_id is not null then
    select author_id into v_parent_author_id from public.comments where id = new.parent_id;
    if v_parent_author_id is not null and v_parent_author_id <> new.author_id then
      insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
      values (v_parent_author_id, new.author_id, 'comment', new.post_id, new.id);
    end if;
  end if;

  -- Notify post author
  select author_id into v_recipient_id from public.posts where id = new.post_id;
  if v_recipient_id is not null and v_recipient_id <> new.author_id and (v_parent_author_id is null or v_recipient_id <> v_parent_author_id) then
    insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
    values (v_recipient_id, new.author_id, 'comment', new.post_id, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists notify_on_comment_trigger on public.comments;
create trigger notify_on_comment_trigger
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- 5c. Follow notification
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.follower_id <> new.following_id then
    insert into public.notifications (recipient_id, actor_id, type)
    values (new.following_id, new.follower_id, 'follow');
  end if;
  return new;
end;
$$;

drop trigger if exists notify_on_follow_trigger on public.follows;
create trigger notify_on_follow_trigger
  after insert on public.follows
  for each row execute function public.notify_on_follow();

-- 5d. Share notification
create or replace function public.notify_on_share()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient_id uuid;
begin
  select author_id into v_recipient_id from public.posts where id = new.post_id;
  if v_recipient_id is not null and v_recipient_id <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    values (v_recipient_id, new.user_id, 'share', new.post_id);
  end if;
  return new;
end;
$$;

drop trigger if exists notify_on_share_trigger on public.shares;
create trigger notify_on_share_trigger
  after insert on public.shares
  for each row execute function public.notify_on_share();

-- 6. Atomic RPC Functions
-- 6a. Toggle Like
create or replace function public.toggle_like(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_liked boolean;
  v_likes_count int;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.likes where user_id = v_user_id and post_id = p_post_id) then
    delete from public.likes where user_id = v_user_id and post_id = p_post_id;
    v_liked := false;
  else
    insert into public.likes (user_id, post_id) values (v_user_id, p_post_id);
    v_liked := true;
  end if;

  select likes_count into v_likes_count from public.posts where id = p_post_id;
  return jsonb_build_object('liked', v_liked, 'likes_count', coalesce(v_likes_count, 0));
end;
$$;

-- 6b. Toggle Follow
create or replace function public.toggle_follow(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_follower_id uuid := auth.uid();
  v_following boolean;
  v_followers_count int;
begin
  if v_follower_id is null then
    raise exception 'Authentication required';
  end if;

  if v_follower_id = p_user_id then
    raise exception 'Cannot follow yourself';
  end if;

  if exists (select 1 from public.follows where follower_id = v_follower_id and following_id = p_user_id) then
    delete from public.follows where follower_id = v_follower_id and following_id = p_user_id;
    v_following := false;
  else
    insert into public.follows (follower_id, following_id) values (v_follower_id, p_user_id);
    v_following := true;
  end if;

  select followers_count into v_followers_count from public.profiles where id = p_user_id;
  return jsonb_build_object('following', v_following, 'followers_count', coalesce(v_followers_count, 0));
end;
$$;

-- 6c. Set Post Tags
create or replace function public.set_post_tags(p_post_id uuid, p_tags text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_raw_tag text;
  v_clean_tag text;
  v_tag_id uuid;
  v_tag_count int := 0;
begin
  -- Validate authorship or moderator
  if not exists (
    select 1 from public.posts p
    join public.profiles pr on pr.id = v_user_id
    where p.id = p_post_id and (p.author_id = v_user_id or pr.role in ('moderator', 'admin'))
  ) then
    raise exception 'Unauthorized to edit tags for this post';
  end if;

  -- Delete current tags
  delete from public.post_tags where post_id = p_post_id;

  if p_tags is null or array_length(p_tags, 1) is null then
    return;
  end if;

  -- Insert up to 10 unique tags
  foreach v_raw_tag in array p_tags loop
    v_clean_tag := lower(regexp_replace(v_raw_tag, '^#|[^a-z0-9_]', '', 'g'));
    if char_length(v_clean_tag) between 2 and 40 then
      v_tag_count := v_tag_count + 1;
      if v_tag_count > 10 then
        exit;
      end if;

      insert into public.tags (name)
      values (v_clean_tag)
      on conflict (name) do update set name = excluded.name
      returning id into v_tag_id;

      insert into public.post_tags (post_id, tag_id)
      values (p_post_id, v_tag_id)
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- 6d. Report Transition (Two-Tier Moderation State Machine)
create or replace function public.report_transition(
  p_report_id uuid,
  p_to_status report_status,
  p_note text default null,
  p_content_action text default null -- 'hide', 'restore', 'remove', 'suspend_user'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role user_role;
  v_current_status report_status;
  v_target_type report_target_type;
  v_target_user_id uuid;
  v_target_post_id uuid;
  v_target_comment_id uuid;
  v_reporter_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  select role into v_actor_role from public.profiles where id = v_actor_id and not is_suspended;
  if v_actor_role not in ('moderator', 'admin') then
    raise exception 'Moderator or administrator role required';
  end if;

  select status, target_type, target_user_id, target_post_id, target_comment_id, reporter_id
  into v_current_status, v_target_type, v_target_user_id, v_target_post_id, v_target_comment_id, v_reporter_id
  from public.reports
  where id = p_report_id;

  if not found then
    raise exception 'Report not found';
  end if;

  -- State machine enforcement
  if p_to_status = 'in_review' then
    if v_current_status <> 'pending' then
      raise exception 'Report can only move to in_review from pending';
    end if;
  elsif p_to_status = 'escalated' then
    if v_current_status not in ('pending', 'in_review') then
      raise exception 'Report can only be escalated from pending or in_review';
    end if;
  elsif p_to_status = 'resolved_dismissed' then
    if v_current_status not in ('in_review', 'escalated') then
      raise exception 'Report must be in_review or escalated to be dismissed';
    end if;
  elsif p_to_status = 'resolved_actioned' then
    -- ONLY ADMINS can resolve as actioned
    if v_actor_role <> 'admin' then
      raise exception 'Only administrators can finalize a report as resolved_actioned';
    end if;
  end if;

  -- Apply Content Actions
  if p_content_action = 'hide' then
    if v_target_type = 'post' and v_target_post_id is not null then
      update public.posts set status = 'hidden' where id = v_target_post_id;
    elsif v_target_type = 'comment' and v_target_comment_id is not null then
      update public.comments set status = 'hidden' where id = v_target_comment_id;
    end if;
  elsif p_content_action = 'restore' then
    if v_target_type = 'post' and v_target_post_id is not null then
      update public.posts set status = 'published' where id = v_target_post_id;
    elsif v_target_type = 'comment' and v_target_comment_id is not null then
      update public.comments set status = 'published' where id = v_target_comment_id;
    end if;
  elsif p_content_action = 'remove' then
    if v_actor_role <> 'admin' then
      raise exception 'Only administrators can permanently remove content';
    end if;
    if v_target_type = 'post' and v_target_post_id is not null then
      update public.posts set status = 'removed' where id = v_target_post_id;
    elsif v_target_type = 'comment' and v_target_comment_id is not null then
      update public.comments set status = 'removed' where id = v_target_comment_id;
    end if;
  elsif p_content_action = 'suspend_user' then
    if v_actor_role <> 'admin' then
      raise exception 'Only administrators can suspend user accounts';
    end if;
    if v_target_user_id is not null then
      update public.profiles set is_suspended = true, suspended_reason = coalesce(p_note, 'Violation of terms') where id = v_target_user_id;
    end if;
  end if;

  -- Update report row
  update public.reports
  set
    status = p_to_status,
    assigned_moderator_id = coalesce(assigned_moderator_id, v_actor_id),
    moderator_note = case when v_actor_role = 'moderator' then coalesce(p_note, moderator_note) else moderator_note end,
    final_decision_by = case when p_to_status in ('resolved_actioned', 'resolved_dismissed') and v_actor_role = 'admin' then v_actor_id else final_decision_by end,
    final_decision_note = case when p_to_status in ('resolved_actioned', 'resolved_dismissed') and v_actor_role = 'admin' then coalesce(p_note, final_decision_note) else final_decision_note end,
    resolved_at = case when p_to_status in ('resolved_actioned', 'resolved_dismissed') then now() else null end
  where id = p_report_id;

  -- Record report event timeline
  insert into public.report_events (report_id, actor_id, from_status, to_status, note)
  values (p_report_id, v_actor_id, v_current_status, p_to_status, p_note);

  -- Record audit log
  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values (
    v_actor_id,
    'report.' || p_to_status::text,
    'report',
    p_report_id,
    jsonb_build_object(
      'from_status', v_current_status,
      'to_status', p_to_status,
      'content_action', p_content_action,
      'note', p_note
    )
  );

  -- Notify reporter of resolution
  if p_to_status in ('resolved_actioned', 'resolved_dismissed') and v_reporter_id is not null then
    insert into public.notifications (recipient_id, actor_id, type, report_id)
    values (v_reporter_id, v_actor_id, 'report_update', p_report_id);
  end if;

  return jsonb_build_object('ok', true, 'report_id', p_report_id, 'status', p_to_status);
end;
$$;

-- 6e. Search Posts (Cursor-paginated full-text and trigram ranking)
create or replace function public.search_posts(
  p_query text,
  p_limit int default 20,
  p_cursor timestamptz default null
)
returns table (
  id uuid,
  author_id uuid,
  title text,
  body text,
  image_url text,
  likes_count int,
  comments_count int,
  shares_count int,
  created_at timestamptz,
  author_username text,
  author_display_name text,
  author_avatar_url text,
  rank real
)
language sql
stable
set search_path = public
as $$
  select
    p.id,
    p.author_id,
    p.title,
    p.body,
    p.image_url,
    p.likes_count,
    p.comments_count,
    p.shares_count,
    p.created_at,
    pr.username as author_username,
    pr.display_name as author_display_name,
    pr.avatar_url as author_avatar_url,
    ts_rank(p.search_vector, websearch_to_tsquery('simple', p_query)) as rank
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  where
    p.status = 'published'
    and (p_cursor is null or p.created_at < p_cursor)
    and (
      p.search_vector @@ websearch_to_tsquery('simple', p_query)
      or p.body % p_query
      or coalesce(p.title, '') % p_query
    )
  order by rank desc, p.created_at desc
  limit greatest(1, least(p_limit, 50));
$$;
