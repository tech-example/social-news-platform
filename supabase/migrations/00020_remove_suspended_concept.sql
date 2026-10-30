-- Migration: 00020_remove_suspended_concept.sql
-- Description:
--   Completely remove every "Suspended" concept from the database schema:
--   1. Reset any suspended profiles to active before column drop.
--   2. Update dependent RLS policies on profiles and comments.
--   3. Update protect_profile_columns() trigger function to remove is_suspended check.
--   4. Update helper functions current_role_is and current_user_role.
--   5. Update notify_on_report_created and report_transition RPCs.
--   6. Update stats functions (stats_overview, stats_kpis, stats_follower_distribution, stats_top_users, stats_roles_distribution).
--   7. Safely drop columns is_suspended and suspended_reason from public.profiles.
--   8. Notify pgrst to reload schema cache.

-- 1. Ensure any existing profiles are not flagged as suspended
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_suspended'
  ) then
    update public.profiles set is_suspended = false where is_suspended = true;
  end if;
end $$;

-- 2. Update dependent RLS policies on public.profiles
drop policy if exists "update_own_profile" on public.profiles;
create policy "update_own_profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Update dependent RLS policies on public.comments
drop policy if exists "delete_comment" on public.comments;
drop policy if exists "staff_delete_comment" on public.comments;
create policy "delete_comment"
  on public.comments for delete
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('moderator', 'admin')
    )
  );

-- 3. Update protect_profile_columns trigger function on public.profiles
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
begin
  if (old.role is distinct from new.role) then
    -- Allow service_role
    if current_setting('request.jwt.claim.role', true) = 'service_role' then
      return new;
    end if;

    -- Check if current authenticated user is an admin
    select role into v_caller_role
    from public.profiles
    where id = auth.uid();

    if v_caller_role is distinct from 'admin' then
      raise exception 'Only administrators can modify user role';
    end if;
  end if;

  return new;
end;
$$;

-- 4. Update helper functions
create or replace function public.current_role_is(min_role public.user_role)
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
    where id = auth.uid()
  ), false);
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid()
$$;

-- 5. Update moderation and notification functions
create or replace function public.notify_on_report_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    insert into public.notifications (recipient_id, actor_id, type, report_id)
    select p.id, new.reporter_id, 'moderation', new.id
    from public.profiles p
    where p.role in ('moderator', 'admin')
      and p.id <> coalesce(new.reporter_id, '00000000-0000-0000-0000-000000000000'::uuid);
  end if;
  return new;
end;
$$;

create or replace function public.report_transition(
  p_report_id uuid,
  p_to_status public.report_status,
  p_actor_id uuid,
  p_content_action text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := coalesce(p_actor_id, auth.uid());
  v_current_status public.report_status;
  v_target_type public.report_target_type;
  v_target_user_id uuid;
  v_target_post_id uuid;
  v_target_comment_id uuid;
  v_reporter_id uuid;
  v_actor_role public.user_role;
begin
  if v_actor_id is null then
    raise exception 'Unauthorized: actor_id required';
  end if;

  -- Fetch actor role
  select role into v_actor_role from public.profiles where id = v_actor_id;
  if v_actor_role is null or v_actor_role not in ('moderator', 'admin') then
    raise exception 'Unauthorized: moderator or admin role required';
  end if;

  -- Fetch current report
  select status, target_type, target_user_id, target_post_id, target_comment_id, reporter_id
  into v_current_status, v_target_type, v_target_user_id, v_target_post_id, v_target_comment_id, v_reporter_id
  from public.reports
  where id = p_report_id;

  if v_current_status is null then
    raise exception 'Report not found';
  end if;

  if v_current_status in ('resolved_actioned', 'resolved_dismissed') then
    raise exception 'Report is already resolved and cannot be modified';
  end if;

  -- State machine validation
  if p_to_status = 'in_review' then
    if v_current_status <> 'pending' then
      raise exception 'Report can only transition to in_review from pending';
    end if;
  elsif p_to_status = 'escalated' then
    if v_current_status not in ('pending', 'in_review') then
      raise exception 'Report can only be escalated from pending or in_review';
    end if;
  elsif p_to_status = 'resolved_dismissed' then
    if v_current_status not in ('in_review', 'escalated') then
      raise exception 'Report must be in_review or escalated to be dismissed';
    end if;
    if v_current_status = 'escalated' and v_actor_role <> 'admin' then
      raise exception 'Only administrators can resolve an escalated report';
    end if;
  elsif p_to_status = 'resolved_actioned' then
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

  -- When a report is escalated: notify all active admins specifically, type = 'moderation'
  if p_to_status = 'escalated' then
    insert into public.notifications (recipient_id, actor_id, type, report_id)
    select p.id, v_actor_id, 'moderation', p_report_id
    from public.profiles p
    where p.role = 'admin'
      and p.id <> v_actor_id;
  end if;

  -- When a report is resolved: notify original reporter, type = 'report_update'
  if p_to_status in ('resolved_actioned', 'resolved_dismissed') and v_reporter_id is not null and v_reporter_id <> v_actor_id then
    insert into public.notifications (recipient_id, actor_id, type, report_id)
    values (v_reporter_id, v_actor_id, 'report_update', p_report_id);
  end if;

  return jsonb_build_object('ok', true, 'report_id', p_report_id, 'status', p_to_status);
end;
$$;

grant execute on function public.report_transition(uuid, public.report_status, uuid, text, text) to authenticated, service_role;

-- 6. Update Analytics & Stats Functions
create or replace function public.stats_overview(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration interval;
  v_prev_from timestamptz;
  v_prev_to timestamptz;

  v_total_users int;
  v_new_users int;
  v_prev_new_users int;

  v_total_posts int;
  v_new_posts int;
  v_prev_new_posts int;

  v_likes int;
  v_prev_likes int;
  v_comments int;
  v_prev_comments int;
  v_shares int;
  v_prev_shares int;
  v_follows int;
  v_prev_follows int;

  v_open_reports int;
  v_prev_open_reports int;
  v_escalated_reports int;
  v_prev_escalated_reports int;
begin
  if not public.current_role_is('moderator') then
    raise exception 'Moderator or administrator role required';
  end if;

  v_duration := p_to - p_from;
  v_prev_to := p_from;
  v_prev_from := p_from - v_duration;

  -- Users
  select count(*) into v_total_users from public.profiles;
  select count(*) into v_new_users from public.profiles where created_at between p_from and p_to;
  select count(*) into v_prev_new_users from public.profiles where created_at between v_prev_from and v_prev_to;

  -- Posts
  select count(*) into v_total_posts from public.posts where status <> 'removed';
  select count(*) into v_new_posts from public.posts where status <> 'removed' and created_at between p_from and p_to;
  select count(*) into v_prev_new_posts from public.posts where status <> 'removed' and created_at between v_prev_from and v_prev_to;

  -- Likes
  select count(*) into v_likes from public.likes where created_at between p_from and p_to;
  select count(*) into v_prev_likes from public.likes where created_at between v_prev_from and v_prev_to;

  -- Comments
  select count(*) into v_comments from public.comments where status <> 'removed' and created_at between p_from and p_to;
  select count(*) into v_prev_comments from public.comments where status <> 'removed' and created_at between v_prev_from and v_prev_to;

  -- Shares
  select count(*) into v_shares from public.shares where created_at between p_from and p_to;
  select count(*) into v_prev_shares from public.shares where created_at between v_prev_from and v_prev_to;

  -- Follows
  select count(*) into v_follows from public.follows where created_at between p_from and p_to;
  select count(*) into v_prev_follows from public.follows where created_at between v_prev_from and v_prev_to;

  -- Open Reports (pending + in_review)
  select count(*) into v_open_reports from public.reports where status in ('pending', 'in_review') and created_at between p_from and p_to;
  select count(*) into v_prev_open_reports from public.reports where status in ('pending', 'in_review') and created_at between v_prev_from and v_prev_to;

  -- Escalated Reports
  select count(*) into v_escalated_reports from public.reports where status = 'escalated' and created_at between p_from and p_to;
  select count(*) into v_prev_escalated_reports from public.reports where status = 'escalated' and created_at between v_prev_from and v_prev_to;

  return jsonb_build_object(
    'total_users', v_total_users,
    'new_users', v_new_users,
    'prev_new_users', v_prev_new_users,
    'total_posts', v_total_posts,
    'new_posts', v_new_posts,
    'prev_new_posts', v_prev_new_posts,
    'likes', v_likes,
    'prev_likes', v_prev_likes,
    'comments', v_comments,
    'prev_comments', v_prev_comments,
    'shares', v_shares,
    'prev_shares', v_prev_shares,
    'follows', v_follows,
    'prev_follows', v_prev_follows,
    'total_engagement', (v_likes + v_comments + v_shares),
    'prev_total_engagement', (v_prev_likes + v_prev_comments + v_prev_shares),
    'open_reports', v_open_reports,
    'prev_open_reports', v_prev_open_reports,
    'escalated_reports', v_escalated_reports,
    'prev_escalated_reports', v_prev_escalated_reports
  );
end;
$$;

create or replace function public.stats_kpis(
  p_range text default '30d',
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz;
  v_to timestamptz;
  v_overview jsonb;
  v_active jsonb;
begin
  if not public.current_role_is('admin') then
    raise exception 'Administrator role required';
  end if;

  if p_from is not null and p_to is not null then
    v_from := p_from;
    v_to := p_to;
  elsif p_range = 'today' then
    v_from := date_trunc('day', now());
    v_to := now();
  elsif p_range = '7d' then
    v_from := now() - interval '7 days';
    v_to := now();
  elsif p_range = '90d' then
    v_from := now() - interval '90 days';
    v_to := now();
  else
    v_from := now() - interval '30 days';
    v_to := now();
  end if;

  v_overview := public.stats_overview(v_from, v_to);

  begin
    v_active := public.stats_active_users(v_from, v_to);
  exception when others then
    v_active := jsonb_build_object('dau', 0, 'wau', 0, 'mau', 0);
  end;

  return jsonb_build_object(
    'total_users', coalesce((v_overview->>'total_users')::int, 0),
    'new_users', coalesce((v_overview->>'new_users')::int, 0),
    'prev_new_users', coalesce((v_overview->>'prev_new_users')::int, 0),
    'total_posts', coalesce((v_overview->>'total_posts')::int, 0),
    'new_posts', coalesce((v_overview->>'new_posts')::int, 0),
    'prev_new_posts', coalesce((v_overview->>'prev_new_posts')::int, 0),
    'likes', coalesce((v_overview->>'likes')::int, 0),
    'prev_likes', coalesce((v_overview->>'prev_likes')::int, 0),
    'comments', coalesce((v_overview->>'comments')::int, 0),
    'prev_comments', coalesce((v_overview->>'prev_comments')::int, 0),
    'shares', coalesce((v_overview->>'shares')::int, 0),
    'prev_shares', coalesce((v_overview->>'prev_shares')::int, 0),
    'follows', coalesce((v_overview->>'follows')::int, 0),
    'prev_follows', coalesce((v_overview->>'prev_follows')::int, 0),
    'total_engagement', coalesce((v_overview->>'total_engagement')::int, 0),
    'prev_total_engagement', coalesce((v_overview->>'prev_total_engagement')::int, 0),
    'open_reports', coalesce((v_overview->>'open_reports')::int, 0),
    'prev_open_reports', coalesce((v_overview->>'prev_open_reports')::int, 0),
    'escalated_reports', coalesce((v_overview->>'escalated_reports')::int, 0),
    'prev_escalated_reports', coalesce((v_overview->>'prev_escalated_reports')::int, 0),
    'active_users_dau', coalesce((v_active->>'dau')::int, 0),
    'active_users_wau', coalesce((v_active->>'wau')::int, 0),
    'active_users_mau', coalesce((v_active->>'mau')::int, 0)
  );
end;
$$;

create or replace function public.stats_follower_distribution()
returns table (
  bucket text,
  user_count bigint,
  pct numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with classified as (
    select
      case
        when followers_count = 0 then '0'
        when followers_count between 1 and 9 then '1-9'
        when followers_count between 10 and 99 then '10-99'
        else '100+'
      end as bucket,
      case
        when followers_count = 0 then 1
        when followers_count between 1 and 9 then 2
        when followers_count between 10 and 99 then 3
        else 4
      end as sort_order
    from public.profiles
  ),
  total_users as (
    select count(*)::numeric as tot from public.profiles
  )
  select
    c.bucket,
    count(*)::bigint as user_count,
    case
      when (select tot from total_users) > 0 then
        round((count(*)::numeric / (select tot from total_users)) * 100, 1)
      else 0
    end as pct
  from classified c
  group by c.bucket, c.sort_order
  order by c.sort_order;
$$;

create or replace function public.stats_top_users(
  p_from timestamptz,
  p_to timestamptz,
  p_limit int default 10
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  posts_count int,
  followers_count int,
  total_engagement bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.id,
    pr.username,
    pr.display_name,
    pr.avatar_url,
    pr.posts_count,
    pr.followers_count,
    coalesce(sum(p.likes_count + 2 * p.comments_count + 3 * p.shares_count), 0)::bigint as total_engagement
  from public.profiles pr
  left join public.posts p on p.author_id = pr.id and p.status = 'published' and p.created_at between p_from and p_to
  group by pr.id
  order by total_engagement desc, pr.followers_count desc
  limit greatest(1, least(p_limit, 50));
$$;

create or replace function public.stats_roles_distribution()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_users int;
  v_moderators int;
  v_admins int;
begin
  if not public.current_role_is('admin') then
    raise exception 'Administrator role required';
  end if;

  select count(*) into v_users from public.profiles where role = 'user';
  select count(*) into v_moderators from public.profiles where role = 'moderator';
  select count(*) into v_admins from public.profiles where role = 'admin';

  return jsonb_build_object(
    'users', v_users,
    'moderators', v_moderators,
    'admins', v_admins,
    'total', (v_users + v_moderators + v_admins)
  );
end;
$$;

grant execute on function public.stats_overview(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.stats_kpis(text, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.stats_follower_distribution() to authenticated, service_role;
grant execute on function public.stats_top_users(timestamptz, timestamptz, int) to authenticated, service_role;
grant execute on function public.stats_roles_distribution() to authenticated, service_role;

-- 7. Safely drop columns from public.profiles
alter table public.profiles drop column if exists is_suspended cascade;
alter table public.profiles drop column if exists suspended_reason cascade;

-- 8. Notify PostgREST to reload schema
notify pgrst, 'reload schema';
