-- Migration: 00016_on_post_published_notify.sql
-- Description:
--   Notify followers when an account creates a new published post.
--   Uses a set-based insert to notify all followers efficiently.

create or replace function public.notify_on_post_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' then
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    select follower_id, new.author_id, 'new_post', new.id
    from public.follows
    where following_id = new.author_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_post_published_notify on public.posts;
create trigger on_post_published_notify
  after insert on public.posts
  for each row execute function public.notify_on_post_published();
