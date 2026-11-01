-- ==============================================================================
-- DATABASE RELEASE: Delta Bugfix Patch (For Existing Databases)
-- Platform: Social Content & News Platform
-- Target: PostgreSQL / Supabase
-- Description:
--   Applies ALL bug fixes and enhancements to an EXISTING database without
--   dropping or recreating tables:
--     1. Pure 3-role model (migrates any legacy 'suspended' users safely to 'user').
--     2. Adds missing columns (views_count, is_flagged, flagged_reason, hide_flagged_content).
--     3. Creates post_views, rate_limits, and profanity management tables if missing.
--     4. Drops redundant/duplicate notification triggers and establishes clean triggers.
--     5. Updates all RPC functions (mod_transition_report, get_display_name, admin analytics).
--     6. Re-applies all Row Level Security (RLS) policies.
--     7. Notifies PostgREST to reload schema cache.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUM & COLUMN MIGRATIONS
-- ------------------------------------------------------------------------------

-- Ensure user_role enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('user', 'moderator', 'admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM ('like', 'comment', 'follow', 'mention', 'system', 'new_post');
  ELSE
    -- Add 'new_post' to notification_type if missing
    BEGIN
      ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'new_post';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- Migrate legacy 'suspended' column or role if present
DO $$
BEGIN
  -- If role column is text or has check constraint, or if suspended users exist:
  UPDATE public.profiles
  SET role = 'user'
  WHERE role::text = 'suspended';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Ensure missing columns exist in profiles, posts, comments
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profanity_filter_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hide_flagged_content boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS views_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_reason text,
  ADD COLUMN IF NOT EXISTS flag_reason text,
  ADD COLUMN IF NOT EXISTS flagged_at timestamptz;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS likes_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_reason text,
  ADD COLUMN IF NOT EXISTS flag_reason text,
  ADD COLUMN IF NOT EXISTS flagged_at timestamptz;

-- Add performance indices for flagging
CREATE INDEX IF NOT EXISTS idx_posts_is_flagged ON public.posts (is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_comments_is_flagged ON public.comments (is_flagged) WHERE is_flagged = true;

-- ------------------------------------------------------------------------------
-- 2. CREATE MISSING TABLES & INDEXES
-- ------------------------------------------------------------------------------

-- Post Views Tracking Table (Privacy-safe, 30-min unique bucket constraint)
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

CREATE UNIQUE INDEX IF NOT EXISTS post_views_user_bucket_idx 
  ON public.post_views (post_id, viewer_id, time_bucket) 
  WHERE viewer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS post_views_guest_bucket_idx 
  ON public.post_views (post_id, visitor_hash, time_bucket) 
  WHERE visitor_hash IS NOT NULL AND viewer_id IS NULL;

-- Rate Limits Table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  count int NOT NULL DEFAULT 1,
  reset_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx ON public.rate_limits (reset_at);

-- Profanity Terms Table
CREATE TABLE IF NOT EXISTS public.profanity_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL CHECK (char_length(term) BETWEEN 1 AND 100),
  language text NOT NULL CHECK (language IN ('th', 'en', 'th_romanized', 'other')),
  severity text NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
  kind text NOT NULL DEFAULT 'block' CHECK (kind IN ('block', 'allow')),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profanity_terms_unique_idx
  ON public.profanity_terms (lower(term), kind, language);

CREATE INDEX IF NOT EXISTS profanity_terms_active_idx
  ON public.profanity_terms (is_active, kind, language);

-- Profanity Term Suggestions Table
CREATE TABLE IF NOT EXISTS public.profanity_term_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL CHECK (char_length(term) BETWEEN 1 AND 100),
  language text NOT NULL CHECK (language IN ('th', 'en', 'th_romanized', 'other')),
  severity text NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
  source_report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  suggested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS profanity_term_suggestions_status_idx
  ON public.profanity_term_suggestions (status, created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. CLEAN UP DUPLICATE / REDUNDANT TRIGGERS
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS tr_notify_like ON public.likes;
DROP TRIGGER IF EXISTS tr_notify_comment ON public.comments;
DROP TRIGGER IF EXISTS tr_notify_follow ON public.follows;
DROP TRIGGER IF EXISTS tr_notify_post ON public.posts;
DROP TRIGGER IF EXISTS tr_follows_notify ON public.follows;
DROP TRIGGER IF EXISTS tr_likes_notify ON public.likes;
DROP TRIGGER IF EXISTS tr_comments_notify ON public.comments;
DROP TRIGGER IF EXISTS on_post_published ON public.posts;
DROP TRIGGER IF EXISTS tr_on_post_published ON public.posts;

-- ------------------------------------------------------------------------------
-- 4. ESSENTIAL RPC FUNCTIONS & SAFE TRIGGERS
-- ------------------------------------------------------------------------------

-- Helper: Current Role
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'user'::public.user_role
  );
$$;

-- Helper: Current Role Check
CREATE OR REPLACE FUNCTION public.current_role_is(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text = required_role FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Helper: Get Display Name with Fallback
CREATE OR REPLACE FUNCTION public.get_display_name(profile_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(trim(display_name), ''),
    username,
    'Anonymous'
  )
  FROM public.profiles
  WHERE id = profile_id;
$$;

-- Safe Notification Functions
CREATE OR REPLACE FUNCTION public.handle_like_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id uuid;
BEGIN
  SELECT author_id INTO v_post_author_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Prevent self-notification and avoid duplicates
  IF v_post_author_id IS NOT NULL AND v_post_author_id <> NEW.user_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, created_at)
    VALUES (v_post_author_id, NEW.user_id, 'like', NEW.post_id, now())
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id uuid;
BEGIN
  SELECT author_id INTO v_post_author_id FROM public.posts WHERE id = NEW.post_id;
  
  IF v_post_author_id IS NOT NULL AND v_post_author_id <> NEW.author_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, comment_id, created_at)
    VALUES (v_post_author_id, NEW.author_id, 'comment', NEW.post_id, NEW.id, now())
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_follow_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.follower_id <> NEW.following_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, created_at)
    VALUES (NEW.following_id, NEW.follower_id, 'follow', now())
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_post_published_broadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trigger only when status changes to 'published'
  IF (TG_OP = 'INSERT' AND NEW.status = 'published') OR
     (TG_OP = 'UPDATE' AND OLD.status <> 'published' AND NEW.status = 'published') THEN
    
    INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, created_at)
    SELECT
      f.follower_id,
      NEW.author_id,
      'new_post'::public.notification_type,
      NEW.id,
      now()
    FROM public.follows f
    WHERE f.following_id = NEW.author_id
      AND f.follower_id <> NEW.author_id
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Reattach Clean Triggers
CREATE TRIGGER tr_safe_like_notify
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_like_notification();

CREATE TRIGGER tr_safe_comment_notify
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_notification();

CREATE TRIGGER tr_safe_follow_notify
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_follow_notification();

CREATE TRIGGER tr_safe_post_published_notify
  AFTER INSERT OR UPDATE OF status ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_post_published_broadcast();

-- RPC: Record Post View (Privacy-Safe Deduplicated)
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
  v_inserted boolean := false;
  v_current_bucket timestamptz;
BEGIN
  v_current_bucket := date_trunc('hour', now()) + (extract(minute from now())::int / 30) * interval '30 minute';

  IF p_viewer_id IS NOT NULL THEN
    INSERT INTO public.post_views (post_id, viewer_id, visitor_hash, viewed_at, time_bucket)
    VALUES (p_post_id, p_viewer_id, NULL, now(), v_current_bucket)
    ON CONFLICT (post_id, viewer_id, time_bucket) WHERE viewer_id IS NOT NULL DO NOTHING;
    
    IF FOUND THEN
      v_inserted := true;
    END IF;
  ELSIF p_visitor_hash IS NOT NULL THEN
    INSERT INTO public.post_views (post_id, viewer_id, visitor_hash, viewed_at, time_bucket)
    VALUES (p_post_id, NULL, p_visitor_hash, now(), v_current_bucket)
    ON CONFLICT (post_id, visitor_hash, time_bucket) WHERE visitor_hash IS NOT NULL AND viewer_id IS NULL DO NOTHING;
    
    IF FOUND THEN
      v_inserted := true;
    END IF;
  END IF;

  IF v_inserted THEN
    UPDATE public.posts
    SET views_count = views_count + 1
    WHERE id = p_post_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- RPC: Report Transition Workflow with Audit Logging & Actor ID
CREATE OR REPLACE FUNCTION public.mod_transition_report(
  report_id uuid,
  new_status public.report_status,
  note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_report record;
BEGIN
  IF NOT public.current_role() IN ('moderator', 'admin') THEN
    RAISE EXCEPTION 'Access denied. Moderator or Admin role required.';
  END IF;

  SELECT * INTO v_report FROM public.reports WHERE id = report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found.';
  END IF;

  UPDATE public.reports
  SET
    status = new_status,
    moderator_note = COALESCE(note, moderator_note),
    resolved_by = v_actor_id,
    resolved_at = CASE 
      WHEN new_status IN ('resolved_action_taken', 'resolved_no_action', 'dismissed') THEN now()
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = report_id;

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (
    v_actor_id,
    'transition_report_status',
    'report',
    report_id::text,
    jsonb_build_object(
      'old_status', v_report.status,
      'new_status', new_status,
      'note', note,
      'target_type', v_report.target_type,
      'target_post_id', v_report.target_post_id,
      'target_comment_id', v_report.target_comment_id,
      'target_user_id', v_report.target_user_id
    )
  );

  RETURN true;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. EXECUTIVE ADMIN ANALYTICS RPCS
-- ------------------------------------------------------------------------------

-- KPI Rollup (Current vs Previous Window Comparison)
CREATE OR REPLACE FUNCTION public.stats_admin_kpis(
  cur_start timestamptz,
  cur_end   timestamptz,
  prev_start timestamptz,
  prev_end   timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  -- Current window metrics
  c_views bigint;
  c_engagements bigint;
  c_posts bigint;
  c_dau bigint;
  c_wau bigint;
  c_new_users bigint;
  c_reports_opened bigint;
  c_reports_resolved bigint;
  c_unresolved_reports bigint;
  c_flagged_posts bigint;
  c_flagged_comments bigint;
  c_flagged_total bigint;
  -- Previous window metrics
  p_views bigint;
  p_engagements bigint;
  p_posts bigint;
  p_dau bigint;
  p_new_users bigint;
  p_reports_opened bigint;
  p_reports_resolved bigint;
  p_flagged_total bigint;
BEGIN
  IF NOT public.current_role_is('admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- 1. Views
  SELECT count(*) INTO c_views FROM public.post_views WHERE viewed_at >= cur_start AND viewed_at < cur_end;
  SELECT count(*) INTO p_views FROM public.post_views WHERE viewed_at >= prev_start AND viewed_at < prev_end;

  -- 2. Engagements (likes + comments + shares)
  SELECT 
    (SELECT count(*) FROM public.likes WHERE created_at >= cur_start AND created_at < cur_end) +
    (SELECT count(*) FROM public.comments WHERE created_at >= cur_start AND created_at < cur_end) +
    (SELECT count(*) FROM public.shares WHERE created_at >= cur_start AND created_at < cur_end)
  INTO c_engagements;

  SELECT 
    (SELECT count(*) FROM public.likes WHERE created_at >= prev_start AND created_at < prev_end) +
    (SELECT count(*) FROM public.comments WHERE created_at >= prev_start AND created_at < prev_end) +
    (SELECT count(*) FROM public.shares WHERE created_at >= prev_start AND created_at < prev_end)
  INTO p_engagements;

  -- 3. Posts
  SELECT count(*) INTO c_posts FROM public.posts WHERE created_at >= cur_start AND created_at < cur_end;
  SELECT count(*) INTO p_posts FROM public.posts WHERE created_at >= prev_start AND created_at < prev_end;

  -- 4. DAU / WAU
  SELECT count(DISTINCT user_id) INTO c_dau FROM public.activity_events WHERE created_at >= cur_start AND created_at < cur_end AND user_id IS NOT NULL;
  SELECT count(DISTINCT user_id) INTO p_dau FROM public.activity_events WHERE created_at >= prev_start AND created_at < prev_end AND user_id IS NOT NULL;
  SELECT count(DISTINCT user_id) INTO c_wau FROM public.activity_events WHERE created_at >= (cur_end - interval '7 days') AND created_at < cur_end AND user_id IS NOT NULL;

  -- 5. New Users
  SELECT count(*) INTO c_new_users FROM public.profiles WHERE created_at >= cur_start AND created_at < cur_end;
  SELECT count(*) INTO p_new_users FROM public.profiles WHERE created_at >= prev_start AND created_at < prev_end;

  -- 6. Moderation / Reports
  SELECT count(*) INTO c_reports_opened FROM public.reports WHERE created_at >= cur_start AND created_at < cur_end;
  SELECT count(*) INTO p_reports_opened FROM public.reports WHERE created_at >= prev_start AND created_at < prev_end;

  SELECT count(*) INTO c_reports_resolved FROM public.reports WHERE resolved_at >= cur_start AND resolved_at < cur_end;
  SELECT count(*) INTO p_reports_resolved FROM public.reports WHERE resolved_at >= prev_start AND resolved_at < prev_end;

  SELECT count(*) INTO c_unresolved_reports FROM public.reports WHERE status IN ('pending', 'in_review', 'escalated');

  -- 7. Flagged Content
  SELECT count(*) INTO c_flagged_posts FROM public.posts WHERE is_flagged = true AND created_at >= cur_start AND created_at < cur_end;
  SELECT count(*) INTO c_flagged_comments FROM public.comments WHERE is_flagged = true AND created_at >= cur_start AND created_at < cur_end;
  c_flagged_total := c_flagged_posts + c_flagged_comments;

  SELECT 
    (SELECT count(*) FROM public.posts WHERE is_flagged = true AND created_at >= prev_start AND created_at < prev_end) +
    (SELECT count(*) FROM public.comments WHERE is_flagged = true AND created_at >= prev_start AND created_at < prev_end)
  INTO p_flagged_total;

  v_result := jsonb_build_object(
    'views', jsonb_build_object('current', c_views, 'previous', p_views),
    'engagements', jsonb_build_object('current', c_engagements, 'previous', p_engagements),
    'posts', jsonb_build_object('current', c_posts, 'previous', p_posts),
    'dau', jsonb_build_object('current', c_dau, 'previous', p_dau),
    'wau', c_wau,
    'stickiness_ratio', CASE WHEN c_wau > 0 THEN round((c_dau::numeric / c_wau::numeric) * 100, 2) ELSE 0 END,
    'new_users', jsonb_build_object('current', c_new_users, 'previous', p_new_users),
    'reports_opened', jsonb_build_object('current', c_reports_opened, 'previous', p_reports_opened),
    'reports_resolved', jsonb_build_object('current', c_reports_resolved, 'previous', p_reports_resolved),
    'unresolved_reports', c_unresolved_reports,
    'flagged_content', jsonb_build_object(
      'current', c_flagged_total,
      'previous', p_flagged_total,
      'posts', c_flagged_posts,
      'comments', c_flagged_comments
    )
  );

  RETURN v_result;
END;
$$;

-- Timeseries with Zero-Filled Buckets (generate_series)
CREATE OR REPLACE FUNCTION public.stats_admin_timeseries(
  metric text,
  bucket_interval text,
  w_start timestamptz,
  w_end   timestamptz
)
RETURNS TABLE (
  bucket_time timestamptz,
  val numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step interval;
  v_trunc text;
BEGIN
  IF NOT public.current_role_is('admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  IF bucket_interval = 'hour' THEN
    v_step := interval '1 hour';
    v_trunc := 'hour';
  ELSIF bucket_interval = 'day' THEN
    v_step := interval '1 day';
    v_trunc := 'day';
  ELSIF bucket_interval = 'month' THEN
    v_step := interval '1 month';
    v_trunc := 'month';
  ELSE
    v_step := interval '1 day';
    v_trunc := 'day';
  END IF;

  IF metric = 'views' THEN
    RETURN QUERY
    WITH series AS (
      SELECT generate_series(date_trunc(v_trunc, w_start), date_trunc(v_trunc, w_end), v_step) AS b_time
    ),
    counts AS (
      SELECT date_trunc(v_trunc, viewed_at) AS b_time, count(*)::numeric AS c_val
      FROM public.post_views
      WHERE viewed_at >= w_start AND viewed_at <= w_end
      GROUP BY 1
    )
    SELECT s.b_time AS bucket_time, COALESCE(c.c_val, 0) AS val
    FROM series s
    LEFT JOIN counts c ON s.b_time = c.b_time
    ORDER BY s.b_time ASC;

  ELSIF metric = 'engagements' THEN
    RETURN QUERY
    WITH series AS (
      SELECT generate_series(date_trunc(v_trunc, w_start), date_trunc(v_trunc, w_end), v_step) AS b_time
    ),
    eng AS (
      SELECT date_trunc(v_trunc, created_at) AS b_time FROM public.likes WHERE created_at >= w_start AND created_at <= w_end
      UNION ALL
      SELECT date_trunc(v_trunc, created_at) AS b_time FROM public.comments WHERE created_at >= w_start AND created_at <= w_end
      UNION ALL
      SELECT date_trunc(v_trunc, created_at) AS b_time FROM public.shares WHERE created_at >= w_start AND created_at <= w_end
    ),
    counts AS (
      SELECT e.b_time, count(*)::numeric AS c_val
      FROM eng e
      GROUP BY 1
    )
    SELECT s.b_time AS bucket_time, COALESCE(c.c_val, 0) AS val
    FROM series s
    LEFT JOIN counts c ON s.b_time = c.b_time
    ORDER BY s.b_time ASC;

  ELSIF metric = 'active_users' THEN
    RETURN QUERY
    WITH series AS (
      SELECT generate_series(date_trunc(v_trunc, w_start), date_trunc(v_trunc, w_end), v_step) AS b_time
    ),
    counts AS (
      SELECT date_trunc(v_trunc, created_at) AS b_time, count(DISTINCT user_id)::numeric AS c_val
      FROM public.activity_events
      WHERE created_at >= w_start AND created_at <= w_end AND user_id IS NOT NULL
      GROUP BY 1
    )
    SELECT s.b_time AS bucket_time, COALESCE(c.c_val, 0) AS val
    FROM series s
    LEFT JOIN counts c ON s.b_time = c.b_time
    ORDER BY s.b_time ASC;

  ELSIF metric = 'reports' THEN
    RETURN QUERY
    WITH series AS (
      SELECT generate_series(date_trunc(v_trunc, w_start), date_trunc(v_trunc, w_end), v_step) AS b_time
    ),
    counts AS (
      SELECT date_trunc(v_trunc, created_at) AS b_time, count(*)::numeric AS c_val
      FROM public.reports
      WHERE created_at >= w_start AND created_at <= w_end
      GROUP BY 1
    )
    SELECT s.b_time AS bucket_time, COALESCE(c.c_val, 0) AS val
    FROM series s
    LEFT JOIN counts c ON s.b_time = c.b_time
    ORDER BY s.b_time ASC;

  ELSE
    RETURN;
  END IF;
END;
$$;

-- Executive Attention Needed Feed
CREATE OR REPLACE FUNCTION public.stats_admin_attention()
RETURNS TABLE (
  category text,
  severity text,
  item_id uuid,
  title text,
  summary text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_role_is('admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- 1. Escalated or stale pending reports
  RETURN QUERY
  SELECT
    'report'::text AS category,
    CASE WHEN r.status = 'escalated' THEN 'high' ELSE 'medium' END::text AS severity,
    r.id AS item_id,
    ('Report: ' || r.reason::text)::text AS title,
    COALESCE(r.details, 'No details provided')::text AS summary,
    r.created_at
  FROM public.reports r
  WHERE r.status IN ('escalated', 'pending')
  ORDER BY (r.status = 'escalated') DESC, r.created_at ASC
  LIMIT 10;

  -- 2. Pending profanity term suggestions
  RETURN QUERY
  SELECT
    'profanity_suggestion'::text AS category,
    'low'::text AS severity,
    pts.id AS item_id,
    ('Profanity Candidate: ' || pts.term)::text AS title,
    ('Suggested severity: ' || pts.severity || ' (' || pts.language || ')')::text AS summary,
    pts.created_at
  FROM public.profanity_term_suggestions pts
  WHERE pts.status = 'pending'
  ORDER BY pts.created_at ASC
  LIMIT 5;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profanity_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profanity_term_suggestions ENABLE ROW LEVEL SECURITY;

-- Post views policies
DROP POLICY IF EXISTS "Post views are viewable by admins" ON public.post_views;
CREATE POLICY "Post views are viewable by admins" ON public.post_views
  FOR SELECT TO authenticated
  USING (public.current_role_is('admin'));

-- Profanity terms policies
DROP POLICY IF EXISTS "Admins have full access to profanity_terms" ON public.profanity_terms;
CREATE POLICY "Admins have full access to profanity_terms" ON public.profanity_terms
  FOR ALL TO authenticated
  USING (public.current_role_is('admin'))
  WITH CHECK (public.current_role_is('admin'));

-- Profanity suggestions policies
DROP POLICY IF EXISTS "Moderators and admins can read suggestions" ON public.profanity_term_suggestions;
CREATE POLICY "Moderators and admins can read suggestions" ON public.profanity_term_suggestions
  FOR SELECT TO authenticated
  USING (public.current_role() IN ('moderator', 'admin'));

DROP POLICY IF EXISTS "Moderators can insert suggestions" ON public.profanity_term_suggestions;
CREATE POLICY "Moderators can insert suggestions" ON public.profanity_term_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (public.current_role() IN ('moderator', 'admin'));

DROP POLICY IF EXISTS "Admins can update suggestions" ON public.profanity_term_suggestions;
CREATE POLICY "Admins can update suggestions" ON public.profanity_term_suggestions
  FOR UPDATE TO authenticated
  USING (public.current_role_is('admin'));

-- ------------------------------------------------------------------------------
-- 7. GRANT EXECUTE & RELOAD SCHEMA CACHE
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.current_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_role_is(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_display_name(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_post_view(uuid, uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mod_transition_report(uuid, public.report_status, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.stats_admin_kpis(timestamptz, timestamptz, timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.stats_admin_timeseries(text, text, timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.stats_admin_attention() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
