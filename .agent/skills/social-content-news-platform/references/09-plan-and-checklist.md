## 13. Implementation Plan (Phased) and Acceptance Criteria

Follow phases in order; do not start a phase before the previous one passes its checks. After each phase run lint, build, and the web-design-guidelines audit on changed files.

### Phase 0 - Foundation
- Scaffold app, install dependencies (pin `lucide-react` to an exact version), configure Tailwind tokens (section 8.1), system font stack, breakpoints (section 8.3), `MotionProvider`, `Skeleton`, `IconButton`, base UI components, app shell (top bar, bottom tab bar, sidebar), `copy.js`, `constants.js` (including `ALLOW_EMOJI_IN_USER_CONTENT = false`).
- Add scripts: `check-icons.mjs` and `check-no-emoji.mjs` (`"prebuild": "node scripts/check-no-emoji.mjs && node scripts/check-icons.mjs"`).
- Implement `env.js`, `supabase.js`, `admin-client.js`, `auth.js`, `middleware.js`.
- **Accept:** app builds, `server-only` guards work, zero `NEXT_PUBLIC_` secrets, shell is responsive from 320px to 1920px.

### Phase 1 - Database
- Migrations for enums, tables, indexes, triggers, RPCs, RLS, stats functions; `seed.sql` for development only.
- **Accept:** RLS test script proves each role can only do what section 2.1 allows; `rowsecurity=false` query returns nothing.

### Phase 2 - Auth and Profiles
- Sign up, sign in, sign out (Server Actions), profile view/edit, avatar upload via signed URL, suspended-user handling, last-seen tracking (`after()`).
- **Accept:** cookies are httpOnly; suspended user cannot act; users cannot change their own role.

### Phase 3 - Feed and Posts (Guest and User)
- Feed (cursor pagination + SWR infinite), post detail, composer with tags, edit/delete own posts, tag pages, public profiles, empty states, skeletons.
- **Accept:** guests read only; users write only their own; no hard-coded content; skeletons everywhere.

### Phase 4 - Social Interactions
- Like, follow, comment (with replies), share (with optional note), hashtags parsing, notifications (bell + page, mark read), optimistic UI.
- **Accept:** counters stay consistent under rapid toggling; notifications are created for the right recipient and never for self-actions.

### Phase 5 - Search
- Accounts, posts by tag, posts by keyword; URL-driven state; debounced suggestions (server route); search logging.
- **Accept:** typo-tolerant account search; keyword ranking; zero-result state.

### Phase 6 - Reporting and Moderation
- Report dialog (user/post/comment), moderator queue, report detail with timeline, hide/restore content, escalate, dismiss; admin final decision, user suspend/restore.
- **Accept:** state machine enforced in DB; moderators cannot finalize or delete users; every privileged action is audit-logged.

### Phase 7 - Dashboards
- Implement all `stats_*` functions and widgets from section 11, date range controls, compare toggle, CSV export, benefit-to-widget mapping panel.
- **Accept:** every number matches a direct SQL check; each widget has skeleton/empty/error states; dashboards stream progressively.

### Phase 8 - Polish and Hardening
- Motion pass (section 10), accessibility pass (axe + keyboard), performance pass (Lighthouse >= 90 on mobile for feed, bundle analysis), security headers, rate limits, error boundaries, 404/500 pages.
- **Accept:** section 14 checklist is fully green.

### Web Design Guidelines Audit (Run After Every Phase)

1. Fetch the latest rules: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`.
2. Read the changed files and check them against every rule (accessibility, focus states, forms, animation, typography, content handling, images, performance, navigation and state, touch, safe areas, theming, i18n, hydration, hover states, copy, anti-patterns).
3. Output findings terse and grouped by file in `file:line - issue` format; fix them all; re-run until every file reports `PASS`.

## 14. Final Checklist (Definition of Done)

**Security**
- [ ] No Supabase key, URL-with-key, or JWT in any browser bundle or network request from the client.
- [ ] Service-role client is only imported in server files guarded by `server-only` and always behind `requireRole`.
- [ ] Every Server Action/Route Handler validates input, authenticates, authorizes, then mutates.
- [ ] RLS enabled on all tables; policies verified per role.
- [ ] `role` and `is_suspended` cannot be changed by non-admins (trigger tested).
- [ ] Secrets only in Vercel/Supabase dashboards; `.env*` git-ignored; secret scanning on.
- [ ] Security headers present; uploads validated; rate limiting on abuse-prone actions.

**Data integrity ("no hard-code")**
- [ ] Search the codebase: no mock arrays, no fake stats, no lorem ipsum, no hard-coded IDs/emails.
- [ ] All dashboard numbers come from `stats_*` functions; verified against manual SQL.
- [ ] App works correctly on empty, small and large databases.

**Functionality (by role)**
- [ ] Guest: browse feed, post detail, profiles, tags, search.
- [ ] User: profile, posts, tags, likes, follows, comments, shares, view all, notifications, report, search (accounts/tags/keywords).
- [ ] Moderator: profile, post/comment actions, first-level report handling, report stats (awaiting final, awaiting action, by status).
- [ ] Admin: profile, all-user management, final report decisions, system statistics (posts and in-post stats, total users, pending reports, by status, top engagement).

**UX quality**
- [ ] Instagram-style patterns implemented: bottom tab bar (mobile), icon sidebar (tablet), labeled sidebar (wide), 470px feed column, post card anatomy, square-grid profile, dialog post detail (desktop), bottom sheets (mobile). No copied Instagram branding.
- [ ] Responsive QA (section 8.8) passed at all required widths; no horizontal scroll.
- [ ] All icons are Lucide, names verified by `check-icons`; every icon-only control has `aria-label`.
- [ ] No emoji in any page, string, favicon, or seed data (`check-no-emoji` passes).
- [ ] Skeleton loading on every async surface, no layout shift.
- [ ] White theme applied consistently with the token set.
- [ ] Motion uses `LazyMotion`, respects reduced motion, animates only transform/opacity.
- [ ] Empty, error, and long-content states designed for every list.
- [ ] Keyboard navigable; visible focus; labels and `aria-live` where required; contrast verified.
- [ ] Web Interface Guidelines audit returns no findings.

**Performance**
- [ ] No request waterfalls (independent fetches in `Promise.all` or parallel Suspense boundaries).
- [ ] Charts and heavy dialogs are dynamically imported; no barrel-import bloat.
- [ ] Client components are leaf-level; props are minimal and serializable.
- [ ] Lists paginated by cursor; long lists use `content-visibility` or virtualization.

**Deployment**
- [ ] GitHub -> Vercel auto-deploy works for previews and production.
- [ ] Supabase migrations applied from Git; auth redirect URLs correct.
- [ ] Admin bootstrapped by script, not by code.

## 15. Agent Working Agreements

1. Read this file and the three companion skill outputs before coding.
2. Ask before adding a dependency not listed in section 5, or before deviating from any rule marked non-negotiable.
3. Work phase by phase; keep commits small and conventional.
4. When a requirement is ambiguous, prefer the safer, more secure, more accessible option and document the decision in `/docs/decisions.md`.
5. Never paste real keys into code, comments, logs, docs or chat. Use `.env.example` placeholders.
6. When adding a table or column, ship the migration, the RLS policy, the DAL function, the zod schema and the UI (with skeleton, empty and error states) together.
7. Before declaring work complete, walk section 14 and state which items were verified and how.

