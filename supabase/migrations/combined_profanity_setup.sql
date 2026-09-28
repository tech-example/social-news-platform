-- Combined Idempotent Migration: Profanity Flagging and Dynamic Management
-- Ready to run directly in Supabase SQL Editor

-- 1. Add flagging columns to posts, comments, and profiles
alter table public.posts
  add column if not exists is_flagged boolean not null default false,
  add column if not exists flagged_reason text;

alter table public.comments
  add column if not exists is_flagged boolean not null default false,
  add column if not exists flagged_reason text;

alter table public.profiles
  add column if not exists hide_flagged_content boolean not null default true;

create index if not exists idx_posts_is_flagged
  on public.posts (is_flagged) where is_flagged = true;

create index if not exists idx_comments_is_flagged
  on public.comments (is_flagged) where is_flagged = true;

-- 2. Table: profanity_terms
create table if not exists public.profanity_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null check (char_length(term) between 1 and 100),
  language text not null check (language in ('th', 'en', 'th_romanized', 'other')),
  severity text not null check (severity in ('mild', 'moderate', 'severe')),
  kind text not null default 'block' check (kind in ('block', 'allow')),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profanity_terms_unique_idx
  on public.profanity_terms (lower(term), kind, language);

create index if not exists profanity_terms_active_idx
  on public.profanity_terms (is_active, kind, language);

-- 3. Table: profanity_term_suggestions
create table if not exists public.profanity_term_suggestions (
  id uuid primary key default gen_random_uuid(),
  term text not null check (char_length(term) between 1 and 100),
  language text not null check (language in ('th', 'en', 'th_romanized', 'other')),
  severity text not null default 'moderate' check (severity in ('mild', 'moderate', 'severe')),
  source_report_id uuid references public.reports(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  suggested_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists profanity_term_suggestions_status_idx
  on public.profanity_term_suggestions (status, created_at desc);

-- 4. Enable Row Level Security (RLS)
alter table public.profanity_terms enable row level security;
alter table public.profanity_term_suggestions enable row level security;

-- 5. Policies
drop policy if exists "Admins have full access to profanity_terms" on public.profanity_terms;
create policy "Admins have full access to profanity_terms"
  on public.profanity_terms for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Moderators and admins can read suggestions" on public.profanity_term_suggestions;
create policy "Moderators and admins can read suggestions"
  on public.profanity_term_suggestions for select to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('moderator', 'admin')));

drop policy if exists "Moderators can insert suggestions" on public.profanity_term_suggestions;
create policy "Moderators can insert suggestions"
  on public.profanity_term_suggestions for insert to authenticated
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('moderator', 'admin')));

drop policy if exists "Admins can update suggestions" on public.profanity_term_suggestions;
create policy "Admins can update suggestions"
  on public.profanity_term_suggestions for update to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

notify pgrst, 'reload schema';
