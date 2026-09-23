-- Migration: 00001_initial_schema.sql
-- Description: Core extensions, enums, tables, and indexes for Social News Platform

-- Extensions
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type user_role as enum ('user', 'moderator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_target_type as enum ('user', 'post', 'comment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum (
    'pending',
    'in_review',
    'escalated',
    'resolved_actioned',
    'resolved_dismissed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('published', 'hidden', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum (
    'like',
    'comment',
    'follow',
    'share',
    'report_update',
    'moderation'
  );
exception when duplicate_object then null; end $$;

-- 1. Profiles (linked 1-to-1 to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text check (char_length(bio) <= 300),
  avatar_url text,
  role user_role not null default 'user',
  is_suspended boolean not null default false,
  suspended_reason text,
  followers_count int not null default 0,
  following_count int not null default 0,
  posts_count int not null default 0,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text check (char_length(title) <= 140),
  body text not null check (char_length(body) between 1 and 5000),
  image_url text,
  status post_status not null default 'published',
  likes_count int not null default 0,
  comments_count int not null default 0,
  shares_count int not null default 0,
  views_count int not null default 0,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', body), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_feed_idx on public.posts (created_at desc) where status = 'published';
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);
create index if not exists posts_search_idx on public.posts using gin (search_vector);
create index if not exists posts_body_trgm_idx on public.posts using gin (body gin_trgm_ops);

-- 3. Tags
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name ~ '^[a-z0-9_]{2,40}$'),
  posts_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tags_name_trgm_idx on public.tags using gin (name gin_trgm_ops);

-- 4. Post Tags (many-to-many junction)
create table if not exists public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);
create index if not exists post_tags_tag_idx on public.post_tags (tag_id);

-- 5. Likes
create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists likes_post_idx on public.likes (post_id);

-- 6. Follows
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);

-- 7. Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  status post_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- 8. Shares
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  note text check (char_length(note) <= 280),
  created_at timestamptz not null default now()
);
create index if not exists shares_post_idx on public.shares (post_id);
create index if not exists shares_user_idx on public.shares (user_id, created_at desc);
create unique index if not exists shares_user_post_unique on public.shares (user_id, post_id);

-- 9. Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type notification_type not null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  report_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_inbox_idx on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (recipient_id) where read_at is null;

-- 10. Reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type report_target_type not null,
  target_user_id uuid references public.profiles(id) on delete cascade,
  target_post_id uuid references public.posts(id) on delete cascade,
  target_comment_id uuid references public.comments(id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','misinformation','hate','violence','sexual','other')),
  details text check (char_length(details) <= 1000),
  status report_status not null default 'pending',
  assigned_moderator_id uuid references public.profiles(id) on delete set null,
  moderator_note text,
  final_decision_by uuid references public.profiles(id) on delete set null,
  final_decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (
    (target_type = 'user' and target_user_id is not null and target_post_id is null and target_comment_id is null) or
    (target_type = 'post' and target_post_id is not null and target_user_id is null and target_comment_id is null) or
    (target_type = 'comment' and target_comment_id is not null and target_user_id is null and target_post_id is null)
  )
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
create unique index if not exists reports_no_duplicates on public.reports (
  reporter_id, target_type,
  coalesce(target_user_id, target_post_id, target_comment_id)
) where status in ('pending', 'in_review', 'escalated');

-- 11. Report Events (Audit timeline for reports)
create table if not exists public.report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  from_status report_status,
  to_status report_status not null,
  note text,
  created_at timestamptz not null default now()
);

-- 12. Audit Logs (System administrative events)
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_recent_idx on public.audit_logs (created_at desc);

-- 13. Activity Events (Used for DAU/WAU/MAU analytics and search logging)
create table if not exists public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('sign_in', 'post_view', 'search')),
  query text,
  created_at timestamptz not null default now()
);
create index if not exists activity_events_time_idx on public.activity_events (created_at desc, kind);
