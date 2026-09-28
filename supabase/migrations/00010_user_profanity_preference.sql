-- Migration: 00010_user_profanity_preference.sql
-- Description: Add hide_flagged_content preference setting to profiles

alter table public.profiles
  add column if not exists hide_flagged_content boolean not null default true;

notify pgrst, 'reload schema';
