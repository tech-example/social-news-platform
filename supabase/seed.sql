-- Development seed data for Supabase
-- WARNING: For development use only. Never import directly into the frontend.
-- All data is in English with zero emoji.

do $$
declare
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
begin
  -- 1. Insert or update dummy profiles for testing
  -- Note: In production, profiles are created via handle_new_user auth trigger.
  insert into public.profiles (id, username, display_name, bio, role)
  values
    (v_user1_id, 'tech_insider', 'Tech Insider', 'Covering breakthroughs in software, AI, and systems engineering.', 'user'),
    (v_user2_id, 'science_daily', 'Science Daily', 'Peer-reviewed research and discoveries from laboratories around the globe.', 'user'),
    (v_user3_id, 'global_pulse', 'Global Pulse', 'International relations, macroeconomics, and regional analysis.', 'user'),
    (v_user4_id, 'wellness_watch', 'Wellness Watch', 'Preventative health, medical research, and nutritional science.', 'user'),
    (v_mod_id,   'moderator_pat', 'Pat Moderator', 'Community safety and standards reviewer.', 'moderator'),
    (v_admin_id, 'admin_system', 'System Administrator', 'Operations and technical administration lead.', 'admin')
  on conflict (id) do update
  set username = excluded.username, display_name = excluded.display_name, role = excluded.role;

  -- 2. Tags
  insert into public.tags (name) values ('technology') on conflict (name) do update set name = excluded.name returning id into v_tag_tech;
  insert into public.tags (name) values ('science') on conflict (name) do update set name = excluded.name returning id into v_tag_science;
  insert into public.tags (name) values ('ai') on conflict (name) do update set name = excluded.name returning id into v_tag_ai;
  insert into public.tags (name) values ('health') on conflict (name) do update set name = excluded.name returning id into v_tag_health;
  insert into public.tags (name) values ('world') on conflict (name) do update set name = excluded.name returning id into v_tag_world;

  -- 3. Posts
  insert into public.posts (id, author_id, title, body, status, created_at)
  values
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
  on conflict (id) do nothing;

  -- 4. Post Tags Associations
  insert into public.post_tags (post_id, tag_id)
  values
    (v_post1_id, v_tag_tech),
    (v_post1_id, v_tag_ai),
    (v_post2_id, v_tag_science),
    (v_post3_id, v_tag_world),
    (v_post3_id, v_tag_tech),
    (v_post4_id, v_tag_health),
    (v_post4_id, v_tag_science)
  on conflict do nothing;

  -- 5. Follows
  insert into public.follows (follower_id, following_id)
  values
    (v_user1_id, v_user2_id),
    (v_user1_id, v_user3_id),
    (v_user2_id, v_user1_id),
    (v_user3_id, v_user1_id),
    (v_user4_id, v_user1_id)
  on conflict do nothing;

  -- 6. Comments
  insert into public.comments (post_id, author_id, body, created_at)
  values
    (v_post1_id, v_user2_id, 'Strong agreement on the data access layer separation. It simplifies row-level policy enforcement immensely.', now() - interval '36 hours'),
    (v_post1_id, v_user3_id, 'The operational benefits during CI validation are also immediately measurable.', now() - interval '30 hours'),
    (v_post2_id, v_user1_id, 'Fascinating spectroscopic measurements. Are the raw datasets accessible for community analysis?', now() - interval '12 hours')
  on conflict do nothing;

  -- 7. Likes
  insert into public.likes (user_id, post_id)
  values
    (v_user2_id, v_post1_id),
    (v_user3_id, v_post1_id),
    (v_user4_id, v_post1_id),
    (v_user1_id, v_post2_id),
    (v_user3_id, v_post2_id),
    (v_user1_id, v_post3_id)
  on conflict do nothing;

  -- 8. Shares
  insert into public.shares (user_id, post_id, note)
  values
    (v_user2_id, v_post1_id, 'Essential reading for systems architects.'),
    (v_user3_id, v_post2_id, 'Incredible progress in exoplanetary science.')
  on conflict do nothing;

  -- 9. Sample Activity Events (for DAU/WAU and Search Analytics)
  insert into public.activity_events (user_id, kind, query, created_at)
  values
    (v_user1_id, 'sign_in', null, now() - interval '2 days'),
    (v_user2_id, 'sign_in', null, now() - interval '1 day'),
    (v_user3_id, 'sign_in', null, now() - interval '18 hours'),
    (v_user4_id, 'sign_in', null, now() - interval '4 hours'),
    (v_user1_id, 'search', 'agentic workflows', now() - interval '20 hours'),
    (v_user2_id, 'search', 'semiconductor', now() - interval '16 hours'),
    (v_user3_id, 'search', 'astronomy', now() - interval '8 hours'),
    (v_user4_id, 'search', 'cardiovascular', now() - interval '2 hours');

end $$;
