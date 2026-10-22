-- Migration: 00019_fix_report_transition_actor_id.sql
-- Description:
--   Fix: Add declaration for v_actor_id in report_transition to resolve runtime error:
--   column "v_actor_id" does not exist when executing moderation report transitions.

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
  select role into v_actor_role from public.profiles where id = v_actor_id and not is_suspended;
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

grant execute on function public.report_transition(uuid, public.report_status, uuid, text, text) to authenticated, service_role;

notify pgrst, 'reload schema';
