-- Migration: 00007_follow_scoped_notifications.sql
-- Description:
--   1. Follow-scoped notifications for regular users (like, comment, share only notify if recipient follows actor).
--   2. Report notifications for moderators and admins (pending notifies active mods/admins, escalated notifies active admins, resolution notifies reporter).
--   3. Enforce strict role boundary in report_transition (only admins resolve escalated reports).
--   4. Cleanup function delete_old_notifications() for auto-deleting notifications older than 14 days.

-- 1. Follow-scoped Like Notification
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
  -- Follow-scoped: recipient only notified if recipient already follows the actor
  if v_recipient_id is not null and v_recipient_id <> new.user_id then
    if exists (
      select 1 from public.follows
      where follower_id = v_recipient_id and following_id = new.user_id
    ) then
      insert into public.notifications (recipient_id, actor_id, type, post_id)
      values (v_recipient_id, new.user_id, 'like', new.post_id);
    end if;
  end if;
  return new;
end;
$$;

-- 2. Follow-scoped Comment Notification
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
  -- If reply to another comment, notify parent author if parent author follows commenter
  if new.parent_id is not null then
    select author_id into v_parent_author_id from public.comments where id = new.parent_id;
    if v_parent_author_id is not null and v_parent_author_id <> new.author_id then
      if exists (
        select 1 from public.follows
        where follower_id = v_parent_author_id and following_id = new.author_id
      ) then
        insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
        values (v_parent_author_id, new.author_id, 'comment', new.post_id, new.id);
      end if;
    end if;
  end if;

  -- Notify post author if post author follows commenter (and is not parent author already notified)
  select author_id into v_recipient_id from public.posts where id = new.post_id;
  if v_recipient_id is not null and v_recipient_id <> new.author_id and (v_parent_author_id is null or v_recipient_id <> v_parent_author_id) then
    if exists (
      select 1 from public.follows
      where follower_id = v_recipient_id and following_id = new.author_id
    ) then
      insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
      values (v_recipient_id, new.author_id, 'comment', new.post_id, new.id);
    end if;
  end if;

  return new;
end;
$$;

-- 3. Follow-scoped Share Notification
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
  -- Follow-scoped: recipient only notified if recipient already follows the actor
  if v_recipient_id is not null and v_recipient_id <> new.user_id then
    if exists (
      select 1 from public.follows
      where follower_id = v_recipient_id and following_id = new.user_id
    ) then
      insert into public.notifications (recipient_id, actor_id, type, post_id)
      values (v_recipient_id, new.user_id, 'share', new.post_id);
    end if;
  end if;
  return new;
end;
$$;

-- 4. Notify active moderators and admins when a new report is created (status = 'pending')
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
      and not p.is_suspended
      and p.id <> new.reporter_id;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_on_report_created_trigger on public.reports;
create trigger notify_on_report_created_trigger
  after insert on public.reports
  for each row execute function public.notify_on_report_created();

-- 5. Extend report_transition() to handle escalated notifications and enforce admin-only resolution on escalated reports
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
  v_current_status public.report_status;
  v_target_type public.report_target_type;
  v_target_user_id uuid;
  v_target_post_id uuid;
  v_target_comment_id uuid;
  v_reporter_id uuid;
  v_actor_role public.user_role;
begin
  -- Fetch actor role
  select role into v_actor_role from public.profiles where id = p_actor_id and not is_suspended;
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
    -- ONLY ADMINS can resolve an escalated report
    if v_current_status = 'escalated' and v_actor_role <> 'admin' then
      raise exception 'Only administrators can resolve an escalated report';
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

  -- When a report is escalated: notify all active admins specifically, type = 'moderation'
  if p_to_status = 'escalated' then
    insert into public.notifications (recipient_id, actor_id, type, report_id)
    select p.id, v_actor_id, 'moderation', p_report_id
    from public.profiles p
    where p.role = 'admin'
      and not p.is_suspended
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

-- 6. Auto-delete notifications older than 14 days
create or replace function public.delete_old_notifications()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from public.notifications
  where created_at < now() - interval '14 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function public.delete_old_notifications() to authenticated, service_role;
