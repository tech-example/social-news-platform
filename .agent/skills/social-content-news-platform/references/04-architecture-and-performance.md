## 5. Tech Stack and Versions

| Layer | Choice |
|---|---|
| Framework | Next.js 15+ (App Router), React 19 |
| Language | JavaScript (ES2023) with JSDoc types where helpful, `jsconfig.json` path alias `@/*` |
| Database/Auth/Storage | Supabase (Postgres 15+, Auth, Storage) |
| Server data client | `@supabase/supabase-js`, `@supabase/ssr` (server only) |
| Validation | `zod` |
| Client data fetching | `swr` (for notifications, infinite feed, live counters) |
| Styling | Tailwind CSS v4 (or v3) + CSS variables for tokens |
| Animation | `framer-motion` (use `LazyMotion` + `m` components) |
| Charts | `recharts` (dynamically imported) |
| Icons | `lucide-react` (pinned version; named per-icon imports; see section 8.7). No other icon library, no icon fonts, no emoji |
| Dates/numbers | Native `Intl.DateTimeFormat` / `Intl.NumberFormat` |
| Hosting | Vercel (from GitHub) |
| Diagrams | Draw.io (ERD, use-case, architecture) exported into `/docs` |
| Design | Figma (source of truth for layouts; tokens mirrored in section 8) |

Install:

```bash
npx create-next-app@latest social-news --js --app --tailwind --eslint --src-dir --import-alias "@/*"
cd social-news
npm i @supabase/supabase-js @supabase/ssr zod swr framer-motion recharts lucide-react server-only
```

## 7. Application Architecture and Performance Rules

### 7.1 Folder Structure

```text
src/
  app/
    (public)/
      page.jsx                      # Home feed (guests can read)
      p/[postId]/page.jsx           # Post detail
      u/[username]/page.jsx         # Public profile
      tag/[name]/page.jsx           # Tag page
      search/page.jsx               # Search (accounts | tags | keywords via ?q=&type=)
      explore/page.jsx              # Explore grid (top posts by engagement, from DB)
      @modal/(.)p/[postId]/page.jsx # Intercepted post detail shown as a dialog over the feed (desktop)
      @modal/default.jsx
    (auth)/
      sign-in/page.jsx
      sign-up/page.jsx
    (app)/                           # requires role >= user
      settings/page.jsx              # Own profile
      notifications/page.jsx
      compose/page.jsx
    (moderator)/moderation/          # requires role >= moderator
      page.jsx                       # Moderator dashboard (report stats)
      reports/page.jsx               # Report queue
      reports/[reportId]/page.jsx
      content/page.jsx               # Posts and comments review
    (admin)/admin/                   # requires role = admin
      page.jsx                       # Admin dashboard (main analytics)
      users/page.jsx                 # User management
      reports/page.jsx               # Escalated reports, final decisions
      audit/page.jsx                 # Audit log
    api/
      notifications/route.js         # GET (poll), POST (mark read)
      feed/route.js                  # GET (cursor pagination for infinite scroll)
      upload-url/route.js            # POST signed upload URL
    layout.jsx
    globals.css
    not-found.jsx
    error.jsx
    loading.jsx                      # Route-level skeleton fallback
  components/
    ui/                              # Button, Input, Card, Badge, Avatar, Skeleton, Dialog, Toast, Tabs, Table
    feed/                            # PostCard, PostComposer, FeedList, TagChip, CommentThread, ShareDialog
    dashboard/                       # StatCard, TrendChart, BarList, DonutChart, DataTable, DateRangePicker + *Skeleton
    moderation/                      # ReportCard, ReportTimeline, ActionPanel
    motion/                          # MotionProvider, FadeIn, Stagger, Presence helpers
  server/
    env.js  supabase.js  admin-client.js  auth.js
    dal/                             # data access layer: posts.js, users.js, tags.js, reports.js, stats.js ...
    actions/                         # Server Actions grouped by domain
  lib/
    constants.js  copy.js  format.js  validators.js  cn.js
  middleware.js                      # session refresh + coarse route protection
supabase/
  migrations/  seed.sql
scripts/
  bootstrap-admin.mjs  check-secrets.mjs
docs/
  erd.drawio  architecture.drawio  use-cases.drawio
.env.example
```

Rule: `components/*` never import from `server/*` except Server Components calling DAL functions. Client Components receive plain serializable props.

### 7.2 Server vs Client Components

- Default to **Server Components**. Add `"use client"` only for interactivity (like button, composer, dialogs, charts, SWR polling, motion wrappers).
- Push `"use client"` to the smallest leaf (`LikeButton`, not `PostCard`).
- Minimize props passed to client components (rule `server-serialization`): pass ids and needed fields, not whole rows.

### 7.3 Data Fetching (Critical Rules from vercel-react-best-practices)

- **Eliminate waterfalls** (`async-parallel`, `server-parallel-fetching`): fetch independent data with `Promise.all`; structure components so siblings fetch in parallel.

```js
const [overview, timeseries, topPosts, reportsByStatus] = await Promise.all([
  getStatsOverview(range), getTimeseries("posts", range), getTopPosts(range), getReportsByStatus(),
]);
```

- **Stream with Suspense** (`async-suspense-boundaries`): every dashboard widget is its own async Server Component wrapped in `<Suspense fallback={<WidgetSkeleton/>}>` so the shell and fast widgets appear immediately.
- **Deduplicate per request** (`server-cache-react`): wrap DAL reads in `React.cache()` (`getSession` already does).
- **Defer awaits** (`async-defer-await`): do not await data that is only needed in a branch.
- **Non-blocking side effects** (`server-after-nonblocking`): use `after()` from `next/server` for activity logging and analytics writes.
- **Client fetching** (`client-swr-dedup`): SWR for notifications and infinite feed; one shared fetcher; `refreshInterval` for notifications (e.g., 30 s, paused when tab hidden).
- **Pagination:** cursor-based (`created_at`, `id`) for feeds, comments, notifications, tables. Never `select *` without limit. Offset pagination is acceptable only in admin tables with a total count.
- **Select only needed columns.** No `select("*")` in list queries.
- **Caching:** public guest feed may use `unstable_cache`/`revalidateTag` with short TTL, tagged (`"feed"`, `"post:{id}"`), invalidated by mutations. Dashboards are dynamic (no cache) or cached for <= 60 s with a visible "Updated 12:04" timestamp.

### 7.4 Bundle Size Rules

- `bundle-barrel-imports`: import icons as named imports directly from `lucide-react` in the file that uses them (`import { Heart } from "lucide-react"`) and configure `optimizePackageImports` in `next.config.mjs` for `lucide-react`, `recharts`, `framer-motion` so only used icons are bundled. Do not create your own re-export barrel of icons.
- `bundle-dynamic-imports`: load `recharts` components with `next/dynamic` (`ssr: false`) inside a client wrapper, with the chart skeleton as the `loading` fallback.
- `bundle-defer-third-party`: load anything analytics-like after hydration.
- `bundle-conditional`: load moderation/admin-only code only on those routes (route groups already split bundles).
- `bundle-preload`: preload on hover/focus for heavy dialogs (e.g., composer, report dialog).

### 7.5 Re-render Rules

- `rerender-derived-state-no-effect`: derive values during render; do not mirror props in state via effects.
- `rerender-functional-setstate`: use `setX(prev => ...)` for stable callbacks.
- `rerender-transitions`: wrap non-urgent updates (filters, tab switches) in `startTransition`; use `useTransition` for pending UI (`rendering-usetransition-loading`).
- `rerender-no-inline-components`: never define a component inside another component.
- `rerender-memo`: memoize expensive list items (`PostCard` leaf pieces) only when profiling shows need.
- Optimistic UI for like/follow using `useOptimistic`; roll back on failure and announce the error via `aria-live`.

### 7.6 Rendering Rules

- `rendering-conditional-render`: use ternaries (`cond ? <A/> : null`), not `cond && <A/>`, when `cond` can be `0`.
- `rendering-content-visibility`: apply `content-visibility: auto` on long feed cards.
- `rendering-hoist-jsx`: hoist static JSX/skeleton markup outside components.
- `rendering-hydration-no-flicker` / `suppress-warning`: dates formatted with `Intl` in the viewer's locale can mismatch; render with a fixed `timeZone` on the server or use a small client `<RelativeTime>` with `suppressHydrationWarning` on that element only.
- Use `next/image` with explicit `width`/`height`; `priority` for the first feed image only; `loading="lazy"` for the rest.

