-- Migration: 00006_dashboard_stats.sql
-- Description: Complete SQL analytics functions for Moderator and Admin dashboards per references/07-dashboards.md

-- 1. Helper function for role checking supporting service_role
create or replace function public.current_role_is(min_role user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    coalesce(auth.role() = 'service_role', false)
    or coalesce(current_setting('request.jwt.claim.role', true) = 'service_role', false)
    or coalesce((
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
    ), false)
  );
$$;

-- 2. Stats Overview (totals + previous-period deltas for users, posts, comments, likes, shares, follows, open reports)
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
  v_suspended_users int;

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
  select count(*) into v_suspended_users from public.profiles where is_suspended = true;

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

-- 3. Stats Timeseries (for users, posts, comments, likes, shares, follows, reports, active_users)
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
  elsif p_metric = 'follows' then
    return query
      select date_trunc(v_trunc, created_at) as b, count(*)::bigint
      from public.follows
      where created_at between p_from and p_to
      group by 1 order by 1;
  elsif p_metric = 'reports' then
    return query
      select date_trunc(v_trunc, created_at) as b, count(*)::bigint
      from public.reports
      where created_at between p_from and p_to
      group by 1 order by 1;
  elsif p_metric = 'active_users' or p_metric = 'dau' then
    return query
      select date_trunc(v_trunc, created_at) as b, count(distinct user_id)::bigint
      from public.activity_events
      where user_id is not null and created_at between p_from and p_to
      group by 1 order by 1;
  else
    raise exception 'Invalid metric: %', p_metric;
  end if;
end;
$$;

-- 4. Stats Reports By Status (overloaded to support range or lifetime)
create or replace function public.stats_reports_by_status(
  p_from timestamptz default null,
  p_to timestamptz default null
)
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
  where (p_from is null or r.created_at >= p_from)
    and (p_to is null or r.created_at <= p_to)
  group by r.status;
$$;

-- 5. Stats Follower Distribution (Buckets: 0, 1-9, 10-99, 100+)
create or replace function public.stats_follower_distribution()
returns table (
  bucket text,
  user_count bigint,
  pct numeric
)
language sql
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
    where not is_suspended
  ),
  total_users as (
    select count(*)::numeric as tot from public.profiles where not is_suspended
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

-- 6. Stats Posting Heatmap (post count by weekday x hour)
create or replace function public.stats_posting_heatmap(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  day_of_week int,
  hour_of_day int,
  post_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    extract(dow from p.created_at)::int as day_of_week,
    extract(hour from p.created_at)::int as hour_of_day,
    count(*)::bigint as post_count
  from public.posts p
  where p.status = 'published' and p.created_at between p_from and p_to
  group by 1, 2
  order by 1, 2;
$$;

-- 7. Stats Search Terms + Zero Result Rate
create or replace function public.stats_search_terms(
  p_from timestamptz,
  p_to timestamptz,
  p_limit int default 10
)
returns table (
  term text,
  search_count bigint,
  zero_result_count bigint,
  zero_result_rate numeric
)
language sql
security definer
set search_path = public
as $$
  with term_counts as (
    select
      lower(trim(query)) as q_term,
      count(*)::bigint as total_searches
    from public.activity_events
    where kind = 'search' and query is not null and trim(query) <> '' and created_at between p_from and p_to
    group by lower(trim(query))
  ),
  term_results as (
    select
      tc.q_term as term,
      tc.total_searches as search_count,
      case
        when exists (
          select 1 from public.posts p
          where p.status = 'published'
            and (
              p.search_vector @@ websearch_to_tsquery('simple', tc.q_term)
              or p.body % tc.q_term
              or coalesce(p.title, '') % tc.q_term
              or exists (
                select 1 from public.post_tags pt
                join public.tags t on t.id = pt.tag_id
                where pt.post_id = p.id and (t.name = lower(trim(leading '#' from tc.q_term)) or t.name % tc.q_term)
              )
            )
        ) then 0::bigint
        else tc.total_searches
      end as zero_result_count
    from term_counts tc
  )
  select
    tr.term,
    tr.search_count,
    tr.zero_result_count,
    round((tr.zero_result_count::numeric / greatest(1, tr.search_count)) * 100, 1) as zero_result_rate
  from term_results tr
  order by tr.search_count desc
  limit greatest(1, least(p_limit, 50));
$$;

-- 8. Stats System Summary (core table counts, storage usage via pg_total_relation_size)
create or replace function public.stats_system_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profiles int;
  v_posts int;
  v_comments int;
  v_likes int;
  v_shares int;
  v_follows int;
  v_tags int;
  v_reports int;
  v_audit_logs int;
  v_activity_events int;
  v_db_size bigint;
begin
  if not public.current_role_is('admin') then
    raise exception 'Administrator role required';
  end if;

  select count(*) into v_profiles from public.profiles;
  select count(*) into v_posts from public.posts;
  select count(*) into v_comments from public.comments;
  select count(*) into v_likes from public.likes;
  select count(*) into v_shares from public.shares;
  select count(*) into v_follows from public.follows;
  select count(*) into v_tags from public.tags;
  select count(*) into v_reports from public.reports;
  select count(*) into v_audit_logs from public.audit_logs;
  select count(*) into v_activity_events from public.activity_events;

  select coalesce(sum(pg_total_relation_size(quote_ident(table_name))), 0)::bigint
  into v_db_size
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE';

  return jsonb_build_object(
    'table_counts', jsonb_build_object(
      'profiles', v_profiles,
      'posts', v_posts,
      'comments', v_comments,
      'likes', v_likes,
      'shares', v_shares,
      'follows', v_follows,
      'tags', v_tags,
      'reports', v_reports,
      'audit_logs', v_audit_logs,
      'activity_events', v_activity_events
    ),
    'db_size_bytes', v_db_size,
    'db_size_pretty', pg_size_pretty(v_db_size)
  );
end;
$$;

-- 9. Stats Moderator KPIs with Previous Period Deltas
create or replace function public.stats_moderator_kpis(
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

  v_awaiting_action int;
  v_prev_awaiting_action int;

  v_awaiting_final int;
  v_prev_awaiting_final int;

  v_resolved int;
  v_prev_resolved int;
begin
  if not public.current_role_is('moderator') then
    raise exception 'Moderator or administrator role required';
  end if;

  v_duration := p_to - p_from;
  v_prev_to := p_from;
  v_prev_from := p_from - v_duration;

  -- Awaiting Action (pending + in_review)
  select count(*) into v_awaiting_action from public.reports where status in ('pending', 'in_review') and created_at <= p_to;
  select count(*) into v_prev_awaiting_action from public.reports where status in ('pending', 'in_review') and created_at <= v_prev_to;

  -- Awaiting Final (escalated)
  select count(*) into v_awaiting_final from public.reports where status = 'escalated' and created_at <= p_to;
  select count(*) into v_prev_awaiting_final from public.reports where status = 'escalated' and created_at <= v_prev_to;

  -- Resolved in range
  select count(*) into v_resolved from public.reports where status in ('resolved_dismissed', 'resolved_actioned') and resolved_at between p_from and p_to;
  select count(*) into v_prev_resolved from public.reports where status in ('resolved_dismissed', 'resolved_actioned') and resolved_at between v_prev_from and v_prev_to;

  return jsonb_build_object(
    'awaiting_action', coalesce(v_awaiting_action, 0),
    'prev_awaiting_action', coalesce(v_prev_awaiting_action, 0),
    'awaiting_final', coalesce(v_awaiting_final, 0),
    'prev_awaiting_final', coalesce(v_prev_awaiting_final, 0),
    'resolved_in_range', coalesce(v_resolved, 0),
    'prev_resolved_in_range', coalesce(v_prev_resolved, 0)
  );
end;
$$;

-- 10. Stats KPIs (Admin overview aggregator with sparklines & full deltas)
create or replace function public.stats_kpis(
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz default null,
  p_prev_to timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_overview jsonb;
  v_active jsonb;
begin
  if not public.current_role_is('moderator') then
    raise exception 'Moderator or administrator role required';
  end if;

  v_overview := public.stats_overview(p_from, p_to);
  
  begin
    v_active := public.stats_active_users(p_from, p_to);
  exception when others then
    v_active := jsonb_build_object('dau', 0, 'wau', 0, 'mau', 0);
  end;

  return jsonb_build_object(
    'total_users', coalesce((v_overview->>'total_users')::int, 0),
    'new_users', coalesce((v_overview->>'new_users')::int, 0),
    'prev_new_users', coalesce((v_overview->>'prev_new_users')::int, 0),
    'suspended_users', coalesce((v_overview->>'suspended_users')::int, 0),
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
