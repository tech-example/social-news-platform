## 2. Project Overview

**Title:** Web Application System for Content Management and News Following in Social Media Format.

**Problem.** News and information are scattered across platforms that lack content-management tooling. Users struggle to filter what they care about and have no safe central place to discuss it. Large communities are hard to moderate without a strong back office.

**Objective.** Build a web application that combines content management with social-media features (feed, likes, comments, follows, shares, hashtags, notifications), with clear role-based permissions from Guest to Admin, and a back-office with moderation and analytics.

### 2.1 Roles and Capabilities (Scope)

| Role | DB value | Capabilities |
|---|---|---|
| Guest (visitor) | *(not signed in)* | Browse posts (read-only): feed, post detail, tag pages, public profiles. |
| User (general user) | `user` | Sign in and manage own profile; manage own posts; manage hashtags/tags on own posts; manage own likes; manage own follows; manage own comments; manage own shares; view users, posts, tags, likes, follows, comments, shares; receive notifications; report other users/posts/comments to moderators; search (accounts, posts by tag, posts by keyword). |
| Moderator | `moderator` | Sign in and manage own profile; review and act on posts and comments; do first-level review of reports against users/posts/comments; view report statistics (reports awaiting final action, reports awaiting action, reports by status). |
| Admin (system administrator) | `admin` | Sign in and manage own profile; manage all users (roles, suspend, restore, delete); make the **final decision** on escalated reports; view system-wide usage statistics (posts and in-post stats, total users, total pending reports, reports by status, top-engagement posts/users). |

Role hierarchy: `admin` > `moderator` > `user` > guest. A higher role inherits lower-role capabilities unless stated otherwise.

### 2.2 Development Environment (for reference)

Windows 11, VS Code, Draw.io (diagrams), Figma (UI design), Supabase, React, JavaScript, Next.js.

### 2.3 Expected Benefits (drive the dashboard - see section 11)

Users and admins:
1. **B1** - A systematic central place to receive news and exchange opinions in a modern, easy-to-use social format.
2. **B2** - Fast access to interesting content through efficient search and categorization (tags).
3. **B3** - Stronger interaction and connection through follows, comments, likes and shares.
4. **B4** - Better organization of large volumes of content and simpler moderation of inappropriate content or behavior.
5. **B5** - Statistical summaries so usage data can be analyzed to improve communication and content quality for the target audience.
6. **B6** - Standardized, secure sharing through clear verification and permission control.

Developers:
7. **D1-D4** - Practice with real information-system problems, database and web app design, multi-role and permission management, UX/UI for communication platforms.

## 3. "No Hard-Coding" Policy (Detailed)

**Definition.** Anything that can change at runtime, or that describes the state of the system, must be read from the database or environment at runtime.

### 3.1 Forbidden

- Mock or placeholder data arrays in components, pages, or utils.
- Fake statistics, fake avatars/names, fake "trending" lists, fake notification counts.
- Hard-coded IDs (user ids, admin emails, tag ids) in code.
- Hard-coded URLs to Supabase, Vercel or third parties in code (use env).
- Hard-coded role checks by email (`if (email === "admin@...")`). Roles come from `profiles.role`.
- Hard-coded chart series, date ranges baked into JSX, static "sample" charts.
- Client-side filtering of an entire dataset that should be paginated/filtered in SQL.
- Emoji characters used as icons, bullets, status markers, or decoration (use Lucide icons).

### 3.2 Allowed (these are not "data")

- UI copy: labels, headings, button text, empty-state messages, validation messages (kept in one `src/lib/copy.js` module so there is one place to edit).
- Design tokens (colors, spacing, fonts).
- Enumerations that mirror DB enums (`report_status`, `report_target_type`, `user_role`) - defined **once** in `src/lib/constants.js` and kept in sync with SQL migrations. Do not invent additional values in UI.
- Pagination sizes, rate-limit numbers, and max lengths, stored in `src/lib/constants.js` (or env for deploy-specific values).

### 3.3 Bootstrapping without hard-coding

- The first admin is created by a **one-time script** (`scripts/bootstrap-admin.mjs`) that reads `BOOTSTRAP_ADMIN_EMAIL` from the environment and promotes that account. The app code never contains the email.
- Seed data for development lives in `supabase/seed.sql` and is loaded into the **database only**. The UI never imports it.
- Every screen must be verified against: (a) empty DB, (b) DB with 1 record, (c) DB with thousands of records.

