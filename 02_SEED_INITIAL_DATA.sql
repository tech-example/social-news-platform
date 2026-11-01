-- ==============================================================================
-- DATABASE RELEASE: Initial Seed Data (Zero Emoji, Clean Development/Testing)
-- Platform: Social Content & News Platform
-- Target: PostgreSQL / Supabase
-- Description:
--   Seeds initial demonstration profiles, tags, posts, comments, likes,
--   follows, shares, views, and activity events for immediate local or staging use.
-- ==============================================================================

DO $$
DECLARE
  v_user1_id uuid := '00000000-0000-0000-0000-000000000001';
  v_user2_id uuid := '00000000-0000-0000-0000-000000000002';
  v_user3_id uuid := '00000000-0000-0000-0000-000000000003';
  v_user4_id uuid := '00000000-0000-0000-0000-000000000004';
  v_mod_id   uuid := '00000000-0000-0000-0000-000000000005';
  v_admin_id uuid := '00000000-0000-0000-0000-000000000006';

  v_post1_id uuid := '10000000-0000-0000-0000-000000000001';
  v_post2_id uuid := '10000000-0000-0000-0000-000000000002';
  v_post3_id uuid := '10000000-0000-0000-0000-000000000003';
  v_post4_id uuid := '10000000-0000-0000-0000-000000000004';

  v_tag_tech uuid;
  v_tag_science uuid;
  v_tag_ai uuid;
  v_tag_health uuid;
  v_tag_world uuid;
  v_tag_cyber uuid;
BEGIN
  -- ----------------------------------------------------------------------------
  -- 1. Create auth.users if running in Supabase SQL Editor / Local Environment
  -- ----------------------------------------------------------------------------
  BEGIN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    VALUES
      (v_user1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tech_insider@example.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"username":"tech_insider","display_name":"Tech Insider"}', now(), now()),
      (v_user2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'science_daily@example.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"username":"science_daily","display_name":"Science Daily"}', now(), now()),
      (v_user3_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'global_pulse@example.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"username":"global_pulse","display_name":"Global Pulse"}', now(), now()),
      (v_user4_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'wellness_watch@example.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"username":"wellness_watch","display_name":"Wellness Watch"}', now(), now()),
      (v_mod_id,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'moderator_pat@example.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"username":"moderator_pat","display_name":"Pat Moderator"}', now(), now()),
      (v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin_system@example.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"username":"admin_system","display_name":"System Administrator"}', now(), now())
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'auth.users seed skipped or restricted: %', SQLERRM;
  END;

  -- ----------------------------------------------------------------------------
  -- 2. Profiles (Public user profiles with roles)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.profiles (id, username, display_name, bio, role, profanity_filter_enabled, hide_flagged_content)
  VALUES
    (v_user1_id, 'tech_insider', 'Tech Insider', 'Covering breakthroughs in software, AI, and systems engineering.', 'user', true, true),
    (v_user2_id, 'science_daily', 'Science Daily', 'Peer-reviewed research and discoveries from laboratories around the globe.', 'user', true, true),
    (v_user3_id, 'global_pulse', 'Global Pulse', 'International relations, macroeconomics, and regional analysis.', 'user', true, true),
    (v_user4_id, 'wellness_watch', 'Wellness Watch', 'Preventative health, medical research, and nutritional science.', 'user', true, true),
    (v_mod_id,   'moderator_pat', 'Pat Moderator', 'Community safety and standards reviewer.', 'moderator', true, true),
    (v_admin_id, 'admin_system', 'System Administrator', 'Operations and technical administration lead.', 'admin', true, true)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username,
      display_name = EXCLUDED.display_name,
      bio = EXCLUDED.bio,
      role = EXCLUDED.role,
      profanity_filter_enabled = EXCLUDED.profanity_filter_enabled,
      hide_flagged_content = EXCLUDED.hide_flagged_content;

  -- ----------------------------------------------------------------------------
  -- 3. Tags
  -- ----------------------------------------------------------------------------
  INSERT INTO public.tags (name) VALUES ('technology') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_tag_tech;
  INSERT INTO public.tags (name) VALUES ('science')    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_tag_science;
  INSERT INTO public.tags (name) VALUES ('ai')         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_tag_ai;
  INSERT INTO public.tags (name) VALUES ('health')     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_tag_health;
  INSERT INTO public.tags (name) VALUES ('world')      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_tag_world;
  INSERT INTO public.tags (name) VALUES ('security')   ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_tag_cyber;

  -- ----------------------------------------------------------------------------
  -- 4. Posts
  -- ----------------------------------------------------------------------------
  INSERT INTO public.posts (id, author_id, title, body, status, created_at)
  VALUES
    (
      v_post1_id,
      v_user1_id,
      'The Shift Toward Agentic Workflows in Web Development',
      'Modern web application engineering has shifted dramatically over the past two years. Rather than relying solely on monolithic single-page applications, modular frameworks combined with localized data access layers provide greater stability and deterministic builds. As development teams incorporate automated testing and schema verification, the reliability of full-stack deployments continues to reach new benchmarks.',
      'published',
      now() - interval '2 days'
    ),
    (
      v_post2_id,
      v_user2_id,
      'Deep Space Observation Reveals New Details on Exoplanet Atmospheres',
      'Astronomers utilizing the latest infrared space telescopes have published data detailing atmospheric compositions of three super-Earth exoplanets. Spectroscopic signatures confirm the presence of water vapor and carbon monoxide, suggesting active photochemical cycles. Further observational campaigns scheduled for next quarter aim to measure temperature gradients across orbital transitions.',
      'published',
      now() - interval '1 day'
    ),
    (
      v_post3_id,
      v_user3_id,
      'Global Semiconductor Supply Chains Shift Toward Regional Resilience',
      'Manufacturing consortia in Europe and North America have announced increased capital expenditures in silicon fabrication facilities. The ongoing diversification strategy aims to safeguard precision manufacturing from logistical bottlenecks and geopolitical fluctuations over the coming decade.',
      'published',
      now() - interval '18 hours'
    ),
    (
      v_post4_id,
      v_user4_id,
      'Clinical Trials Report Promising Results for Targeted Cardiovascular Therapies',
      'Phase three multi-center clinical trials evaluating small molecule inhibitors have demonstrated a 28 percent reduction in adverse cardiovascular events among high-risk patients. Researchers emphasize the importance of early intervention and personalized lipid management protocols.',
      'published',
      now() - interval '4 hours'
    )
  ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- 5. Post Tags Associations
  -- ----------------------------------------------------------------------------
  INSERT INTO public.post_tags (post_id, tag_id)
  VALUES
    (v_post1_id, v_tag_tech),
    (v_post1_id, v_tag_ai),
    (v_post2_id, v_tag_science),
    (v_post3_id, v_tag_world),
    (v_post3_id, v_tag_tech),
    (v_post4_id, v_tag_health),
    (v_post4_id, v_tag_science)
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- 6. Follows
  -- ----------------------------------------------------------------------------
  INSERT INTO public.follows (follower_id, following_id)
  VALUES
    (v_user1_id, v_user2_id),
    (v_user1_id, v_user3_id),
    (v_user2_id, v_user1_id),
    (v_user3_id, v_user1_id),
    (v_user4_id, v_user1_id)
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- 7. Comments
  -- ----------------------------------------------------------------------------
  INSERT INTO public.comments (post_id, author_id, body, created_at)
  VALUES
    (v_post1_id, v_user2_id, 'Strong agreement on the data access layer separation. It simplifies row-level policy enforcement immensely.', now() - interval '36 hours'),
    (v_post1_id, v_user3_id, 'The operational benefits during CI validation are also immediately measurable.', now() - interval '30 hours'),
    (v_post2_id, v_user1_id, 'Fascinating spectroscopic measurements. Are the raw datasets accessible for community analysis?', now() - interval '12 hours')
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- 8. Likes
  -- ----------------------------------------------------------------------------
  INSERT INTO public.likes (user_id, post_id)
  VALUES
    (v_user2_id, v_post1_id),
    (v_user3_id, v_post1_id),
    (v_user4_id, v_post1_id),
    (v_user1_id, v_post2_id),
    (v_user3_id, v_post2_id),
    (v_user1_id, v_post3_id)
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- 9. Shares
  -- ----------------------------------------------------------------------------
  INSERT INTO public.shares (user_id, post_id, note)
  VALUES
    (v_user2_id, v_post1_id, 'Essential reading for systems architects.'),
    (v_user3_id, v_post2_id, 'Incredible progress in exoplanetary science.')
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- 10. Sample Post Views (Feeds Executive Admin Analytics)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.post_views (post_id, viewer_id, visitor_hash, viewed_at, time_bucket)
  VALUES
    (v_post1_id, v_user2_id, NULL, now() - interval '30 hours', date_trunc('hour', now() - interval '30 hours')),
    (v_post1_id, v_user3_id, NULL, now() - interval '24 hours', date_trunc('hour', now() - interval '24 hours')),
    (v_post1_id, v_user4_id, NULL, now() - interval '12 hours', date_trunc('hour', now() - interval '12 hours')),
    (v_post1_id, NULL, 'guest_hash_alpha_01', now() - interval '6 hours', date_trunc('hour', now() - interval '6 hours')),
    (v_post2_id, v_user1_id, NULL, now() - interval '18 hours', date_trunc('hour', now() - interval '18 hours')),
    (v_post2_id, NULL, 'guest_hash_beta_02', now() - interval '8 hours', date_trunc('hour', now() - interval '8 hours')),
    (v_post3_id, v_user1_id, NULL, now() - interval '14 hours', date_trunc('hour', now() - interval '14 hours')),
    (v_post4_id, v_user2_id, NULL, now() - interval '3 hours', date_trunc('hour', now() - interval '3 hours')),
    (v_post4_id, NULL, 'guest_hash_gamma_03', now() - interval '1 hour', date_trunc('hour', now() - interval '1 hour'))
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- 11. Activity Events (Feeds DAU/WAU & Search Analytics)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.activity_events (user_id, kind, query, created_at)
  VALUES
    (v_user1_id, 'sign_in', NULL, now() - interval '2 days'),
    (v_user2_id, 'sign_in', NULL, now() - interval '1 day'),
    (v_user3_id, 'sign_in', NULL, now() - interval '18 hours'),
    (v_user4_id, 'sign_in', NULL, now() - interval '4 hours'),
    (v_user1_id, 'search', 'agentic workflows', now() - interval '20 hours'),
    (v_user2_id, 'search', 'semiconductor', now() - interval '16 hours'),
    (v_user3_id, 'search', 'astronomy', now() - interval '8 hours'),
    (v_user4_id, 'search', 'cardiovascular', now() - interval '2 hours');

  -- ----------------------------------------------------------------------------
  -- 12. Sample Profanity Terms (Pre-configured baseline rules)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.profanity_terms (term, language, severity, kind, is_active, created_by)
  VALUES
    ('spamlink', 'en', 'mild', 'block', true, v_admin_id),
    ('phishingsite', 'en', 'severe', 'block', true, v_admin_id),
    ('fakescam', 'en', 'moderate', 'block', true, v_admin_id)
  ON CONFLICT (lower(term), kind, language) DO NOTHING;

END $$;
