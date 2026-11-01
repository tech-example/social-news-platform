-- Migration: 00023_likers_and_followers_lists.sql
-- Description:
--   1. Add composite indexes on likes(post_id, created_at desc) and follows(following_id, created_at desc), follows(follower_id, created_at desc).
--   2. Update RLS on public.likes so that likers of hidden/removed posts do not leak to viewers who cannot see the post.
--   3. Ensure public.follows RLS allows public select.
--   4. Reload PostgREST schema cache.

-- ============================================================================
-- 1. COMPOSITE INDEXES FOR CURSOR PAGINATION AND ACTIVITY QUERIES
-- ============================================================================
CREATE INDEX IF NOT EXISTS likes_post_created_idx
  ON public.likes (post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS follows_following_created_idx
  ON public.follows (following_id, created_at DESC);

CREATE INDEX IF NOT EXISTS follows_follower_created_idx
  ON public.follows (follower_id, created_at DESC);

-- ============================================================================
-- 2. RLS POLICIES ON LIKES (Prevent leaking likes on hidden/deleted posts)
-- ============================================================================
DROP POLICY IF EXISTS "likes_are_public" ON public.likes;
DROP POLICY IF EXISTS "likes_read_visible_posts" ON public.likes;

CREATE POLICY "likes_read_visible_posts"
  ON public.likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = likes.post_id
        AND (
          p.status = 'published'
          OR p.author_id = auth.uid()
          OR public.current_role_is('moderator')
        )
    )
  );

-- ============================================================================
-- 3. RLS POLICIES ON FOLLOWS
-- ============================================================================
DROP POLICY IF EXISTS "follows_are_public" ON public.follows;

CREATE POLICY "follows_are_public"
  ON public.follows FOR SELECT
  USING (true);

-- ============================================================================
-- 4. RELOAD SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload schema';
