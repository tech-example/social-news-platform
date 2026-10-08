-- Migration: 00013_force_cleanup_all_notification_triggers.sql
-- Description:
--   Dynamically drops ALL triggers related to notifications on all interactive tables to guarantee
--   no duplicate "rogue" triggers remain, then reinstates the canonical deduplicated triggers.

do $$
declare
  r record;
begin
  -- Force drop ANY trigger that calls our notification functions across all tables
  for r in (
    select t.tgname, c.relname
    from pg_trigger t
    join pg_proc p on t.tgfoid = p.oid
    join pg_class c on t.tgrelid = c.oid
    where p.proname in (
      'notify_on_like',
      'notify_on_comment',
      'notify_on_share',
      'notify_on_follow',
      'notify_on_report_created'
    )
  ) loop
    execute 'drop trigger if exists ' || r.tgname || ' on public.' || r.relname;
  end loop;
end;
$$;

-- 1. Recreate Like Trigger
drop trigger if exists notify_on_like_trigger on public.likes;
create trigger notify_on_like_trigger
  after insert on public.likes
  for each row execute function public.notify_on_like();

-- 2. Recreate Comment Trigger
drop trigger if exists notify_on_comment_trigger on public.comments;
create trigger notify_on_comment_trigger
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- 3. Recreate Share Trigger
drop trigger if exists notify_on_share_trigger on public.shares;
create trigger notify_on_share_trigger
  after insert on public.shares
  for each row execute function public.notify_on_share();

-- 4. Recreate Follow Trigger
drop trigger if exists notify_on_follow_trigger on public.follows;
create trigger notify_on_follow_trigger
  after insert on public.follows
  for each row execute function public.notify_on_follow();

-- 5. Recreate Report Trigger
drop trigger if exists notify_on_report_created_trigger on public.reports;
create trigger notify_on_report_created_trigger
  after insert on public.reports
  for each row execute function public.notify_on_report_created();
