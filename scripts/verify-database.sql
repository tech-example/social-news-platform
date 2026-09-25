-- Verification SQL script for Supabase
-- Paste into Supabase SQL Editor after applying migrations

-- 1. Check Row Level Security is enabled on EVERY public table (MUST RETURN 0 ROWS)
select tablename
from pg_tables
where schemaname = 'public' and rowsecurity = false;

-- 2. Verify all core tables exist (Expected: 13 tables)
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

-- 3. Verify all custom enums exist (Expected: user_role, report_target_type, report_status, post_status, notification_type)
select typname
from pg_type
where typnamespace = 'public'::regnamespace and typtype = 'e'
order by typname;

-- 4. Verify all RPC, cleanup, and statistics functions exist
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and (routine_name like 'stats_%' or routine_name in ('toggle_like', 'toggle_follow', 'set_post_tags', 'report_transition', 'search_posts', 'current_role_is', 'delete_old_notifications'))
order by routine_name;

-- 5. Verify all active triggers
select event_object_table, trigger_name
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name;
