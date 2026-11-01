-- Migration: 00022_fix_notifications_and_display_name.sql
-- Description:
--   1. Backfill display_name from username where empty.
--   2. Deduplicate existing notifications (retaining earliest row per duplicate group).
--   3. Add partial unique indexes to public.notifications to prevent duplicate entries.
--   4. Drop dual/redundant notification triggers and reinstate canonical triggers with ON CONFLICT DO NOTHING.
--   5. Update report_transition to use ON CONFLICT DO NOTHING for notification inserts.
--   6. Reload schema cache.

-- ============================================================================
-- 1. BACKFILL DISPLAY_NAME
-- ============================================================================
UPDATE public.profiles
SET display_name = username
WHERE display_name IS NULL OR btrim(display_name) = '';

-- ============================================================================
-- 2. DEDUPLICATE EXISTING NOTIFICATIONS (Run before creating unique indexes)
-- ============================================================================
DELETE FROM public.notifications a
WHERE a.id NOT IN (
  SELECT DISTINCT ON (
    recipient_id,
    actor_id,
    type,
    coalesce(post_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(comment_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(report_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) id
  FROM public.notifications
  ORDER BY
    recipient_id,
    actor_id,
    type,
    coalesce(post_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(comment_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(report_id, '00000000-0000-0000-0000-000000000000'::uuid),
    created_at ASC,
    id ASC
);

-- ============================================================================
-- 3. PARTIAL UNIQUE INDEXES ON NOTIFICATIONS
-- ============================================================================
-- Like: one notification per recipient, actor, post
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique_like
  ON public.notifications (recipient_id, actor_id, post_id)
  WHERE type = 'like';

-- Follow: one notification per recipient, actor
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique_follow
  ON public.notifications (recipient_id, actor_id)
  WHERE type = 'follow';

-- Comment: one notification per recipient, actor, comment
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique_comment
  ON public.notifications (recipient_id, actor_id, comment_id)
  WHERE type = 'comment';

-- Share: one notification per recipient, actor, post
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique_share
  ON public.notifications (recipient_id, actor_id, post_id)
  WHERE type = 'share';

-- New post: one notification per recipient, actor, post
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique_new_post
  ON public.notifications (recipient_id, actor_id, post_id)
  WHERE type = 'new_post';

-- Report / Moderation: one notification per recipient, report, type
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique_report
  ON public.notifications (recipient_id, report_id, type)
  WHERE report_id IS NOT NULL;

-- ============================================================================
-- 4. DROP DUAL/LEGACY TRIGGERS ACROSS ALL INTERACTIVE TABLES
-- ============================================================================
DROP TRIGGER IF EXISTS on_like_notify ON public.likes;
DROP TRIGGER IF EXISTS notify_on_like_trigger ON public.likes;
DROP TRIGGER IF EXISTS on_comment_notify ON public.comments;
DROP TRIGGER IF EXISTS notify_on_comment_trigger ON public.comments;
DROP TRIGGER IF EXISTS on_share_notify ON public.shares;
DROP TRIGGER IF EXISTS notify_on_share_trigger ON public.shares;
DROP TRIGGER IF EXISTS on_follow_notify ON public.follows;
DROP TRIGGER IF EXISTS notify_on_follow_trigger ON public.follows;
DROP TRIGGER IF EXISTS notify_on_follow ON public.follows;
DROP TRIGGER IF EXISTS on_report_notify ON public.reports;
DROP TRIGGER IF EXISTS notify_on_report_created_trigger ON public.reports;
DROP TRIGGER IF EXISTS on_post_published_notify ON public.posts;

-- ============================================================================
-- 5. REINSTATE CANONICAL DEDUPLICATING TRIGGERS
-- ============================================================================

-- 5a. Like Trigger Function
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
BEGIN
  SELECT author_id INTO v_recipient_id FROM public.posts WHERE id = new.post_id;
  IF v_recipient_id IS NOT NULL AND v_recipient_id <> new.user_id THEN
    IF EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = v_recipient_id AND following_id = new.user_id
    ) THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, post_id)
      VALUES (v_recipient_id, new.user_id, 'like', new.post_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER notify_on_like_trigger
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- 5b. Comment Trigger Function
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
  v_parent_author_id uuid;
BEGIN
  IF new.parent_id IS NOT NULL THEN
    SELECT author_id INTO v_parent_author_id FROM public.comments WHERE id = new.parent_id;
    IF v_parent_author_id IS NOT NULL AND v_parent_author_id <> new.author_id THEN
      IF EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = v_parent_author_id AND following_id = new.author_id
      ) THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, comment_id)
        VALUES (v_parent_author_id, new.author_id, 'comment', new.post_id, new.id)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  SELECT author_id INTO v_recipient_id FROM public.posts WHERE id = new.post_id;
  IF v_recipient_id IS NOT NULL AND v_recipient_id <> new.author_id AND (v_parent_author_id IS NULL OR v_recipient_id <> v_parent_author_id) THEN
    IF EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = v_recipient_id AND following_id = new.author_id
    ) THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, comment_id)
      VALUES (v_recipient_id, new.author_id, 'comment', new.post_id, new.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN new;
END;
$$;

CREATE TRIGGER notify_on_comment_trigger
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- 5c. Share Trigger Function
CREATE OR REPLACE FUNCTION public.notify_on_share()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
BEGIN
  SELECT author_id INTO v_recipient_id FROM public.posts WHERE id = new.post_id;
  IF v_recipient_id IS NOT NULL AND v_recipient_id <> new.user_id THEN
    IF EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = v_recipient_id AND following_id = new.user_id
    ) THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, post_id)
      VALUES (v_recipient_id, new.user_id, 'share', new.post_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER notify_on_share_trigger
  AFTER INSERT ON public.shares
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_share();

-- 5d. Follow Trigger Function
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.follower_id <> new.following_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type)
    VALUES (new.following_id, new.follower_id, 'follow')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER notify_on_follow_trigger
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- 5e. Post Published Trigger Function
CREATE OR REPLACE FUNCTION public.notify_on_post_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.status = 'published' THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, post_id)
    SELECT follower_id, new.author_id, 'new_post', new.id
    FROM public.follows
    WHERE following_id = new.author_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER on_post_published_notify
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_published();

-- 5f. Report Creation Trigger Function
CREATE OR REPLACE FUNCTION public.notify_on_report_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.status = 'pending' THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, report_id)
    SELECT p.id, new.reporter_id, 'moderation', new.id
    FROM public.profiles p
    WHERE p.role IN ('moderator', 'admin')
      AND NOT p.is_suspended
      AND p.id <> COALESCE(new.reporter_id, '00000000-0000-0000-0000-000000000000'::uuid)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER notify_on_report_created_trigger
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_report_created();

-- ============================================================================
-- 6. REPORT TRANSITION FUNCTION (With ON CONFLICT DO NOTHING)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.report_transition(
  p_report_id uuid,
  p_to_status public.report_status,
  p_actor_id uuid,
  p_content_action text default null,
  p_note text default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := coalesce(p_actor_id, auth.uid());
  v_current_status public.report_status;
  v_target_type public.report_target_type;
  v_target_user_id uuid;
  v_target_post_id uuid;
  v_target_comment_id uuid;
  v_reporter_id uuid;
  v_actor_role public.user_role;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id required';
  END IF;

  SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id AND NOT is_suspended;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('moderator', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: moderator or admin role required';
  END IF;

  SELECT status, target_type, target_user_id, target_post_id, target_comment_id, reporter_id
  INTO v_current_status, v_target_type, v_target_user_id, v_target_post_id, v_target_comment_id, v_reporter_id
  FROM public.reports
  WHERE id = p_report_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  IF v_current_status IN ('resolved_actioned', 'resolved_dismissed') THEN
    RAISE EXCEPTION 'Report is already resolved and cannot be modified';
  END IF;

  IF p_to_status = 'in_review' THEN
    IF v_current_status <> 'pending' THEN
      RAISE EXCEPTION 'Report can only transition to in_review from pending';
    END IF;
  ELSIF p_to_status = 'escalated' THEN
    IF v_current_status NOT IN ('pending', 'in_review') THEN
      RAISE EXCEPTION 'Report can only be escalated from pending or in_review';
    END IF;
  ELSIF p_to_status = 'resolved_dismissed' THEN
    IF v_current_status NOT IN ('in_review', 'escalated') THEN
      RAISE EXCEPTION 'Report must be in_review or escalated to be dismissed';
    END IF;
    IF v_current_status = 'escalated' AND v_actor_role <> 'admin' THEN
      RAISE EXCEPTION 'Only administrators can resolve an escalated report';
    END IF;
  ELSIF p_to_status = 'resolved_actioned' THEN
    IF v_actor_role <> 'admin' THEN
      RAISE EXCEPTION 'Only administrators can finalize a report as resolved_actioned';
    END IF;
  END IF;

  IF p_content_action = 'hide' THEN
    IF v_target_type = 'post' AND v_target_post_id IS NOT NULL THEN
      UPDATE public.posts SET status = 'hidden' WHERE id = v_target_post_id;
    ELSIF v_target_type = 'comment' AND v_target_comment_id IS NOT NULL THEN
      UPDATE public.comments SET status = 'hidden' WHERE id = v_target_comment_id;
    END IF;
  ELSIF p_content_action = 'restore' THEN
    IF v_target_type = 'post' AND v_target_post_id IS NOT NULL THEN
      UPDATE public.posts SET status = 'published' WHERE id = v_target_post_id;
    ELSIF v_target_type = 'comment' AND v_target_comment_id IS NOT NULL THEN
      UPDATE public.comments SET status = 'published' WHERE id = v_target_comment_id;
    END IF;
  ELSIF p_content_action = 'remove' THEN
    IF v_actor_role <> 'admin' THEN
      RAISE EXCEPTION 'Only administrators can permanently remove content';
    END IF;
    IF v_target_type = 'post' AND v_target_post_id IS NOT NULL THEN
      UPDATE public.posts SET status = 'removed' WHERE id = v_target_post_id;
    ELSIF v_target_type = 'comment' AND v_target_comment_id IS NOT NULL THEN
      UPDATE public.comments SET status = 'removed' WHERE id = v_target_comment_id;
    END IF;
  ELSIF p_content_action = 'suspend_user' THEN
    IF v_actor_role <> 'admin' THEN
      RAISE EXCEPTION 'Only administrators can suspend user accounts';
    END IF;
    IF v_target_user_id IS NOT NULL THEN
      UPDATE public.profiles SET is_suspended = true, suspended_reason = COALESCE(p_note, 'Violation of terms') WHERE id = v_target_user_id;
    END IF;
  END IF;

  UPDATE public.reports
  SET
    status = p_to_status,
    assigned_moderator_id = COALESCE(assigned_moderator_id, v_actor_id),
    moderator_note = CASE WHEN v_actor_role = 'moderator' THEN COALESCE(p_note, moderator_note) ELSE moderator_note END,
    final_decision_by = CASE WHEN p_to_status IN ('resolved_actioned', 'resolved_dismissed') AND v_actor_role = 'admin' THEN v_actor_id ELSE final_decision_by END,
    final_decision_note = CASE WHEN p_to_status IN ('resolved_actioned', 'resolved_dismissed') AND v_actor_role = 'admin' THEN COALESCE(p_note, final_decision_note) ELSE final_decision_note END,
    resolved_at = CASE WHEN p_to_status IN ('resolved_actioned', 'resolved_dismissed') THEN now() ELSE null END
  WHERE id = p_report_id;

  INSERT INTO public.report_events (report_id, actor_id, from_status, to_status, note)
  VALUES (p_report_id, v_actor_id, v_current_status, p_to_status, p_note);

  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, metadata)
  VALUES (
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

  IF p_to_status = 'escalated' THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, report_id)
    SELECT p.id, v_actor_id, 'moderation', p_report_id
    FROM public.profiles p
    WHERE p.role = 'admin'
      AND NOT p.is_suspended
      AND p.id <> v_actor_id
    ON CONFLICT DO NOTHING;
  END IF;

  IF p_to_status IN ('resolved_actioned', 'resolved_dismissed') AND v_reporter_id IS NOT NULL AND v_reporter_id <> v_actor_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, report_id)
    VALUES (v_reporter_id, v_actor_id, 'report_update', p_report_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'report_id', p_report_id, 'status', p_to_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_transition(uuid, public.report_status, uuid, text, text) TO authenticated, service_role;

-- ============================================================================
-- 7. NOTIFY POSTGREST TO RELOAD SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload schema';
