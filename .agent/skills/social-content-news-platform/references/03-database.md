## 6. Database Design (Supabase / PostgreSQL)

All SQL lives in `supabase/migrations/*.sql`, applied with the Supabase CLI (`supabase db push`). Never edit the production schema by hand without a migration file.

### 6.1 Entity Overview

```text
auth.users 1---1 profiles
profiles 1---* posts
posts *---* tags           (via post_tags)
profiles *---* posts       (likes)
profiles *---* profiles    (follows: follower -> following)
posts 1---* comments       (comments.parent_id for replies)
profiles *---* posts       (shares)
profiles 1---* notifications
profiles 1---* reports     (reporter) ; reports -> target (user | post | comment)
reports 1---* report_events (timeline of actions)
profiles 1---* audit_logs
```

### 6.2 Enums

```sql
create type user_role as enum ('user', 'moderator', 'admin');
create type report_target_type as enum ('user', 'post', 'comment');
create type report_status as enum (
  'pending',            -- submitted, waiting for moderator
  'in_review',          -- moderator opened it
  'escalated',          -- moderator forwarded to admin for final decision
  'resolved_actioned',  -- final: content/user was acted on
  'resolved_dismissed'  -- final: no violation
);
create type post_status as enum ('published', 'hidden', 'removed');
create type notification_type as enum ('like', 'comment', 'follow', 'share', 'report_update', 'moderation');
```

### 6.3 Tables

```sql
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name  text not null check (char_length(display_name) between 1 and 60),
  bio           text check (char_length(bio) <= 300),
  avatar_url    text,
  role          user_role not null default 'user',
  is_suspended  boolean not null default false,
  suspended_reason text,
  followers_count int not null default 0,
  following_count int not null default 0,
  posts_count   int not null default 0,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references profiles(id) on delete cascade,
  title         text check (char_length(title) <= 140),
  body          text not null check (char_length(body) between 1 and 5000),
  image_url     text,
  status        post_status not null default 'published',
  likes_count   int not null default 0,
  comments_count int not null default 0,
  shares_count  int not null default 0,
  views_count   int not null default 0,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', body), 'B')
  ) stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index posts_feed_idx on posts (created_at desc) where status = 'published';
create index posts_author_idx on posts (author_id, created_at desc);
create index posts_search_idx on posts using gin (search_vector);
create index posts_body_trgm_idx on posts using gin (body gin_trgm_ops);

create table tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (name ~ '^[a-z0-9_]{2,40}$'), -- stored lowercase, no '#'
  posts_count int not null default 0,
  created_at timestamptz not null default now()
);
create index tags_name_trgm_idx on tags using gin (name gin_trgm_ops);

create table post_tags (
  post_id uuid not null references posts(id) on delete cascade,
  tag_id  uuid not null references tags(id) on delete cascade,
  primary key (post_id, tag_id)
);
create index post_tags_tag_idx on post_tags (tag_id);

create table likes (
  user_id    uuid not null references profiles(id) on delete cascade,
  post_id    uuid not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index likes_post_idx on likes (post_id);

create table follows (
  follower_id  uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on follows (following_id);

create table comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  parent_id  uuid references comments(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  status     post_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_post_idx on comments (post_id, created_at);

create table shares (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  post_id    uuid not null references posts(id) on delete cascade,
  note       text check (char_length(note) <= 280),
  created_at timestamptz not null default now()
);
create index shares_post_idx on shares (post_id);
create index shares_user_idx on shares (user_id, created_at desc);

create table notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  actor_id     uuid references profiles(id) on delete set null,
  type         notification_type not null,
  post_id      uuid references posts(id) on delete cascade,
  comment_id   uuid references comments(id) on delete cascade,
  report_id    uuid,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index notifications_inbox_idx on notifications (recipient_id, created_at desc);
create index notifications_unread_idx on notifications (recipient_id) where read_at is null;

create table reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references profiles(id) on delete cascade,
  target_type   report_target_type not null,
  target_user_id    uuid references profiles(id) on delete cascade,
  target_post_id    uuid references posts(id) on delete cascade,
  target_comment_id uuid references comments(id) on delete cascade,
  reason        text not null check (reason in ('spam','harassment','misinformation','hate','violence','sexual','other')),
  details       text check (char_length(details) <= 1000),
  status        report_status not null default 'pending',
  assigned_moderator_id uuid references profiles(id) on delete set null,
  moderator_note text,
  final_decision_by uuid references profiles(id) on delete set null,
  final_decision_note text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  -- exactly one target matching target_type
  check (
    (target_type = 'user'    and target_user_id    is not null and target_post_id is null and target_comment_id is null) or
    (target_type = 'post'    and target_post_id    is not null and target_user_id is null and target_comment_id is null) or
    (target_type = 'comment' and target_comment_id is not null and target_user_id is null and target_post_id    is null)
  )
);
create index reports_status_idx on reports (status, created_at desc);
create unique index reports_no_duplicates on reports (
  reporter_id, target_type,
  coalesce(target_user_id, target_post_id, target_comment_id)
) where status in ('pending','in_review','escalated');

create table report_events (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references reports(id) on delete cascade,
  actor_id   uuid references profiles(id) on delete set null,
  from_status report_status,
  to_status  report_status not null,
  note       text,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid references profiles(id) on delete set null,
  action     text not null,          -- e.g. 'user.suspend', 'post.remove', 'report.final_decision'
  entity     text not null,          -- e.g. 'user', 'post', 'comment', 'report'
  entity_id  uuid,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_recent_idx on audit_logs (created_at desc);

-- Activity log used for active-user statistics (DAU/WAU/MAU) and search analytics
create table activity_events (
  id         bigint generated always as identity primary key,
  user_id    uuid references profiles(id) on delete set null,
  kind       text not null check (kind in ('sign_in','post_view','search')),
  query      text,                    -- only for kind = 'search'
  created_at timestamptz not null default now()
);
create index activity_events_time_idx on activity_events (created_at desc, kind);
```

### 6.4 RLS Policies (Pattern)

Helper functions (SECURITY DEFINER, `set search_path = public`):

```sql
create function current_role_is(min_role user_role) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case role when 'admin' then 3 when 'moderator' then 2 else 1 end
           >= case min_role when 'admin' then 3 when 'moderator' then 2 else 1 end
    from profiles where id = auth.uid() and not is_suspended
  ), false);
$$;
```

Policies (write them all; examples):

```sql
alter table profiles enable row level security;
create policy "profiles are public"        on profiles for select using (true);
create policy "update own profile"         on profiles for update using (id = auth.uid()) with check (id = auth.uid());

alter table posts enable row level security;
create policy "read published posts"      on posts for select using (status = 'published' or author_id = auth.uid() or current_role_is('moderator'));
create policy "insert own post"           on posts for insert with check (author_id = auth.uid() and current_role_is('user'));
create policy "update own post"           on posts for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "delete own post"           on posts for delete using (author_id = auth.uid());
create policy "moderators manage posts"   on posts for update using (current_role_is('moderator'));

alter table likes enable row level security;
create policy "likes are public"          on likes for select using (true);
create policy "like as self"              on likes for insert with check (user_id = auth.uid());
create policy "unlike as self"            on likes for delete using (user_id = auth.uid());

-- follows, shares, comments: same pattern (public read, self write).
-- notifications: select/update only where recipient_id = auth.uid().
-- reports: insert as reporter; reporter reads own; moderators read/update non-final; admins read/update all.
-- report_events, audit_logs: moderators+ read; inserts only via SECURITY DEFINER functions.
-- activity_events: no direct client access; written by server via admin client.
```

### 6.5 Triggers and Functions

Required (write as migrations):
1. `handle_new_user()` - on `auth.users` insert, create `profiles` row (username derived and de-duplicated, display name from metadata).
2. `protect_profile_columns()` - BEFORE UPDATE on `profiles`: if `role` or `is_suspended` change and the caller is not an admin (checked with `current_role_is('admin')` or service role), raise an exception.
3. Counter maintenance triggers (`likes_count`, `comments_count`, `shares_count`, `posts_count`, `followers_count`, `following_count`, `tags.posts_count`) on insert/delete of the related rows.
4. `touch_updated_at()` for `updated_at` columns.
5. Notification triggers: like, comment, follow, share, and report status change create `notifications` rows for the right recipient (skip self-actions).
6. `toggle_like(p_post_id uuid)` and `toggle_follow(p_user_id uuid)` RPC functions (atomic, idempotent).
7. `set_post_tags(p_post_id uuid, p_tags text[])` RPC: normalizes (lowercase, strip `#`), upserts tags, replaces `post_tags` atomically, enforces max 10 tags.
8. `report_transition()` - validates the allowed report state machine (below) and inserts `report_events`.

**Report state machine (two-tier moderation):**

```text
pending --(moderator opens)--> in_review
in_review --(moderator dismisses, low severity)--> resolved_dismissed
in_review --(moderator takes preliminary action e.g. hide post)--> escalated   [needs admin final decision]
in_review --(moderator forwards without action)--> escalated
escalated --(admin)--> resolved_actioned | resolved_dismissed
```
Only admins can move a report to `resolved_actioned`, or resolve an `escalated` report. Moderators can hide (status = `hidden`) content as a first-level action; only admins can `remove` content permanently or suspend/delete users.

### 6.6 Statistics Views and Functions

Create SQL functions (called by the server via `rpc`) so aggregation runs in Postgres, not in JS. All accept a date range (`p_from timestamptz, p_to timestamptz`) and a bucket (`'day' | 'week' | 'month'`).

| Function | Returns |
|---|---|
| `stats_overview(p_from, p_to)` | totals: users, posts, comments, likes, shares, follows, open reports, plus the same metrics for the previous equal period (for trend deltas) |
| `stats_timeseries(p_metric, p_from, p_to, p_bucket)` | `(bucket, value)` rows for `users`, `posts`, `comments`, `likes`, `shares`, `follows`, `reports` |
| `stats_engagement_by_day(p_from, p_to)` | likes + comments + shares per day |
| `stats_active_users(p_from, p_to)` | DAU/WAU/MAU from `activity_events` |
| `stats_top_posts(p_from, p_to, p_limit)` | post id, title, author, likes, comments, shares, engagement score |
| `stats_top_users(p_from, p_to, p_limit)` | users ranked by engagement received and follower growth |
| `stats_top_tags(p_from, p_to, p_limit)` | tag name, post count in range, engagement on those posts |
| `stats_reports_by_status()` | count per `report_status` |
| `stats_reports_by_reason(p_from, p_to)` | count per reason |
| `stats_report_resolution_time(p_from, p_to)` | median and p90 time from creation to resolution |
| `stats_moderator_workload(p_from, p_to)` | reports handled per moderator |
| `stats_roles_distribution()` | user count per role, suspended count |
| `stats_search_terms(p_from, p_to, p_limit)` | top search queries, zero-result rate |
| `stats_content_mix(p_from, p_to)` | share of posts with images, with tags, average tags per post |

Engagement score = `likes + 2 * comments + 3 * shares` (define the weights once in SQL and document them in the UI tooltip).

Access rules: `stats_*` functions used by the admin dashboard are `SECURITY DEFINER` and check `current_role_is('admin')` at the top; moderator functions check `'moderator'`.

### 6.7 Search

- **Accounts:** `profiles.username` / `display_name` with `pg_trgm` similarity (`%`) plus prefix match.
- **Posts by tag:** join `post_tags` -> `tags` by exact normalized name, ordered by recency or engagement.
- **Posts by keyword:** `search_vector @@ websearch_to_tsquery('simple', $1)` ranked with `ts_rank`, fallback to trigram for typos. Provide `search_posts(p_query text, p_limit int, p_cursor timestamptz)` RPC.
- Record a `search` row in `activity_events` (server-side, non-blocking via `after()`), including whether results were returned (store in `query` only; zero-result tracked via a `results_count` column if the team adds it).

