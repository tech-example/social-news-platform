## 11. Dashboards (Admin, Moderator, and User Insights)

Dashboards read exclusively from the `stats_*` SQL functions (section 6.6). No client-side aggregation of raw rows. Every widget has: title, tooltip explaining the metric, loading skeleton, empty state, error state with Retry, and (for charts) a "View as table" option.

### 11.1 Global Controls (Top of Every Dashboard)

- **Date range** presets: Today, Last 7 Days, Last 30 Days, Last 90 Days, Custom (URL params `from`, `to`). Default Last 30 Days.
- **Compare to previous period** toggle (drives delta badges).
- **Bucket** selector: Day / Week / Month (auto-suggested from range).
- "Updated {time}" indicator and a Refresh button (revalidates the dashboard tag).
- **Export CSV** for tables (server Route Handler streaming CSV; admin only; audit-logged).

### 11.2 Admin Dashboard (`/admin`)

**Row 1 - KPI stat cards** (value, delta vs previous period, sparkline):
- Total users (and new users in range)
- Total posts (and new posts in range)
- Total engagement (likes + comments + shares)
- Active users (DAU / WAU / MAU)
- Open reports (pending + in review) and Escalated reports awaiting final decision
- Suspended users

**Row 2 - Growth and activity**
- Line chart: New users over time.
- Line/area chart: Posts published over time.
- Stacked bar: Likes, comments and shares per day (engagement composition).
- Line chart: Daily active users.

**Row 3 - Content performance**
- Top posts by engagement (table: title, author, likes, comments, shares, score, link).
- Top users by engagement and by follower growth.
- Top hashtags/tags (bar list with post counts and engagement).
- Content mix: % posts with images, % with tags, average tags per post.

**Row 4 - Moderation and safety**
- Reports by status (donut + legend with counts).
- Reports by reason (horizontal bars).
- Median / p90 resolution time.
- Moderator workload (reports handled per moderator).
- Recent moderation actions (from `audit_logs`).

**Row 5 - Search and discovery**
- Top search terms and zero-result rate (shows where categorization/search is failing).
- Follows created over time; follower distribution (how many users have 0, 1-9, 10-99, 100+ followers).

**Row 6 - Governance and security**
- Role distribution (Users / Moderators / Admins).
- Recent audit log (who did what, when).
- Recent sign-ups (latest 10 with role and status).
- System summary: database row counts per core table, storage usage (from `pg_total_relation_size`, storage API), last deployment time (Vercel env `VERCEL_GIT_COMMIT_SHA`/`VERCEL_ENV` displayed read-only).

### 11.3 Moderator Dashboard (`/moderation`)

- Stat cards: **Reports awaiting final action** (`escalated`), **Reports awaiting action** (`pending` + `in_review`), **Resolved in range**.
- Chart: Reports by status.
- Chart: Reports received over time.
- Queue table: newest/oldest pending, reason, target type, age (with overdue highlight), quick "Review" button.
- Recently hidden content list with undo/restore.

### 11.4 Mapping Dashboard Widgets to Expected Benefits (Section 2.3)

Each benefit must be *demonstrably measurable* on a dashboard. Include a small "Impact" panel (or dedicated `/admin/insights` tab) that groups widgets by benefit:

| Benefit | What the dashboard proves | Widgets |
|---|---|---|
| **B1** Central, systematic place for news and discussion | Platform is used as the central hub | Total users, DAU/WAU/MAU, posts over time, sessions/sign-ins per day, posts per active user |
| **B2** Fast discovery via search and categorization | People find content through search and tags | Top tags, top search terms, zero-result rate, % posts with tags, tag page visits, search-to-view ratio |
| **B3** Stronger interaction and connection | Community interaction is growing | Likes/comments/shares/follows over time, engagement per post, comments per post, follower distribution, top engaged users |
| **B4** Organized content and simpler moderation | Moderation is efficient and content stays healthy | Reports by status, reports by reason, median/p90 resolution time, moderator workload, backlog trend, hidden/removed content counts |
| **B5** Usage statistics for improving communication and quality | Data supports content decisions | Top posts, top tags, engagement by day, content mix, best posting hours (heatmap by weekday x hour), comparison to previous period |
| **B6** Standard, secure sharing via verification and permissions | Access control is working and auditable | Role distribution, suspended users, audit log, privileged actions per day, failed/blocked action counts, rate-limit hits |

Developer benefits (D1-D4) are academic outcomes and are documented in `/docs`, not on the dashboard.

### 11.5 Standard Back-Office Statistics (Ensure Present)

Users: total, new per period, active (DAU/WAU/MAU), retention proxy (returning users % from `activity_events`), suspended, by role, top followed.
Content: total posts, per day, by status (published/hidden/removed), average length, with/without images, tags per post, top tags.
Engagement: likes, comments, shares, follows per period; per-post averages; engagement rate = engagement / active users.
Moderation: reports total/open/escalated/resolved, by reason, by target type, resolution time, workload, repeat offenders (users with >= N actioned reports).
System: table counts, storage usage, recent audit events, deployment info.

### 11.6 Charts Implementation Notes

- Use `recharts`, dynamically imported, inside client components that receive **already aggregated** data as props.
- Consistent color mapping per metric across the whole dashboard.
- Tooltips use `Intl.NumberFormat` and `Intl.DateTimeFormat`.
- `ResponsiveContainer` with a fixed parent height (280px) to match the skeleton.
- Axis labels and units are always present; y-axis starts at zero for bar charts.
- When data is empty: render the empty state ("No data for this range. Try a wider date range.") instead of an empty chart.
- For > 1,000 points, downsample in SQL (bucket) not in the browser.

