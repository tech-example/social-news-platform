-- Migration: 00008_profanity_flagging.sql
-- Description: Add is_flagged and flagged_reason columns to posts and comments for client-side offensive content hide/show toggle

alter table public.posts
  add column if not exists is_flagged boolean not null default false,
  add column if not exists flagged_reason text;

alter table public.comments
  add column if not exists is_flagged boolean not null default false,
  add column if not exists flagged_reason text;

-- Partial indexes for fast moderator queue filtering on flagged content
create index if not exists idx_posts_is_flagged on public.posts (is_flagged) where is_flagged = true;
create index if not exists idx_comments_is_flagged on public.comments (is_flagged) where is_flagged = true;
