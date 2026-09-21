---
name: social-content-news-platform
description: Build and maintain "Web Application System for Content Management and News Following in Social Media Format" - a Next.js (App Router) + Supabase social news platform with four roles (Guest, User, Moderator, Admin), a news-feed UI, a two-tier moderation workflow, and an analytics dashboard. The public UI follows Instagram-style UX/UI patterns (mobile-first, fully responsive), uses Lucide icons only, and contains no emoji. Use whenever the task involves creating, extending, reviewing, or deploying this project (feed, posts, hashtags, likes, follows, comments, shares, notifications, reports, dashboards, RLS, Vercel deployment). All UI text, code, identifiers, comments and database objects are in English.
license: MIT
metadata:
  project: Web Application System for Content Management and News Following in Social Media Format
  stack: Next.js, React, JavaScript, Supabase, Vercel, Framer Motion, Lucide
  language: en
  version: "1.0.0"
---

# Social Content and News Platform - Agent Skill

Detailed rules live in `references/`. This file holds the non-negotiable rules and the reading map. **Before working on an area, read its reference file completely.** Section numbers in the text (for example "section 8.7") refer to the numbering inside the reference files.

## 0. Non-Negotiable Rules (Read First)

1. **English everywhere.** UI copy, code, variable names, comments, commit messages, DB tables/columns, error messages, and this document are English. No Thai strings in the product.
2. **No hard-coded data.** Every list, number, chart, label-with-a-count, category, tag, user, post and statistic shown in the UI comes from the database at request time. No mock arrays, no `const posts = [...]`, no fake stats, no lorem ipsum in shipped code. Empty database = a designed empty state, never fake content. See section 3.
3. **No secrets in the browser. Ever.** The browser must never receive a Supabase URL-with-key, anon key, service-role key, JWT secret, or any third-party key. There are **zero** `NEXT_PUBLIC_` variables holding secrets. All database access goes through the Next.js server layer (Server Components, Server Actions, Route Handlers). See section 4.
4. **Every mutation authenticates and authorizes inside the mutation.** Server Actions are public endpoints. Never rely on middleware or layout guards alone. See section 4.5.
5. **Every async list shows a skeleton while loading.** No spinners-on-blank-page, no layout shift. See section 9.
6. **White theme.** Light UI with a white base. No dark mode is required (optional later). See section 8.
7. **Deploy path is fixed:** code in GitHub -> Vercel builds from GitHub -> Vercel hosts the frontend and server layer -> Supabase hosts the database. Secrets live only in Vercel and Supabase dashboards, never in Git. See section 12.
8. **Follow the three companion skills** in section 1 (React performance, web design guidelines, Motion). Their distilled rules are embedded in sections 7, 8 and 10.
9. **Instagram-style UX/UI, fully responsive.** The user-facing app follows the interaction patterns and layout of Instagram (mobile bottom tab bar, left icon sidebar on desktop, single-column feed, square-grid profiles, dialog-based post detail). Patterns only: never copy Instagram's logo, name, brand assets, or proprietary artwork. Every screen must work from 320px to 1920px. See sections 8.3, 8.6 and 8.8.
10. **Lucide icons only, and no emoji anywhere in the web pages.** All icons come from `lucide-react` (section 8.7). No emoji characters in UI copy, buttons, labels, toasts, empty states, page titles, metadata, favicons, alt text, seed data, or code strings. See section 8.7.4.

## 1. Companion Skills (Run These First)

Before any implementation session, run each command, read the **complete** output (redirect to a temp file if it is long), and resolve relative paths from the supporting-files directory the command prints.

```bash
# 1) React and Next.js performance rules (70 rules, 8 categories)
npx skills use "https://github.com/vercel-labs/agent-skills" --skill "vercel-react-best-practices" > /tmp/react-skill.txt

# 2) Web Interface Guidelines (accessibility, forms, focus, animation, typography, i18n)
npx skills use "https://github.com/vercel-labs/agent-skills" --skill "web-design-guidelines" > /tmp/webdesign-skill.txt
#    This skill tells you to fetch the latest rules from:
#    https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md

# 3) Motion / Framer Motion (animations, variants, AnimatePresence, reduced motion)
npx skills use "https://github.com/freshtechbro/claudedesignskills" --skill "motion-framer" > /tmp/motion-skill.txt
```

How each skill is used in this project:

| Skill | Used for | Where applied |
|---|---|---|
| `vercel-react-best-practices` | Data fetching without waterfalls, bundle size, server/client split, re-render control | Sections 5, 7, 9 |
| `web-design-guidelines` | Accessibility, focus states, forms, animation rules, typography, content handling; also used to **audit** finished UI files and output findings as `file:line` | Sections 8, 13 |
| `motion-framer` | Page/list/dashboard transitions, hover/tap feedback, exit animations, layout animations | Section 10 |
| Lucide icons | Consistent icon set. No registry skill exists for it (`npx skills find lucide` returned none), so the rules are embedded directly in this file | Section 8.7 |

After building any screen, run the web-design-guidelines audit on the changed files and fix every finding (section 13).

---

## Reading Map

| File | Contains | Read when |
|---|---|---|
| (this file) | Sections 0-1 | Always |
| `references/01-overview-and-no-hardcoding.md` | Sections 2, 3: Project scope, roles, expected benefits (B1-B6), and the no-hard-coding policy | Starting the project or checking scope and hard-coding rules |
| `references/02-security.md` | Sections 4: API key hiding, BFF architecture, env vars, server-only modules, authorization, RLS, hardening | Touching auth, env vars, server actions, keys, RLS, uploads |
| `references/03-database.md` | Sections 6: Schema, enums, RLS policies, triggers, report state machine, stats functions, search | Writing migrations, policies, triggers, stats functions, search |
| `references/04-architecture-and-performance.md` | Sections 5, 7: Tech stack, folder structure, server/client rules, data fetching, bundle and render rules | Creating files, choosing libraries, fetching data, optimizing |
| `references/05-ui-design-system.md` | Sections 8: White theme tokens, Instagram-style screens, responsive rules, Lucide icons, no-emoji policy | Building any UI: layout, Instagram-style screens, responsive, icons, emoji rule |
| `references/06-skeleton-and-motion.md` | Sections 9, 10: Skeleton loading and Framer Motion rules | Adding loading states or animations |
| `references/07-dashboards.md` | Sections 11: Admin and moderator dashboards, benefit-to-widget mapping, charts | Building admin or moderator dashboards and charts |
| `references/08-deployment.md` | Sections 12: GitHub to Vercel to Supabase deployment, CI secret guard | Deploying, configuring Vercel, Supabase, CI checks |
| `references/09-plan-and-checklist.md` | Sections 13, 14, 15: Phased plan, acceptance criteria, definition of done, working agreements | Planning phases, verifying completion |
