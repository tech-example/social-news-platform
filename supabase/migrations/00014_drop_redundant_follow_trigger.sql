-- Migration: 00014_drop_redundant_follow_trigger.sql
-- Description:
--   Drop the duplicate follow trigger (notify_on_follow_trigger) and its associated function (notify_on_follow)
--   because the live database now relies on a manually created canonical trigger (on_follow_notify -> handle_notifications).

drop trigger if exists notify_on_follow_trigger on public.follows;
drop trigger if exists notify_on_follow on public.follows; -- also drop in case it exists from 00012
drop function if exists public.notify_on_follow();
