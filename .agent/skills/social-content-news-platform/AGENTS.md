# AGENTS.md

This project is the Social Content and News Platform (Next.js App Router, Supabase, Vercel).

Use the `social-content-news-platform` skill for all work. Read `SKILL.md` and the relevant file in `references/` before writing code.

Hard rules:
1. English only in UI, code, comments, database objects.
2. No hard-coded data. Everything shown comes from the database.
3. No secrets in the browser. No NEXT_PUBLIC_ secrets. Database access only from server code marked `server-only`.
4. Every Server Action validates input, authenticates, authorizes, then mutates.
5. Skeleton loading on every async surface.
6. White theme, Instagram-style patterns, responsive from 320px to 1920px.
7. Lucide icons only. No emoji anywhere in the web pages.
8. Work phase by phase and stop after each phase for review.
