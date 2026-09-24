-- Migration: 00005_query_optimizations.sql
-- Description: Move client/server JS filtering, sorting, and aggregation to database functions.
-- Provides: get_popular_tags, get_posts_by_tag, get_feed_posts, search_posts (enhanced), stats_kpis, stats_engagement_composition, stats_moderator_kpis, stats_system_summary.

-- 1. Popular Tags (with optional exclude_tag filter)
create or replace function public.get_popular_tags(
  p_limit int default 20,
  p_exclude_tag text default null
)
returns table (
  id uuid,
  name text,
  posts_count int
)
language sql
stable
set search_path = public
as $$
  select
    t.id,
    t.name,
    t.posts_count
  from public.tags t
  where (p_exclude_tag is null or lower(t.name) <> lower(trim(leading '#' from p_exclude_tag)))
  order by t.posts_count desc, t.name asc
  limit greatest(1, least(p_limit, 100));
$$;

-- 2. Posts by Tag (computes tag matching, author join, tag aggregation, viewer flags, cursor pagination)
create or replace function public.get_posts_by_tag(
  p_tag_name text,
  p_cursor timestamptz default null,
  p_limit int default 10,
  p_viewer_id uuid default null
)
returns table (
  id uuid,
  title text,
  body text,
  image_url text,
  status post_status,
  likes_count int,
  comments_count int,
  shares_count int,
  created_at timestamptz,
  author jsonb,
  tags text[],
  is_liked boolean,
  is_following_author boolean,
  is_shared boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with target_tag as (
    select id from public.tags
    where lower(name) = lower(trim(leading '#' from p_tag_name))
    limit 1
  ),
  matched_posts as (
    select
      p.id,
      p.title,
      p.body,
      p.image_url,
      p.status,
      p.likes_count,
      p.comments_count,
      p.shares_count,
      p.created_at,
      p.author_id
    from public.posts p
    join public.post_tags pt on pt.post_id = p.id
    join target_tag tt on tt.id = pt.tag_id
    where p.status = 'published'
      and (p_cursor is null or p.created_at < p_cursor)
    order by p.created_at desc
    limit greatest(1, least(p_limit, 50))
  )
  select
    mp.id,
    mp.title,
    mp.body,
    mp.image_url,
    mp.status,
    mp.likes_count,
    mp.comments_count,
    mp.shares_count,
    mp.created_at,
    jsonb_build_object(
      'id', pr.id,
      'username', pr.username,
      'display_name', pr.display_name,
      'avatar_url', pr.avatar_url
    ) as author,
    coalesce(
      (
        select array_agg(t.name order by t.name)
        from public.post_tags pt2
        join public.tags t on t.id = pt2.tag_id
        where pt2.post_id = mp.id
      ),
      array[]::text[]
    ) as tags,
    case
      when p_viewer_id is not null then
        exists(select 1 from public.likes l where l.post_id = mp.id and l.user_id = p_viewer_id)
      else false
    end as is_liked,
    case
      when p_viewer_id is not null and mp.author_id <> p_viewer_id then
        exists(select 1 from public.follows f where f.following_id = mp.author_id and f.follower_id = p_viewer_id)
      else false
    end as is_following_author,
    case
      when p_viewer_id is not null then
        exists(select 1 from public.shares s where s.post_id = mp.id and s.user_id = p_viewer_id)
      else false
    end as is_shared
  from matched_posts mp
  join public.profiles pr on pr.id = mp.author_id
  order by mp.created_at desc;
$$;

-- 3. Feed Posts (computes feed filtering including follows subquery, author join, tag aggregation, viewer flags)
create or replace function public.get_feed_posts(
  p_filter text default 'latest',
  p_viewer_id uuid default null,
  p_cursor timestamptz default null,
  p_limit int default 10
)
returns table (
  id uuid,
  title text,
  body text,
  image_url text,
  status post_status,
  likes_count int,
  comments_count int,
  shares_count int,
  created_at timestamptz,
  author jsonb,
  tags text[],
  is_liked boolean,
  is_following_author boolean,
  is_shared boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with filtered_posts as (
    select
      p.id,
      p.title,
      p.body,
      p.image_url,
      p.status,
      p.likes_count,
      p.comments_count,
      p.shares_count,
      p.created_at,
      p.author_id
    from public.posts p
    where p.status = 'published'
      and (p_cursor is null or p.created_at < p_cursor)
      and (
        case
          when p_filter = 'following' then
            p_viewer_id is not null
            and p.author_id in (
              select following_id from public.follows
              where follower_id = p_viewer_id and following_id <> p_viewer_id
            )
          else true
        end
      )
    order by p.created_at desc
    limit greatest(1, least(p_limit, 50))
  )
  select
    fp.id,
    fp.title,
    fp.body,
    fp.image_url,
    fp.status,
    fp.likes_count,
    fp.comments_count,
    fp.shares_count,
    fp.created_at,
    jsonb_build_object(
      'id', pr.id,
      'username', pr.username,
      'display_name', pr.display_name,
      'avatar_url', pr.avatar_url
    ) as author,
    coalesce(
      (
        select array_agg(t.name order by t.name)
        from public.post_tags pt
        join public.tags t on t.id = pt.tag_id
        where pt.post_id = fp.id
      ),
      array[]::text[]
    ) as tags,
    case
      when p_viewer_id is not null then
        exists(select 1 from public.likes l where l.post_id = fp.id and l.user_id = p_viewer_id)
      else false
    end as is_liked,
    case
      when p_viewer_id is not null and fp.author_id <> p_viewer_id then
        exists(select 1 from public.follows f where f.following_id = fp.author_id and f.follower_id = p_viewer_id)
      else false
    end as is_following_author,
    case
      when p_viewer_id is not null then
        exists(select 1 from public.shares s where s.post_id = fp.id and s.user_id = p_viewer_id)
      else false
    end as is_shared
  from filtered_posts fp
  join public.profiles pr on pr.id = fp.author_id
  order by fp.created_at desc;
$$;

-- 4. Search Posts (Enhanced with tag matching & author jsonb)
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
security definer
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
      or exists (
        select 1 from public.post_tags pt
        join public.tags t on t.id = pt.tag_id
        where pt.post_id = p.id and (t.name = lower(trim(leading '#' from p_query)) or t.name % p_query)
      )
    )
  order by rank desc, p.created_at desc
  limit greatest(1, least(p_limit, 50));
$$;

-- 5. Stats KPIs (Admin overview aggregator with deltas)
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
    'total_engagement', coalesce((v_overview->>'total_engagement')::int, 0),
    'prev_total_engagement', coalesce((v_overview->>'prev_total_engagement')::int, 0),
    'open_reports', coalesce((v_overview->>'open_reports')::int, 0),
    'escalated_reports', coalesce((v_overview->>'escalated_reports')::int, 0),
    'active_users_dau', coalesce((v_active->>'dau')::int, 0),
    'active_users_wau', coalesce((v_active->>'wau')::int, 0),
    'active_users_mau', coalesce((v_active->>'mau')::int, 0)
  );
end;
$$;

-- 6. Stats Engagement Composition
create or replace function public.stats_engagement_composition(
  p_bucket text,
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
  select * from public.stats_engagement_by_day(p_from, p_to);
$$;

-- 7. Stats Moderator KPIs
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
  v_awaiting_action int;
  v_awaiting_final int;
  v_resolved int;
begin
  if not public.current_role_is('moderator') then
    raise exception 'Moderator or administrator role required';
  end if;

  select count(*) into v_awaiting_action from public.reports where status in ('pending', 'in_review');
  select count(*) into v_awaiting_final from public.reports where status = 'escalated';
  select count(*) into v_resolved from public.reports where status in ('resolved_dismissed', 'resolved_actioned') and resolved_at between p_from and p_to;

  return jsonb_build_object(
    'awaiting_action', coalesce(v_awaiting_action, 0),
    'awaiting_final', coalesce(v_awaiting_final, 0),
    'resolved_in_range', coalesce(v_resolved, 0)
  );
end;
$$;

-- 8. Stats System Summary
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
  v_reports int;
begin
  if not public.current_role_is('admin') then
    raise exception 'Administrator role required';
  end if;

  select count(*) into v_profiles from public.profiles;
  select count(*) into v_posts from public.posts;
  select count(*) into v_comments from public.comments;
  select count(*) into v_likes from public.likes;
  select count(*) into v_shares from public.shares;
  select count(*) into v_reports from public.reports;

  return jsonb_build_object(
    'table_counts', jsonb_build_object(
      'profiles', v_profiles,
      'posts', v_posts,
      'comments', v_comments,
      'likes', v_likes,
      'shares', v_shares,
      'reports', v_reports
    ),
    'db_size_bytes', 0,
    'db_size_pretty', 'Active'
  );
end;
$$;
