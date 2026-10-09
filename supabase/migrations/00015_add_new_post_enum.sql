-- Migration: 00015_add_new_post_enum.sql
-- Description:
--   Add 'new_post' to notification_type enum.
--   Note: Postgres does not allow using a new enum value in the same transaction that adds it,
--   so this must be in its own migration file.

alter type notification_type add value if not exists 'new_post';
