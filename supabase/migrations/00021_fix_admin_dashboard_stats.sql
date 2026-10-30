-- Migration: 00021_fix_admin_dashboard_stats.sql
-- Description:
--   1. Deduplicate double-inserted audit_logs entries from report status transitions.
--   2. Drop obsolete stats_report_resolution_time function (Median Resolution Time removed).
--   3. Drop ambiguous overloaded stats_kpis functions.
--   4. Implement stats_active_users_count and update stats_active_users to count distinct user IDs
--      across ALL roles (user, moderator, admin) who had at least one activity
--      (login/session, post, comment, like, follow, share) in the specified range.
--   5. Create clean stats_kpis RPC returning active_users for the selected range plus DAU/WAU/MAU.
--   6. Reload PostgREST schema cache.

-- 1. Deduplicate double-inserted audit_logs rows:
-- A. Remove duplicate rows matching identical actor_id, action, entity_id, and second (keep earliest)
DELETE FROM public.audit_logs
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY actor_id, action, entity_id, date_trunc('second', created_at)
             ORDER BY created_at ASC, id ASC
           ) as rnum
    FROM public.audit_logs
  ) t
  WHERE t.rnum > 1
);

-- B. Remove secondary 'report_transition_to_%' log if already logged by 'report.<status>' within 5 seconds
DELETE FROM public.audit_logs a
WHERE a.action LIKE 'report_transition_to_%'
  AND EXISTS (
    SELECT 1 FROM public.audit_logs b
    WHERE b.actor_id = a.actor_id
      AND b.entity_id = a.entity_id
      AND b.action = 'report.' || substring(a.action from 22)
      AND abs(extract(epoch from (b.created_at - a.created_at))) < 5
  );

-- 2. Drop obsolete stats_report_resolution_time function
DROP FUNCTION IF EXISTS public.stats_report_resolution_time(timestamptz, timestamptz);

-- 3. Drop overloaded stats_kpis functions to resolve ambiguity
DROP FUNCTION IF EXISTS public.stats_kpis(text, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.stats_kpis(timestamptz, timestamptz, timestamptz, timestamptz);

-- 4. Create active users count function across ALL roles and all activity types
CREATE OR REPLACE FUNCTION public.stats_active_users_count(
  p_from timestamptz,
  p_to timestamptz
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  -- Active user definition:
  -- Any user across all roles (user, moderator, admin) who had at least one activity
  -- (login/session, post, comment, like, follow, share) within the date range [p_from, p_to].
  WITH active_uids AS (
    SELECT user_id FROM public.activity_events WHERE created_at BETWEEN p_from AND p_to AND user_id IS NOT NULL
    UNION
    SELECT id AS user_id FROM public.profiles WHERE last_seen_at BETWEEN p_from AND p_to
    UNION
    SELECT author_id AS user_id FROM public.posts WHERE created_at BETWEEN p_from AND p_to
    UNION
    SELECT author_id AS user_id FROM public.comments WHERE created_at BETWEEN p_from AND p_to
    UNION
    SELECT user_id FROM public.likes WHERE created_at BETWEEN p_from AND p_to
    UNION
    SELECT follower_id AS user_id FROM public.follows WHERE created_at BETWEEN p_from AND p_to
    UNION
    SELECT user_id FROM public.shares WHERE created_at BETWEEN p_from AND p_to
  )
  SELECT count(DISTINCT user_id) INTO v_count FROM active_uids;

  RETURN coalesce(v_count, 0);
END;
$$;

-- 5. Update stats_active_users to return active_users in range plus DAU / WAU / MAU
CREATE OR REPLACE FUNCTION public.stats_active_users(
  p_from timestamptz,
  p_to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dau int;
  v_wau int;
  v_mau int;
  v_active_range int;
BEGIN
  if not public.current_role_is('admin') then
    raise exception 'Administrator role required';
  end if;

  v_dau := public.stats_active_users_count(p_to - interval '1 day', p_to);
  v_wau := public.stats_active_users_count(p_to - interval '7 days', p_to);
  v_mau := public.stats_active_users_count(p_to - interval '30 days', p_to);
  v_active_range := public.stats_active_users_count(p_from, p_to);

  RETURN jsonb_build_object(
    'active_users', v_active_range,
    'dau', v_dau,
    'wau', v_wau,
    'mau', v_mau
  );
END;
$$;

-- 6. Unambiguous stats_kpis RPC
CREATE OR REPLACE FUNCTION public.stats_kpis(
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz default null,
  p_prev_to timestamptz default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_overview jsonb;
  v_active jsonb;
  v_prev_active_users int := 0;
BEGIN
  if not public.current_role_is('admin') then
    raise exception 'Administrator role required';
  end if;

  v_overview := public.stats_overview(p_from, p_to);
  v_active := public.stats_active_users(p_from, p_to);

  if p_prev_from is not null and p_prev_to is not null then
    v_prev_active_users := public.stats_active_users_count(p_prev_from, p_prev_to);
  end if;

  RETURN jsonb_build_object(
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
    'active_users', coalesce((v_active->>'active_users')::int, 0),
    'prev_active_users', v_prev_active_users,
    'active_users_dau', coalesce((v_active->>'dau')::int, 0),
    'active_users_wau', coalesce((v_active->>'wau')::int, 0),
    'active_users_mau', coalesce((v_active->>'mau')::int, 0),
    'open_reports', coalesce((v_overview->>'open_reports')::int, 0),
    'prev_open_reports', coalesce((v_overview->>'prev_open_reports')::int, 0),
    'escalated_reports', coalesce((v_overview->>'escalated_reports')::int, 0),
    'prev_escalated_reports', coalesce((v_overview->>'prev_escalated_reports')::int, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.stats_active_users_count(timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.stats_active_users(timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.stats_kpis(timestamptz, timestamptz, timestamptz, timestamptz) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
