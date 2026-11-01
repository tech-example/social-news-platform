-- Migration: 00024_admin_dashboard_redesign.sql
-- Description:
--   1. Lightweight, privacy-safe post_views tracking table with 30-min viewer bucket unique constraints.
--   2. rate_limits table for server-side rate-limiting.
--   3. record_post_view RPC function enforcing author view exclusion and atomic view counts.
--   4. delete_old_post_views retention RPC (> 400 days).
--   5. Comprehensive admin analytics RPCs: stats_admin_kpis, stats_admin_timeseries, stats_admin_attention.
--   6. RLS policies ensuring post_views and admin analytics are inaccessible to normal/moderator users.

-- ==============================================================================
-- 1. POST VIEWS TRACKING TABLE & INDEXES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.post_views (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  visitor_hash text,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  time_bucket timestamptz NOT NULL DEFAULT (date_trunc('hour', now()) + (extract(minute from now())::int / 30) * interval '30 minute')
);

CREATE INDEX IF NOT EXISTS post_views_post_viewed_idx ON public.post_views (post_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS post_views_viewed_at_idx ON public.post_views (viewed_at DESC);

-- Unique constraint ensuring 1 view per viewer per post per 30 minutes
CREATE UNIQUE INDEX IF NOT EXISTS post_views_user_bucket_idx 
  ON public.post_views (post_id, viewer_id, time_bucket) 
  WHERE viewer_id IS NOT NULL;

-- Unique constraint ensuring 1 view per guest hash per post per 30 minutes
CREATE UNIQUE INDEX IF NOT EXISTS post_views_guest_bucket_idx 
  ON public.post_views (post_id, visitor_hash, time_bucket) 
  WHERE visitor_hash IS NOT NULL;

-- Enable RLS: nobody can directly select from the browser; inserts & reads go through server RPCs
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_views_no_direct_client_select ON public.post_views;
-- No permissive select policy for public / authenticated = access denied to client queries

-- ==============================================================================
-- 2. RATE LIMITS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  count int NOT NULL DEFAULT 1,
  reset_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx ON public.rate_limits (reset_at);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. RECORD POST VIEW RPC (Privacy-safe, prevents author self-views, atomic)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.record_post_view(
  p_post_id uuid,
  p_viewer_id uuid DEFAULT NULL,
  p_visitor_hash text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
  v_now timestamptz := now();
  v_bucket timestamptz := date_trunc('hour', v_now) + (extract(minute from v_now)::int / 30) * interval '30 minute';
  v_inserted boolean := false;
BEGIN
  -- Verify post exists and find author
  SELECT author_id INTO v_author_id FROM public.posts WHERE id = p_post_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Technical Rule: Never count the author's own views
  IF p_viewer_id IS NOT NULL AND p_viewer_id = v_author_id THEN
    RETURN false;
  END IF;

  IF p_viewer_id IS NOT NULL THEN
    INSERT INTO public.post_views (post_id, viewer_id, visitor_hash, viewed_at, time_bucket)
    VALUES (p_post_id, p_viewer_id, NULL, v_now, v_bucket)
    ON CONFLICT (post_id, viewer_id, time_bucket) WHERE viewer_id IS NOT NULL DO NOTHING;
    IF FOUND THEN
      v_inserted := true;
    END IF;
  ELSIF p_visitor_hash IS NOT NULL THEN
    INSERT INTO public.post_views (post_id, viewer_id, visitor_hash, viewed_at, time_bucket)
    VALUES (p_post_id, NULL, p_visitor_hash, v_now, v_bucket)
    ON CONFLICT (post_id, visitor_hash, time_bucket) WHERE visitor_hash IS NOT NULL DO NOTHING;
    IF FOUND THEN
      v_inserted := true;
    END IF;
  END IF;

  -- Increment aggregate counter on posts table when a unique view is recorded
  IF v_inserted THEN
    UPDATE public.posts SET views_count = coalesce(views_count, 0) + 1 WHERE id = p_post_id;
  END IF;

  RETURN v_inserted;
END;
$$;

-- 400-day retention cleanup RPC for post_views
CREATE OR REPLACE FUNCTION public.delete_old_post_views()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int;
BEGIN
  DELETE FROM public.post_views
  WHERE viewed_at < now() - interval '400 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ==============================================================================
-- 4. STATS ADMIN KPIS RPC (All 3 Tiers: Positive, Negative, Advertising Readiness)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.stats_admin_kpis(
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_prev_to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Role check: Admin only
  v_is_admin boolean;
  
  -- Positive Signals
  v_new_users int := 0;
  v_prev_new_users int := 0;
  v_active_users int := 0;
  v_prev_active_users int := 0;
  v_returning_users int := 0;
  v_prev_returning_users int := 0;
  v_new_posts int := 0;
  v_prev_new_posts int := 0;
  v_likes int := 0;
  v_prev_likes int := 0;
  v_comments int := 0;
  v_prev_comments int := 0;
  v_shares int := 0;
  v_prev_shares int := 0;
  v_total_engagement int := 0;
  v_prev_total_engagement int := 0;
  v_engagement_per_post numeric := 0;
  v_prev_engagement_per_post numeric := 0;
  v_new_follows int := 0;
  v_prev_new_follows int := 0;

  -- Negative Signals
  v_pending_escalated_reports int := 0;
  v_prev_pending_escalated_reports int := 0;
  v_reports_received int := 0;
  v_prev_reports_received int := 0;
  v_reports_resolved int := 0;
  v_prev_reports_resolved int := 0;
  v_report_rate numeric := 0;
  v_prev_report_rate numeric := 0;
  v_flagged_content int := 0;
  v_prev_flagged_content int := 0;
  v_total_content int := 0;
  v_prev_total_content int := 0;
  v_flagged_content_rate numeric := 0;
  v_prev_flagged_content_rate numeric := 0;
  v_oldest_unresolved_seconds bigint := 0;
  v_oldest_created_at timestamptz;
  v_moderator_deletions int := 0;
  v_prev_moderator_deletions int := 0;
  v_resolution_rate numeric := 0;
  v_prev_resolution_rate numeric := 0;

  -- Advertising Readiness
  v_dau int := 0;
  v_wau int := 0;
  v_mau int := 0;
  v_stickiness numeric := 0;
  v_total_views int := 0;
  v_prev_total_views int := 0;
  v_distinct_viewers int := 0;
  v_prev_distinct_viewers int := 0;
  v_guest_views int := 0;
  v_registered_views int := 0;
  v_engagement_rate numeric := 0;
  v_engagement_per_active_user numeric := 0;
  v_share_rate numeric := 0;
  v_comment_to_like_ratio numeric := 0;
  v_retention_d1 numeric := 0;
  v_retention_d7 numeric := 0;
  v_retention_d30 numeric := 0;
  v_brand_safety_score numeric := 100.0;

  -- Retention cohort helpers
  v_cohort_users int := 0;
  v_retained_d1 int := 0;
  v_retained_d7 int := 0;
  v_retained_d30 int := 0;
BEGIN
  -- Strict Admin Access Enforced
  IF NOT public.current_role_is('admin') THEN
    RAISE EXCEPTION 'Administrator role required';
  END IF;

  -- -------------------------------------------------------------
  -- 1. POSITIVE SIGNALS
  -- -------------------------------------------------------------
  -- New Users
  SELECT count(*) INTO v_new_users FROM public.profiles WHERE created_at BETWEEN p_from AND p_to;
  SELECT count(*) INTO v_prev_new_users FROM public.profiles WHERE created_at BETWEEN p_prev_from AND p_prev_to;

  -- Active Users (ALL roles: user, moderator, admin with at least 1 action)
  v_active_users := public.stats_active_users_count(p_from, p_to);
  IF p_prev_from IS NOT NULL AND p_prev_to IS NOT NULL THEN
    v_prev_active_users := public.stats_active_users_count(p_prev_from, p_prev_to);
  END IF;

  -- Returning Users (active users who were created prior to the current window)
  WITH active_uids AS (
    SELECT user_id FROM public.activity_events WHERE created_at BETWEEN p_from AND p_to AND user_id IS NOT NULL
    UNION SELECT id AS user_id FROM public.profiles WHERE last_seen_at BETWEEN p_from AND p_to
    UNION SELECT author_id AS user_id FROM public.posts WHERE created_at BETWEEN p_from AND p_to
    UNION SELECT author_id AS user_id FROM public.comments WHERE created_at BETWEEN p_from AND p_to
    UNION SELECT user_id FROM public.likes WHERE created_at BETWEEN p_from AND p_to
    UNION SELECT follower_id AS user_id FROM public.follows WHERE created_at BETWEEN p_from AND p_to
    UNION SELECT user_id FROM public.shares WHERE created_at BETWEEN p_from AND p_to
  )
  SELECT count(DISTINCT a.user_id) INTO v_returning_users
  FROM active_uids a
  JOIN public.profiles pr ON pr.id = a.user_id
  WHERE pr.created_at < p_from;

  IF p_prev_from IS NOT NULL AND p_prev_to IS NOT NULL THEN
    WITH prev_active_uids AS (
      SELECT user_id FROM public.activity_events WHERE created_at BETWEEN p_prev_from AND p_prev_to AND user_id IS NOT NULL
      UNION SELECT id AS user_id FROM public.profiles WHERE last_seen_at BETWEEN p_prev_from AND p_prev_to
      UNION SELECT author_id AS user_id FROM public.posts WHERE created_at BETWEEN p_prev_from AND p_prev_to
      UNION SELECT author_id AS user_id FROM public.comments WHERE created_at BETWEEN p_prev_from AND p_prev_to
      UNION SELECT user_id FROM public.likes WHERE created_at BETWEEN p_prev_from AND p_prev_to
      UNION SELECT follower_id AS user_id FROM public.follows WHERE created_at BETWEEN p_prev_from AND p_prev_to
      UNION SELECT user_id FROM public.shares WHERE created_at BETWEEN p_prev_from AND p_prev_to
    )
    SELECT count(DISTINCT a.user_id) INTO v_prev_returning_users
    FROM prev_active_uids a
    JOIN public.profiles pr ON pr.id = a.user_id
    WHERE pr.created_at < p_prev_from;
  END IF;

  -- New Posts
  SELECT count(*) INTO v_new_posts FROM public.posts WHERE created_at BETWEEN p_from AND p_to AND status <> 'removed';
  SELECT count(*) INTO v_prev_new_posts FROM public.posts WHERE created_at BETWEEN p_prev_from AND p_prev_to AND status <> 'removed';

  -- Likes, Comments, Shares
  SELECT count(*) INTO v_likes FROM public.likes WHERE created_at BETWEEN p_from AND p_to;
  SELECT count(*) INTO v_prev_likes FROM public.likes WHERE created_at BETWEEN p_prev_from AND p_prev_to;

  SELECT count(*) INTO v_comments FROM public.comments WHERE created_at BETWEEN p_from AND p_to AND status <> 'removed';
  SELECT count(*) INTO v_prev_comments FROM public.comments WHERE created_at BETWEEN p_prev_from AND p_prev_to AND status <> 'removed';

  SELECT count(*) INTO v_shares FROM public.shares WHERE created_at BETWEEN p_from AND p_to;
  SELECT count(*) INTO v_prev_shares FROM public.shares WHERE created_at BETWEEN p_prev_from AND p_prev_to;

  v_total_engagement := v_likes + v_comments + v_shares;
  v_prev_total_engagement := v_prev_likes + v_prev_comments + v_prev_shares;

  -- Engagement per post
  v_engagement_per_post := round(v_total_engagement::numeric / GREATEST(v_new_posts, 1), 2);
  v_prev_engagement_per_post := round(v_prev_total_engagement::numeric / GREATEST(v_prev_new_posts, 1), 2);

  -- New Follows
  SELECT count(*) INTO v_new_follows FROM public.follows WHERE created_at BETWEEN p_from AND p_to;
  SELECT count(*) INTO v_prev_new_follows FROM public.follows WHERE created_at BETWEEN p_prev_from AND p_prev_to;

  -- -------------------------------------------------------------
  -- 2. NEGATIVE SIGNALS
  -- -------------------------------------------------------------
  -- Pending + Escalated Reports (unresolved backlog)
  SELECT count(*) INTO v_pending_escalated_reports 
  FROM public.reports 
  WHERE status IN ('pending', 'in_review', 'escalated');

  SELECT count(*) INTO v_prev_pending_escalated_reports 
  FROM public.reports 
  WHERE created_at <= p_prev_to 
    AND (resolved_at IS NULL OR resolved_at > p_prev_to);

  -- Reports received in window
  SELECT count(*) INTO v_reports_received FROM public.reports WHERE created_at BETWEEN p_from AND p_to;
  SELECT count(*) INTO v_prev_reports_received FROM public.reports WHERE created_at BETWEEN p_prev_from AND p_prev_to;

  -- Reports resolved in window
  SELECT count(*) INTO v_reports_resolved 
  FROM public.reports 
  WHERE resolved_at BETWEEN p_from AND p_to;

  SELECT count(*) INTO v_prev_reports_resolved 
  FROM public.reports 
  WHERE resolved_at BETWEEN p_prev_from AND p_prev_to;

  -- Report rate (per 1,000 posts)
  v_report_rate := round((v_reports_received::numeric / GREATEST(v_new_posts, 1)) * 1000, 1);
  v_prev_report_rate := round((v_prev_reports_received::numeric / GREATEST(v_prev_new_posts, 1)) * 1000, 1);

  -- Flagged Content & Content Rate
  v_total_content := v_new_posts + v_comments;
  v_prev_total_content := v_prev_new_posts + v_prev_comments;

  SELECT count(*) INTO v_flagged_content 
  FROM (
    SELECT id FROM public.posts WHERE created_at BETWEEN p_from AND p_to AND status = 'hidden'
    UNION ALL
    SELECT id FROM public.comments WHERE created_at BETWEEN p_from AND p_to AND status = 'hidden'
  ) fc;

  SELECT count(*) INTO v_prev_flagged_content 
  FROM (
    SELECT id FROM public.posts WHERE created_at BETWEEN p_prev_from AND p_prev_to AND status = 'hidden'
    UNION ALL
    SELECT id FROM public.comments WHERE created_at BETWEEN p_prev_from AND p_prev_to AND status = 'hidden'
  ) pfc;

  v_flagged_content_rate := round((v_flagged_content::numeric / GREATEST(v_total_content, 1)) * 100, 2);
  v_prev_flagged_content_rate := round((v_prev_flagged_content::numeric / GREATEST(v_prev_total_content, 1)) * 100, 2);

  -- Age of oldest unresolved report
  SELECT min(created_at) INTO v_oldest_created_at
  FROM public.reports
  WHERE status IN ('pending', 'in_review', 'escalated');

  IF v_oldest_created_at IS NOT NULL THEN
    v_oldest_unresolved_seconds := GREATEST(0, extract(epoch from (now() - v_oldest_created_at))::bigint);
  ELSE
    v_oldest_unresolved_seconds := 0;
  END IF;

  -- Posts & comments deleted/removed by staff
  SELECT count(*) INTO v_moderator_deletions
  FROM public.audit_logs
  WHERE created_at BETWEEN p_from AND p_to
    AND action IN ('post.remove', 'comment.remove', 'post.delete', 'comment.delete', 'content.remove');

  SELECT count(*) INTO v_prev_moderator_deletions
  FROM public.audit_logs
  WHERE created_at BETWEEN p_prev_from AND p_prev_to
    AND action IN ('post.remove', 'comment.remove', 'post.delete', 'comment.delete', 'content.remove');

  -- Resolution rate (resolved / received %)
  v_resolution_rate := round((v_reports_resolved::numeric / GREATEST(v_reports_received, 1)) * 100, 1);
  v_prev_resolution_rate := round((v_prev_reports_resolved::numeric / GREATEST(v_prev_reports_received, 1)) * 100, 1);

  -- -------------------------------------------------------------
  -- 3. ADVERTISING READINESS (Aggregate Data Only)
  -- -------------------------------------------------------------
  v_dau := public.stats_active_users_count(p_to - interval '1 day', p_to);
  v_wau := public.stats_active_users_count(p_to - interval '7 days', p_to);
  v_mau := public.stats_active_users_count(p_to - interval '30 days', p_to);
  v_stickiness := round((v_dau::numeric / GREATEST(v_mau, 1)) * 100, 1);

  -- Views & Reach
  SELECT count(*) INTO v_total_views FROM public.post_views WHERE viewed_at BETWEEN p_from AND p_to;
  SELECT count(*) INTO v_prev_total_views FROM public.post_views WHERE viewed_at BETWEEN p_prev_from AND p_prev_to;

  SELECT count(DISTINCT coalesce(viewer_id::text, visitor_hash)) INTO v_distinct_viewers 
  FROM public.post_views 
  WHERE viewed_at BETWEEN p_from AND p_to;

  SELECT count(DISTINCT coalesce(viewer_id::text, visitor_hash)) INTO v_prev_distinct_viewers 
  FROM public.post_views 
  WHERE viewed_at BETWEEN p_prev_from AND p_prev_to;

  SELECT count(*) INTO v_guest_views FROM public.post_views WHERE viewed_at BETWEEN p_from AND p_to AND viewer_id IS NULL;
  SELECT count(*) INTO v_registered_views FROM public.post_views WHERE viewed_at BETWEEN p_from AND p_to AND viewer_id IS NOT NULL;

  -- Engagement Rate per View & per Active User
  v_engagement_rate := round((v_total_engagement::numeric / GREATEST(v_total_views, 1)) * 100, 2);
  v_engagement_per_active_user := round(v_total_engagement::numeric / GREATEST(v_active_users, 1), 2);

  -- Share Rate & Comment to Like Ratio
  v_share_rate := round((v_shares::numeric / GREATEST(v_total_views, 1)) * 100, 2);
  v_comment_to_like_ratio := round(v_comments::numeric / GREATEST(v_likes, 1), 2);

  -- Cohort Retention: Percent of new users who return after 1, 7, and 30 days
  SELECT count(*) INTO v_cohort_users 
  FROM public.profiles 
  WHERE created_at BETWEEN (p_to - interval '60 days') AND (p_to - interval '31 days');

  IF v_cohort_users > 0 THEN
    SELECT count(DISTINCT pr.id) INTO v_retained_d1
    FROM public.profiles pr
    WHERE pr.created_at BETWEEN (p_to - interval '60 days') AND (p_to - interval '31 days')
      AND EXISTS (
        SELECT 1 FROM public.activity_events ae
        WHERE ae.user_id = pr.id
          AND ae.created_at BETWEEN (pr.created_at + interval '1 day') AND (pr.created_at + interval '2 days')
      );

    SELECT count(DISTINCT pr.id) INTO v_retained_d7
    FROM public.profiles pr
    WHERE pr.created_at BETWEEN (p_to - interval '60 days') AND (p_to - interval '31 days')
      AND EXISTS (
        SELECT 1 FROM public.activity_events ae
        WHERE ae.user_id = pr.id
          AND ae.created_at BETWEEN (pr.created_at + interval '7 days') AND (pr.created_at + interval '8 days')
      );

    SELECT count(DISTINCT pr.id) INTO v_retained_d30
    FROM public.profiles pr
    WHERE pr.created_at BETWEEN (p_to - interval '60 days') AND (p_to - interval '31 days')
      AND EXISTS (
        SELECT 1 FROM public.activity_events ae
        WHERE ae.user_id = pr.id
          AND ae.created_at BETWEEN (pr.created_at + interval '30 days') AND (pr.created_at + interval '31 days')
      );

    v_retention_d1 := round((v_retained_d1::numeric / v_cohort_users) * 100, 1);
    v_retention_d7 := round((v_retained_d7::numeric / v_cohort_users) * 100, 1);
    v_retention_d30 := round((v_retained_d30::numeric / v_cohort_users) * 100, 1);
  ELSE
    v_retention_d1 := 0;
    v_retention_d7 := 0;
    v_retention_d30 := 0;
  END IF;

  -- Brand Safety Score = 1 - (flagged or reported content / all content)
  IF v_total_content > 0 THEN
    v_brand_safety_score := round((1.0 - ((v_flagged_content + v_reports_received)::numeric / v_total_content)) * 100, 1);
    v_brand_safety_score := GREATEST(0.0, LEAST(100.0, v_brand_safety_score));
  ELSE
    v_brand_safety_score := 100.0;
  END IF;

  RETURN jsonb_build_object(
    -- Positive Signals
    'new_users', v_new_users,
    'prev_new_users', v_prev_new_users,
    'active_users', v_active_users,
    'prev_active_users', v_prev_active_users,
    'returning_users', v_returning_users,
    'prev_returning_users', v_prev_returning_users,
    'new_posts', v_new_posts,
    'prev_new_posts', v_prev_new_posts,
    'total_engagement', v_total_engagement,
    'prev_total_engagement', v_prev_total_engagement,
    'engagement_per_post', v_engagement_per_post,
    'prev_engagement_per_post', v_prev_engagement_per_post,
    'new_follows', v_new_follows,
    'prev_new_follows', v_prev_new_follows,

    -- Negative Signals
    'pending_escalated_reports', v_pending_escalated_reports,
    'prev_pending_escalated_reports', v_prev_pending_escalated_reports,
    'reports_received', v_reports_received,
    'prev_reports_received', v_prev_reports_received,
    'reports_resolved', v_reports_resolved,
    'prev_reports_resolved', v_prev_reports_resolved,
    'report_rate', v_report_rate,
    'prev_report_rate', v_prev_report_rate,
    'flagged_content_rate', v_flagged_content_rate,
    'prev_flagged_content_rate', v_prev_flagged_content_rate,
    'oldest_unresolved_seconds', v_oldest_unresolved_seconds,
    'moderator_deletions', v_moderator_deletions,
    'prev_moderator_deletions', v_prev_moderator_deletions,
    'resolution_rate', v_resolution_rate,
    'prev_resolution_rate', v_prev_resolution_rate,

    -- Advertising Readiness
    'dau', v_dau,
    'wau', v_wau,
    'mau', v_mau,
    'stickiness', v_stickiness,
    'total_views', v_total_views,
    'prev_total_views', v_prev_total_views,
    'distinct_viewers', v_distinct_viewers,
    'prev_distinct_viewers', v_prev_distinct_viewers,
    'guest_views', v_guest_views,
    'registered_views', v_registered_views,
    'engagement_rate', v_engagement_rate,
    'engagement_per_active_user', v_engagement_per_active_user,
    'share_rate', v_share_rate,
    'comment_to_like_ratio', v_comment_to_like_ratio,
    'retention_d1', v_retention_d1,
    'retention_d7', v_retention_d7,
    'retention_d30', v_retention_d30,
    'brand_safety_score', v_brand_safety_score
  );
END;
$$;

-- ==============================================================================
-- 5. STATS ADMIN TIMESERIES & CHARTS RPC (Uses generate_series for 0-fill)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.stats_admin_timeseries(
  p_range text,
  p_bucket text,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interval interval;
  v_step text;
  v_growth_eng jsonb;
  v_risk_trend jsonb;
  v_flagged_clean jsonb;
  v_audience_reach jsonb;
  v_reports_by_reason jsonb;
  v_report_funnel jsonb;
  v_top_tags jsonb;
  v_top_creators jsonb;
  v_users_by_role jsonb;
  v_peak_activity jsonb;
BEGIN
  IF NOT public.current_role_is('admin') THEN
    RAISE EXCEPTION 'Administrator role required';
  END IF;

  v_interval := CASE 
    WHEN p_bucket = 'hour' THEN interval '1 hour'
    WHEN p_bucket = 'month' THEN interval '1 month'
    ELSE interval '1 day'
  END;

  v_step := CASE 
    WHEN p_bucket = 'hour' THEN 'hour'
    WHEN p_bucket = 'month' THEN 'month'
    ELSE 'day'
  END;

  -- 1. Growth vs Engagement Trend
  WITH calendar AS (
    SELECT generate_series(date_trunc(v_step, p_from), date_trunc(v_step, p_to), v_interval) AS bucket
  ),
  new_users AS (
    SELECT date_trunc(v_step, created_at) AS bucket, count(*) AS count
    FROM public.profiles
    WHERE created_at BETWEEN p_from AND p_to
    GROUP BY 1
  ),
  new_posts AS (
    SELECT date_trunc(v_step, created_at) AS bucket, count(*) AS count
    FROM public.posts
    WHERE created_at BETWEEN p_from AND p_to AND status <> 'removed'
    GROUP BY 1
  ),
  eng AS (
    SELECT date_trunc(v_step, created_at) AS bucket, count(*) AS count
    FROM (
      SELECT created_at FROM public.likes WHERE created_at BETWEEN p_from AND p_to
      UNION ALL
      SELECT created_at FROM public.comments WHERE created_at BETWEEN p_from AND p_to AND status <> 'removed'
      UNION ALL
      SELECT created_at FROM public.shares WHERE created_at BETWEEN p_from AND p_to
    ) e
    GROUP BY 1
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'bucket', c.bucket,
      'new_users', coalesce(u.count, 0),
      'new_posts', coalesce(p.count, 0),
      'engagement', coalesce(e.count, 0),
      'engagement_per_post', round(coalesce(e.count, 0)::numeric / GREATEST(coalesce(p.count, 0), 1), 2)
    ) ORDER BY c.bucket ASC
  ) INTO v_growth_eng
  FROM calendar c
  LEFT JOIN new_users u ON u.bucket = c.bucket
  LEFT JOIN new_posts p ON p.bucket = c.bucket
  LEFT JOIN eng e ON e.bucket = c.bucket;

  -- 2. Risk Trend: Reports Received vs Resolved vs Backlog
  WITH calendar AS (
    SELECT generate_series(date_trunc(v_step, p_from), date_trunc(v_step, p_to), v_interval) AS bucket
  ),
  rec AS (
    SELECT date_trunc(v_step, created_at) AS bucket, count(*) AS count
    FROM public.reports
    WHERE created_at BETWEEN p_from AND p_to
    GROUP BY 1
  ),
  res AS (
    SELECT date_trunc(v_step, resolved_at) AS bucket, count(*) AS count
    FROM public.reports
    WHERE resolved_at BETWEEN p_from AND p_to
    GROUP BY 1
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'bucket', c.bucket,
      'received', coalesce(r.count, 0),
      'resolved', coalesce(s.count, 0),
      'backlog', (
        SELECT count(*) FROM public.reports 
        WHERE created_at <= c.bucket + v_interval 
          AND (resolved_at IS NULL OR resolved_at > c.bucket + v_interval)
      )
    ) ORDER BY c.bucket ASC
  ) INTO v_risk_trend
  FROM calendar c
  LEFT JOIN rec r ON r.bucket = c.bucket
  LEFT JOIN res s ON s.bucket = c.bucket;

  -- 3. Flagged vs Clean Content over time (Stacked Bar)
  WITH calendar AS (
    SELECT generate_series(date_trunc(v_step, p_from), date_trunc(v_step, p_to), v_interval) AS bucket
  ),
  clean_c AS (
    SELECT date_trunc(v_step, created_at) AS bucket, count(*) AS count
    FROM (
      SELECT created_at FROM public.posts WHERE created_at BETWEEN p_from AND p_to AND status = 'published'
      UNION ALL
      SELECT created_at FROM public.comments WHERE created_at BETWEEN p_from AND p_to AND status = 'published'
    ) cc
    GROUP BY 1
  ),
  flagged_c AS (
    SELECT date_trunc(v_step, created_at) AS bucket, count(*) AS count
    FROM (
      SELECT created_at FROM public.posts WHERE created_at BETWEEN p_from AND p_to AND status = 'hidden'
      UNION ALL
      SELECT created_at FROM public.comments WHERE created_at BETWEEN p_from AND p_to AND status = 'hidden'
    ) fc
    GROUP BY 1
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'bucket', c.bucket,
      'clean', coalesce(cl.count, 0),
      'flagged', coalesce(fl.count, 0)
    ) ORDER BY c.bucket ASC
  ) INTO v_flagged_clean
  FROM calendar c
  LEFT JOIN clean_c cl ON cl.bucket = c.bucket
  LEFT JOIN flagged_c fl ON fl.bucket = c.bucket;

  -- 4. Audience Reach: Views, Distinct Viewers, Guest vs Registered
  WITH calendar AS (
    SELECT generate_series(date_trunc(v_step, p_from), date_trunc(v_step, p_to), v_interval) AS bucket
  ),
  view_counts AS (
    SELECT 
      date_trunc(v_step, viewed_at) AS bucket,
      count(*) AS total_views,
      count(DISTINCT coalesce(viewer_id::text, visitor_hash)) AS distinct_viewers,
      count(*) FILTER (WHERE viewer_id IS NULL) AS guest_views,
      count(*) FILTER (WHERE viewer_id IS NOT NULL) AS registered_views
    FROM public.post_views
    WHERE viewed_at BETWEEN p_from AND p_to
    GROUP BY 1
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'bucket', c.bucket,
      'views', coalesce(vc.total_views, 0),
      'distinct_viewers', coalesce(vc.distinct_viewers, 0),
      'guest_views', coalesce(vc.guest_views, 0),
      'registered_views', coalesce(vc.registered_views, 0)
    ) ORDER BY c.bucket ASC
  ) INTO v_audience_reach
  FROM calendar c
  LEFT JOIN view_counts vc ON vc.bucket = c.bucket;

  -- 5. Reports by Reason (Horizontal Bar)
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object('name', reason, 'count', count)
      ORDER BY count DESC
    ),
    '[]'::jsonb
  ) INTO v_reports_by_reason
  FROM (
    SELECT reason, count(*) AS count
    FROM public.reports
    WHERE created_at BETWEEN p_from AND p_to
    GROUP BY reason
  ) r;

  -- 6. Report Funnel
  SELECT jsonb_build_object(
    'pending', count(*) FILTER (WHERE status = 'pending'),
    'in_review', count(*) FILTER (WHERE status = 'in_review'),
    'escalated', count(*) FILTER (WHERE status = 'escalated'),
    'resolved', count(*) FILTER (WHERE status LIKE 'resolved_%')
  ) INTO v_report_funnel
  FROM public.reports
  WHERE created_at BETWEEN p_from AND p_to;

  -- 7. Top Tags by Engagement
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', t.name,
        'posts_count', count(DISTINCT pt.post_id),
        'engagement', coalesce(sum(p.likes_count + 2 * p.comments_count + 3 * p.shares_count), 0)
      ) ORDER BY coalesce(sum(p.likes_count + 2 * p.comments_count + 3 * p.shares_count), 0) DESC
    ),
    '[]'::jsonb
  ) INTO v_top_tags
  FROM public.tags t
  JOIN public.post_tags pt ON pt.tag_id = t.id
  JOIN public.posts p ON p.id = pt.post_id AND p.status <> 'removed'
  WHERE p.created_at BETWEEN p_from AND p_to
  GROUP BY t.id, t.name
  LIMIT 6;

  -- 8. Top Creators by Engagement
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pr.id,
        'username', pr.username,
        'display_name', pr.display_name,
        'avatar_url', pr.avatar_url,
        'role', pr.role,
        'followers_count', pr.followers_count,
        'posts_count', count(p.id),
        'engagement', coalesce(sum(p.likes_count + 2 * p.comments_count + 3 * p.shares_count), 0)
      ) ORDER BY coalesce(sum(p.likes_count + 2 * p.comments_count + 3 * p.shares_count), 0) DESC
    ),
    '[]'::jsonb
  ) INTO v_top_creators
  FROM public.profiles pr
  JOIN public.posts p ON p.author_id = pr.id AND p.status <> 'removed'
  WHERE p.created_at BETWEEN p_from AND p_to
  GROUP BY pr.id, pr.username, pr.display_name, pr.avatar_url, pr.role, pr.followers_count
  LIMIT 5;

  -- 9. Users by Role
  SELECT jsonb_build_object(
    'user', count(*) FILTER (WHERE role = 'user'),
    'moderator', count(*) FILTER (WHERE role = 'moderator'),
    'admin', count(*) FILTER (WHERE role = 'admin')
  ) INTO v_users_by_role
  FROM public.profiles;

  -- 10. Peak Activity by Hour & Weekday
  WITH actions AS (
    SELECT created_at FROM public.posts WHERE created_at BETWEEN p_from AND p_to
    UNION ALL
    SELECT created_at FROM public.comments WHERE created_at BETWEEN p_from AND p_to
    UNION ALL
    SELECT created_at FROM public.likes WHERE created_at BETWEEN p_from AND p_to
  ),
  hours AS (
    SELECT extract(hour from created_at)::int AS hour, count(*) AS count
    FROM actions
    GROUP BY 1
    ORDER BY 1
  ),
  weekdays AS (
    SELECT extract(dow from created_at)::int AS dow, count(*) AS count
    FROM actions
    GROUP BY 1
    ORDER BY 1
  )
  SELECT jsonb_build_object(
    'hours', coalesce((SELECT jsonb_agg(jsonb_build_object('hour', hour, 'count', count)) FROM hours), '[]'::jsonb),
    'weekdays', coalesce((SELECT jsonb_agg(jsonb_build_object('dow', dow, 'count', count)) FROM weekdays), '[]'::jsonb)
  ) INTO v_peak_activity;

  RETURN jsonb_build_object(
    'growth_vs_engagement', coalesce(v_growth_eng, '[]'::jsonb),
    'risk_trend', coalesce(v_risk_trend, '[]'::jsonb),
    'flagged_vs_clean', coalesce(v_flagged_clean, '[]'::jsonb),
    'audience_reach', coalesce(v_audience_reach, '[]'::jsonb),
    'reports_by_reason', coalesce(v_reports_by_reason, '[]'::jsonb),
    'report_funnel', coalesce(v_report_funnel, '{}'::jsonb),
    'top_tags', coalesce(v_top_tags, '[]'::jsonb),
    'top_creators', coalesce(v_top_creators, '[]'::jsonb),
    'users_by_role', coalesce(v_users_by_role, '{}'::jsonb),
    'peak_activity', coalesce(v_peak_activity, '{}'::jsonb)
  );
END;
$$;

-- ==============================================================================
-- 6. STATS ADMIN ATTENTION RPC (Top 5 Actionable Items)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.stats_admin_attention()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oldest_pending jsonb;
  v_escalated jsonb;
  v_reported_posts jsonb;
  v_flagged_accounts jsonb;
BEGIN
  IF NOT public.current_role_is('admin') THEN
    RAISE EXCEPTION 'Administrator role required';
  END IF;

  -- 1. Oldest pending reports
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'target_type', r.target_type,
        'reason', r.reason,
        'created_at', r.created_at,
        'age_hours', round(extract(epoch from (now() - r.created_at)) / 3600, 1),
        'reporter', pr.display_name
      ) ORDER BY r.created_at ASC
    ),
    '[]'::jsonb
  ) INTO v_oldest_pending
  FROM (
    SELECT id, target_type, reason, created_at, reporter_id
    FROM public.reports
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT 5
  ) r
  LEFT JOIN public.profiles pr ON pr.id = r.reporter_id;

  -- 2. Escalated reports requiring administrator decision
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'target_type', r.target_type,
        'reason', r.reason,
        'created_at', r.created_at,
        'moderator_note', r.moderator_note
      ) ORDER BY r.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_escalated
  FROM (
    SELECT id, target_type, reason, created_at, moderator_note
    FROM public.reports
    WHERE status = 'escalated'
    ORDER BY created_at DESC
    LIMIT 5
  ) r;

  -- 3. Most reported posts
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'post_id', p.id,
        'title', coalesce(p.title, 'Untitled Post'),
        'author', pr.display_name,
        'report_count', rep.count
      ) ORDER BY rep.count DESC
    ),
    '[]'::jsonb
  ) INTO v_reported_posts
  FROM (
    SELECT target_post_id, count(*) AS count
    FROM public.reports
    WHERE target_type = 'post' AND target_post_id IS NOT NULL
    GROUP BY target_post_id
    ORDER BY count DESC
    LIMIT 5
  ) rep
  JOIN public.posts p ON p.id = rep.target_post_id
  JOIN public.profiles pr ON pr.id = p.author_id;

  -- 4. Accounts with most flagged content
  WITH flagged_counts AS (
    SELECT author_id AS user_id, count(*) AS count
    FROM (
      SELECT author_id FROM public.posts WHERE status = 'hidden'
      UNION ALL
      SELECT author_id FROM public.comments WHERE status = 'hidden'
    ) h
    GROUP BY author_id
    ORDER BY count DESC
    LIMIT 5
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', pr.id,
        'username', pr.username,
        'display_name', pr.display_name,
        'flagged_count', fc.count
      ) ORDER BY fc.count DESC
    ),
    '[]'::jsonb
  ) INTO v_flagged_accounts
  FROM flagged_counts fc
  JOIN public.profiles pr ON pr.id = fc.user_id;

  RETURN jsonb_build_object(
    'oldest_pending_reports', v_oldest_pending,
    'escalated_reports', v_escalated,
    'most_reported_posts', v_reported_posts,
    'flagged_accounts', v_flagged_accounts
  );
END;
$$;

-- ==============================================================================
-- 7. PERMISSIONS & GRANTS
-- ==============================================================================
GRANT EXECUTE ON FUNCTION public.record_post_view(uuid, uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_old_post_views() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.stats_admin_kpis(timestamptz, timestamptz, timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.stats_admin_timeseries(text, text, timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.stats_admin_attention() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
