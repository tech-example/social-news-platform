-- Migration: 00004_stats_functions.sql
-- Description: Analytics and statistics aggregation RPC functions for Admin and Moderator dashboards

-- 1. Stats Overview (Current vs Previous Period for Deltas)
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

  v_open_reports int;
  v_escalated_reports int;
  v_suspended_users int;
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
  select count(*) into v_suspended_users from public.profiles where is_suspended = true;

  -- Posts
  select count(*) into v_total_posts from public.posts where status <> 'removed';
  select count(*) into v_new_posts from public.posts where status <> 'removed' and created_at between p_from and p_to;
  select count(*) into v_prev_new_posts from public.posts where status <> 'removed' and created_at between v_prev_from and v_prev_to;

  -- Engagement
  select count(*) into v_likes from public.likes where created_at between p_from and p_to;
  select count(*) into v_prev_likes from public.likes where created_at between v_prev_from and v_prev_to;

  select count(*) into v_comments from public.comments where status <> 'removed' and created_at between p_from and p_to;
  select count(*) into v_prev_comments from public.comments where status <> 'removed' and created_at between v_prev_from and v_prev_to;

  select count(*) into v_shares from public.shares where created_at between p_from and p_to;
  select count(*) into v_prev_shares from public.shares where created_at between v_prev_from and v_prev_to;

  -- Reports
  select count(*) into v_open_reports from public.reports where status in ('pending', 'in_review');
  select count(*) into v_escalated_reports from public.reports where status = 'escalated';

  return jsonb_build_object(
    'total_users', v_total_users,
    'new_users', v_new_users,
    'prev_new_users', v_prev_new_users,
    'suspended_users', v_suspended_users,
    'total_posts', v_total_posts,
    'new_posts', v_new_posts,
    'prev_new_posts', v_prev_new_posts,
    'likes', v_likes,
    'prev_likes', v_prev_likes,
    'comments', v_comments,
    'prev_comments', v_prev_comments,
    'shares', v_shares,
    'prev_shares', v_prev_shares,
    'total_engagement', (v_likes + v_comments + v_shares),
    'prev_total_engagement', (v_prev_likes + v_prev_comments + v_prev_shares),
    'open_reports', v_open_reports,
    'escalated_reports', v_escalated_reports
  );
end;
$$;

-- 2. Stats Timeseries (By Metric and Bucket)
create or replace function public.stats_timeseries(
  p_metric text,
  p_from timestamptz,
  p_to timestamptz,
  p_bucket text default 'day'
)
returns table (
  bucket timestamptz,
  value bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trunc text := case when p_bucket in ('week', 'month') then p_bucket else 'day' end;
begin
  if not public.current_role_is('moderator') then
    raise exception 'Moderator or administrator role required';
  end if;

  if p_metric = 'users' then
    return query
      select date_trunc(v_trunc, created_at) as b, count(*)::bigint
      from public.profiles
      where created_at between p_from and p_to
      group by 1 order by 1;
  elsif p_metric = 'posts' then
    return query
      select date_trunc(v_trunc, created_at) as b, count(*)::bigint
      from public.posts
      where status <> 'removed' and created_at between p_from and p_to
      group by 1 order by 1;
  elsif p_metric = 'likes' then
    return query
      select date_trunc(v_trunc, created_at) as b, count(*)::bigint
      from public.likes
      where created_at between p_from and p_to
      group by 1 order by 1;
  elsif p_metric = 'comments' then
    return query
      select date_trunc(v_trunc, created_at) as b, count(*)::bigint
      from public.comments
      where status <> 'removed' and created_at between p_from and p_to
      group by 1 order by 1;
  elsif p_metric = 'shares' then
    return query
      select date_trunc(v_trunc, created_at) as b, count(*)::bigint
      from public.shares
      where created_at between p_from and p_to
      group by 1 order by 1;
  elsif p_metric = 'reports' then
    return query
      select date_trunc(v_trunc, created_at) as b, count(*)::bigint
      from public.reports
      where created_at between p_from and p_to
      group by 1 order by 1;
  else
    raise exception 'Invalid metric: %', p_metric;
  end if;
end;
$$;

-- 3. Stats Engagement By Day (Stacked components)
create or replace function public.stats_engagement_by_day(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  day date,
  likes bigint,
  comments bigint,
  shares bigint,
  total bigint
)
language sql
security definer
set search_path = public
as $$
  with days as (
    select generate_series(date_trunc('day', p_from), date_trunc('day', p_to), '1 day'::interval)::date as d
  ),
  l as (
    select date_trunc('day', created_at)::date as d, count(*) as cnt
    from public.likes
    where created_at between p_from and p_to
    group by 1
  ),
  c as (
    select date_trunc('day', created_at)::date as d, count(*) as cnt
    from public.comments
    where status <> 'removed' and created_at between p_from and p_to
    group by 1
  ),
  s as (
    select date_trunc('day', created_at)::date as d, count(*) as cnt
    from public.shares
    where created_at between p_from and p_to
    group by 1
  )
  select
    days.d as day,
    coalesce(l.cnt, 0)::bigint as likes,
    coalesce(c.cnt, 0)::bigint as comments,
    coalesce(s.cnt, 0)::bigint as shares,
    (coalesce(l.cnt, 0) + coalesce(c.cnt, 0) + coalesce(s.cnt, 0))::bigint as total
  from days
  left join l on days.d = l.d
  left join c on days.d = c.d
  left join s on days.d = s.d
  order by days.d;
$$;

-- 4. Stats Active Users (DAU / WAU / MAU)
create or replace function public.stats_active_users(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dau int;
  v_wau int;
  v_mau int;
begin
  if not public.current_role_is('admin') then
    raise exception 'Administrator role required';
  end if;

  -- DAU: Unique users active in the last 24 hours of range
  select count(distinct user_id) into v_dau
  from public.activity_events
  where user_id is not null and created_at between (p_to - interval '1 day') and p_to;

  -- WAU: Unique users active in the last 7 days of range
  select count(distinct user_id) into v_wau
  from public.activity_events
  where user_id is not null and created_at between (p_to - interval '7 days') and p_to;

  -- MAU: Unique users active in the last 30 days of range
  select count(distinct user_id) into v_mau
  from public.activity_events
  where user_id is not null and created_at between (p_to - interval '30 days') and p_to;

  return jsonb_build_object(
    'dau', coalesce(v_dau, 0),
    'wau', coalesce(v_wau, 0),
    'mau', coalesce(v_mau, 0)
  );
end;
$$;

-- 5. Stats Top Posts By Engagement
create or replace function public.stats_top_posts(
  p_from timestamptz,
  p_to timestamptz,
  p_limit int default 10
)
returns table (
  id uuid,
  title text,
  author_id uuid,
  author_username text,
  author_display_name text,
  likes_count int,
  comments_count int,
  shares_count int,
  engagement_score bigint,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    coalesce(p.title, substr(p.body, 1, 60)) as title,
    p.author_id,
    pr.username as author_username,
    pr.display_name as author_display_name,
    p.likes_count,
    p.comments_count,
    p.shares_count,
    (p.likes_count + 2 * p.comments_count + 3 * p.shares_count)::bigint as engagement_score,
    p.created_at
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  where p.status = 'published' and p.created_at between p_from and p_to
  order by engagement_score desc, p.created_at desc
  limit greatest(1, least(p_limit, 50));
$$;

-- 6. Stats Top Users By Engagement
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
  where not pr.is_suspended
  group by pr.id
  order by total_engagement desc, pr.followers_count desc
  limit greatest(1, least(p_limit, 50));
$$;

-- 7. Stats Top Tags
create or replace function public.stats_top_tags(
  p_from timestamptz,
  p_to timestamptz,
  p_limit int default 10
)
returns table (
  name text,
  posts_count bigint,
  total_engagement bigint
)
language sql
security definer
set search_path = public
as $$
  select
    t.name,
    count(distinct pt.post_id)::bigint as posts_count,
    coalesce(sum(p.likes_count + 2 * p.comments_count + 3 * p.shares_count), 0)::bigint as total_engagement
  from public.tags t
  join public.post_tags pt on pt.tag_id = t.id
  join public.posts p on p.id = pt.post_id and p.status = 'published' and p.created_at between p_from and p_to
  group by t.id, t.name
  order by posts_count desc, total_engagement desc
  limit greatest(1, least(p_limit, 50));
$$;

-- 8. Stats Reports By Status
create or replace function public.stats_reports_by_status()
returns table (
  status report_status,
  count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    r.status,
    count(*)::bigint
  from public.reports r
  group by r.status;
$$;

-- 9. Stats Reports By Reason
create or replace function public.stats_reports_by_reason(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  reason text,
  count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    r.reason,
    count(*)::bigint
  from public.reports r
  where r.created_at between p_from and p_to
  group by r.reason
  order by count desc;
$$;

-- 10. Stats Report Resolution Time (Median and P90 in hours)
create or replace function public.stats_report_resolution_time(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_median real;
  v_p90 real;
begin
  if not public.current_role_is('moderator') then
    raise exception 'Moderator or administrator role required';
  end if;

  select
    percentile_cont(0.5) within group (order by extract(epoch from (resolved_at - created_at)) / 3600.0),
    percentile_cont(0.9) within group (order by extract(epoch from (resolved_at - created_at)) / 3600.0)
  into v_median, v_p90
  from public.reports
  where resolved_at is not null and created_at between p_from and p_to;

  return jsonb_build_object(
    'median_hours', round(coalesce(v_median, 0)::numeric, 1),
    'p90_hours', round(coalesce(v_p90, 0)::numeric, 1)
  );
end;
$$;

-- 11. Stats Moderator Workload
create or replace function public.stats_moderator_workload(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  moderator_id uuid,
  username text,
  display_name text,
  handled_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    pr.id as moderator_id,
    pr.username,
    pr.display_name,
    count(distinct re.report_id)::bigint as handled_count
  from public.profiles pr
  join public.report_events re on re.actor_id = pr.id and re.created_at between p_from and p_to
  where pr.role in ('moderator', 'admin')
  group by pr.id, pr.username, pr.display_name
  order by handled_count desc;
$$;

-- 12. Stats Roles Distribution
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
  v_suspended int;
begin
  if not public.current_role_is('admin') then
    raise exception 'Administrator role required';
  end if;

  select count(*) into v_users from public.profiles where role = 'user' and not is_suspended;
  select count(*) into v_moderators from public.profiles where role = 'moderator' and not is_suspended;
  select count(*) into v_admins from public.profiles where role = 'admin' and not is_suspended;
  select count(*) into v_suspended from public.profiles where is_suspended = true;

  return jsonb_build_object(
    'users', v_users,
    'moderators', v_moderators,
    'admins', v_admins,
    'suspended', v_suspended,
    'total', (v_users + v_moderators + v_admins + v_suspended)
  );
end;
$$;

-- 13. Stats Search Terms
create or replace function public.stats_search_terms(
  p_from timestamptz,
  p_to timestamptz,
  p_limit int default 10
)
returns table (
  term text,
  count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    lower(trim(query)) as term,
    count(*)::bigint
  from public.activity_events
  where kind = 'search' and query is not null and created_at between p_from and p_to
  group by lower(trim(query))
  order by count desc
  limit greatest(1, least(p_limit, 50));
$$;

-- 14. Stats Content Mix (% with images, % with tags, avg tags)
create or replace function public.stats_content_mix(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_with_image int;
  v_with_tags int;
  v_avg_tags real;
begin
  if not public.current_role_is('moderator') then
    raise exception 'Moderator or administrator role required';
  end if;

  select count(*) into v_total from public.posts where status = 'published' and created_at between p_from and p_to;

  if v_total = 0 then
    return jsonb_build_object(
      'total_posts', 0,
      'pct_with_image', 0,
      'pct_with_tags', 0,
      'avg_tags_per_post', 0
    );
  end if;

  select count(*) into v_with_image from public.posts where status = 'published' and image_url is not null and created_at between p_from and p_to;

  select count(distinct post_id) into v_with_tags
  from public.post_tags pt
  join public.posts p on p.id = pt.post_id
  where p.status = 'published' and p.created_at between p_from and p_to;

  select coalesce(avg(tag_count), 0) into v_avg_tags
  from (
    select count(pt.tag_id) as tag_count
    from public.posts p
    left join public.post_tags pt on pt.post_id = p.id
    where p.status = 'published' and p.created_at between p_from and p_to
    group by p.id
  ) s;

  return jsonb_build_object(
    'total_posts', v_total,
    'pct_with_image', round(((v_with_image::numeric / v_total) * 100), 1),
    'pct_with_tags', round(((v_with_tags::numeric / v_total) * 100), 1),
    'avg_tags_per_post', round(v_avg_tags::numeric, 1)
  );
end;
$$;
