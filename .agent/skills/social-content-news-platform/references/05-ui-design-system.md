## 8. UI/UX Design System (White Theme, Instagram-Style, Responsive)

The interface is a **white, mobile-first, Instagram-style** social app: content-first, minimal chrome, thin dividers, small radii, one blue action color, icon-driven navigation. The back office (moderator/admin) reuses the same tokens and components but uses a dashboard layout (section 11).

Legal and originality note: replicate **patterns** (layout, navigation model, interaction) only. Use the project's own name and a text wordmark. Do not use Instagram's logo, gradient brand mark, name, or copied assets.

### 8.1 Design Tokens

Define as CSS variables in `globals.css` (Tailwind maps to them). No dark theme is required.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FFFFFF` | Page and card background |
| `--surface` | `#FAFAFA` | Inputs, subtle panels, skeleton base, table headers |
| `--surface-strong` | `#EFEFEF` | Hover fills, skeleton shimmer highlight, chips |
| `--ink` | `#262626` | Primary text |
| `--ink-muted` | `#737373` | Secondary text, timestamps, counts (>= 4.5:1 on white) |
| `--line` | `#DBDBDB` | 1px borders and dividers |
| `--accent` | `#0074CC` | Text links, primary button fill (white text passes AA) |
| `--accent-bright` | `#0095F6` | Non-text accents only: active ring, focus halo, chart primary, progress |
| `--accent-soft` | `#E6F3FE` | Selected backgrounds |
| `--like` | `#ED4956` | Filled heart icon (non-text only) |
| `--success` | `#12805C` | Resolved, positive trend |
| `--warning` | `#B7791F` | Pending, escalated |
| `--danger` | `#C8323C` | Destructive actions, removed, negative trend |

Chart palette (also distinguish with labels or patterns, never color alone): `#0095F6`, `#0E8F8F`, `#B7791F`, `#6D4FD1`, `#ED4956`, `#737373`.

### 8.2 Typography

- Use the **system UI font stack** for an Instagram-like native feel and zero font download: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Expose it as `--font-body` in `globals.css`.
- Sizes (px): 12 (meta, timestamps), 14 (default feed text, buttons, nav labels), 16 (form inputs on mobile, to prevent iOS zoom), 20 (section titles), 24 (page titles), 28 (profile username on desktop). Weights: 400 body, 600 usernames/buttons/headings. Line-height 1.4 for UI text, 1.5 for captions.
- Usernames are semibold; captions render as `**username** caption text` inline, like Instagram.
- Post body line length <= 68ch on wide containers.
- `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs.
- `font-variant-numeric: tabular-nums` on numbers in tables, stat cards, profile counts, and charts.
- Use the single character `…` (not `...`), curly quotes, and non-breaking spaces between numbers and units (`5&nbsp;MB`).

### 8.3 Layout, Breakpoints and Responsiveness

Mobile-first CSS: base styles target the smallest screen; layers are added with `min-width` breakpoints.

| Name | Min width | Layout |
|---|---|---|
| base | 0 (design from 320px) | Single column; sticky **top bar**; fixed **bottom tab bar** with 5 icons; full-width content |
| `sm` | 480px | Larger paddings; profile header switches to avatar-left layout |
| `md` | 768px | Bottom bar replaced by a **left icon-only sidebar** (72px); feed column centered |
| `lg` | 1024px | Right rail appears (suggested accounts, top tags from DB); post detail opens as a two-pane dialog |
| `xl` | 1264px | Left sidebar expands to **icons + labels** (244px) |

Rules:
- Feed column max width **470px** (like Instagram); profile and explore containers max **935px**; center everything with `mx-auto`.
- 4px spacing grid. Radii: 8px buttons/inputs, 12px dialogs, 4px chips, 999px avatars. Cards have no heavy shadow; separate posts with a 1px `--line` divider.
- Use flexbox/grid, `min-w-0` on flex children, `dvh`/`svh` for full-height layouts (never `100vh` alone on mobile), and `env(safe-area-inset-*)` for the top bar and bottom tab bar (`viewport-fit=cover`).
- Sticky top/bottom bars must never cover focused elements (`scroll-margin-top` / `scroll-padding`).
- **Touch targets >= 44x44px** for all tappable elements (use padding around 24px icons).
- Inputs use `font-size: 16px` on mobile. Never disable zoom.
- Images: `aspect-ratio` boxes with `next/image`, `sizes` attribute per breakpoint (`(min-width: 768px) 470px, 100vw`), explicit `width`/`height`, and `object-fit: cover`.
- Prefer **container queries** for components that live in different column widths (post card, stat card, chart card).
- Tables: scroll horizontally inside an `overflow-x-auto` container on tablet; on `< 768px` render as stacked cards (label/value pairs) for report queues, user lists, and top-N tables.
- Charts: `ResponsiveContainer`, fewer axis ticks and shorter labels on mobile, legend below the chart on mobile.
- Dialogs become **bottom sheets** on `< 768px` (slide up, drag handle optional, close button and Esc/backdrop always available) and centered dialogs on `>= 768px`.
- Back office: the sidebar becomes a slide-in **drawer** on `< 1024px` opened from a menu button; widget grid is 1 column (base), 2 columns (`md`), 4 to 12 columns (`lg`+).
- No horizontal page scroll at any width. Support portrait and landscape and 200 percent browser zoom without loss of content.
- Required test widths before sign-off: **320, 360, 390, 430, 768, 820, 1024, 1280, 1440, 1920**.

### 8.4 Components and States

Every interactive component defines: default, hover, active, `:focus-visible`, disabled, loading, error.

- **Buttons:** `<button>` for actions, `<Link>` for navigation. Labels are specific and Title Case per Vercel guidelines ("Publish Post", "Save Profile", "Escalate to Admin"). Submit buttons stay enabled until the request starts, then show a spinner and "Saving…".
- **Forms:** every input has a `<label>`, correct `type`, `name`, `autocomplete`, `inputmode`; placeholders end with `…` and show an example ("e.g. campus_news…"); errors appear inline next to the field and focus moves to the first invalid field; never block paste; `spellCheck={false}` for email/username.
- **Destructive actions** (delete post, suspend user, remove content): confirmation dialog with a specific label and consequence text, or an undo toast. Never immediate.
- **Toasts** are announced with `aria-live="polite"`.
- **Empty states** explain what is missing and provide the next action ("No posts yet. Follow accounts or publish your first post.").
- **Error states** say what happened and how to fix it ("Could not load reports. Check your connection and try again." with a Retry button). No apologies, no vague text.
- **Long content:** post titles use `line-clamp-2`; usernames `truncate` with `min-w-0` on flex children; comments use `break-words`; handle 1-character and 5,000-character inputs.
- **Avatars:** `next/image` with fixed size and a text-initial fallback derived from `display_name`.
- **Numbers/dates:** `Intl.NumberFormat` (compact for counts: 1.2K) and `Intl.DateTimeFormat`/`Intl.RelativeTimeFormat`. No hard-coded formats.
- **URL as state:** filters, tabs, date range, search query, pagination live in the URL query (use `nuqs` or `useSearchParams` + `router.replace`). Links support Cmd/Ctrl-click.

### 8.5 Accessibility (WCAG 2.2 AA target)

- Skip link to `#main`; single `<h1>` per page; hierarchical headings.
- Icon-only buttons have `aria-label` (and a `title` tooltip on desktop); decorative icons `aria-hidden="true"`. Icon state is never the only signal: liked/followed state also changes `aria-pressed` and the text/count.
- Never `outline: none` without a visible `:focus-visible` replacement (2px accent ring with 2px offset).
- Contrast: text >= 4.5:1, large text/icons >= 3:1. Status badges pair color with text and an icon.
- Charts have an accessible summary (`aria-label`/`<figcaption>`) and a "View as table" toggle exposing the same data.
- Full keyboard support for menus, dialogs (focus trap, Esc to close, return focus), tabs, and tables.
- Do not disable zoom (`user-scalable=no` is forbidden). Add `touch-action: manipulation`.
- `overscroll-behavior: contain` in modals and drawers.
- Set `<meta name="theme-color" content="#FFFFFF">` and `color-scheme: light`.
- Gesture alternatives: double-tap to like and swipe gestures always have a visible button/keyboard equivalent.
- Wrap brand names and code tokens with `translate="no"`.

### 8.6 Instagram-Style Screen Patterns

Map each screen to these patterns. All data shown is read from the database (section 3).

**App shell**
- Mobile: sticky top bar (wordmark left; `Bell` and `SquarePlus` icon buttons right) and fixed bottom tab bar with five icon tabs: Home (`House`), Search (`Search`), Create (`SquarePlus`), Notifications (`Heart` or `Bell`), Profile (avatar). Active tab uses a filled/heavier icon and `aria-current="page"`. Guests see Home, Search, and a Sign In prompt in place of restricted tabs.
- Desktop: left vertical sidebar with the same destinations plus More menu (`Menu`): Settings (`Settings`), Sign Out (`LogOut`), and role-based entries **Moderation** (`ShieldCheck`, moderators and admins) and **Admin** (`LayoutDashboard`, admins). Notifications open as a slide-out panel from the sidebar.
- Right rail (`lg`+): current user mini-profile, "Suggested for You" (accounts from DB, excludes followed), "Trending Tags" (from DB), small footer links.

**Home feed**
- Optional horizontal "Following" rail of circular avatars (accounts you follow with recent posts; solid `--accent-bright` ring when there are posts newer than your last visit). Data from DB. Hidden when the user follows no one.
- Vertical list of post cards, single column, 470px max, infinite scroll (SWR infinite + IntersectionObserver) with a "Load More" button fallback for keyboard users.
- Guests see the public feed sorted by recency; signed-in users see followed accounts plus a "Latest" tab (tabs use the shared underline pattern).

**Post card anatomy (top to bottom)**
1. Header: 32px avatar, bold username (link), relative time in muted text, `Ellipsis` menu (report, copy link, edit/delete for the author, moderation actions for moderators).
2. Media: image at 4:5 max (or 1:1) with `object-fit: cover`; posts without an image render a text card (title and body) with the same footprint rules. Double-tap on media likes (with a brief heart burst; also available via button).
3. Action row: `Heart` (like), `MessageCircle` (comments), `Send` (share). Icons 24px, 44px hit areas, counts in muted text beside or below.
4. "1,234 likes" (Intl compact formatting), then caption line: bold username followed by body text clamped to 2 lines with a "more" button that expands.
5. Hashtags rendered as accent links to tag pages (parsed to React nodes, not HTML).
6. "View all 12 comments" link and the latest one or two comments inline.
7. Relative timestamp and an inline "Add a comment…" input with a "Post" text button that activates when non-empty (desktop). On mobile, tapping comments opens a bottom sheet or the post page.

**Post detail**
- `lg`+: dialog with two panes over the feed (image/body left, header + scrollable comment thread + actions + comment input right), implemented with Next.js intercepting routes (`@modal/(.)p/[postId]`); the real URL is shareable and opens a full page when loaded directly.
- Below `lg`: regular full page with a back button (`ChevronLeft`).

**Profile**
- Header: 150px avatar on desktop, 77px on mobile; username, Follow/Following or Edit Profile button, and for moderators an action menu; counts row (posts, followers, following) with tabular numbers; display name bold; bio; links to lists in dialogs.
- Tabs: Posts (`Grid3x3`) and Shares (`Repeat2`), underline indicator with `layoutId`.
- Grid: 3 columns, 1px-4px gaps, square tiles; hover/focus overlay (desktop) shows like and comment counts with icons; text-only posts render a text tile. Tiles are links to the post detail.

**Explore and Search**
- Search input with `Search` icon and clear button (`X`). Results tabs: Accounts, Tags, Posts. Recent searches come from the user's own history table only if the team adds one; otherwise omit.
- Explore: masonry-like grid (3 columns) of top posts by engagement from `stats_top_posts` style queries (public-safe version), infinite scroll.

**Compose (Create)**
- Dialog/bottom sheet titled "Create New Post": Step 1 choose image (optional, `ImagePlus`), Step 2 title/body and tags, Step 3 review and "Share". Uses the signed upload URL flow. Draft is preserved on accidental close with a confirmation.

**Notifications**
- List with avatar, sentence, relative time, and a small post thumbnail when relevant; unread items marked with a dot and `aria-label`; grouped as Today / This Week / Earlier. Follow-request style actions are not needed (no private accounts in scope).

**Auth screens**
- Centered card (max 350px) with wordmark, email, password, primary full-width button, divider, secondary link between Sign In and Sign Up; inline validation.

**Reports**
- Report flow is a dialog with radio options (reason list from constants), optional details, and a Submit Report button; success shows a confirmation state, not a toast alone.

**Moderation and Admin**
- Same visual language (white, thin borders, blue actions) in the dashboard layout from section 11; report queue rows show reporter, target, reason chip with icon, age, and Review button.

### 8.7 Icons: Lucide (Required)

#### 8.7.1 Rules
- The **only** icon source is `lucide-react`. No other icon packages, no icon fonts, no emoji, no pasted third-party SVG (except the project wordmark/logo, which is the project's own asset).
- Pin an exact version in `package.json` (no `^`) and upgrade deliberately. Lucide renames icons across releases (aliases usually exist). After installing, verify every icon name used exists in the installed version with a script (8.7.5) and prefer canonical names from https://lucide.dev/icons.
- Import as named imports in the file that uses them: `import { Heart, MessageCircle } from "lucide-react";`. Keep `optimizePackageImports` configured. Do not create a shared re-export barrel.
- Icons are outline by design. Express an active/selected state by changing `fill`, `strokeWidth`, or color (see 8.7.3), never by swapping to emoji or a different library.

#### 8.7.2 Sizing and Style Tokens
- Sizes: 16px (inline meta), 20px (buttons, table actions), 24px (nav and post actions, default), 32px (empty states), 48px (large empty states).
- Default `strokeWidth={1.75}` (use `2` for active nav items). Color is inherited via `currentColor`; set color with text utility classes, not the `color` prop.
- Icons paired with text use a 8px gap and `aria-hidden="true"`; icon-only controls use a wrapper `<button>` with `aria-label`.
- Create one small `Icon`-agnostic `IconButton` component (`components/ui/icon-button.jsx`) that enforces: `type="button"`, 44px minimum hit area, `aria-label` required (throw in development if missing), visible `:focus-visible` ring, and optional `aria-pressed`.

```jsx
// components/ui/icon-button.jsx
"use client";
export function IconButton({ label, pressed, className = "", children, ...props }) {
  if (process.env.NODE_ENV !== "production" && !label) throw new Error("IconButton requires a label");
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

```jsx
// example: like button (leaf client component)
import { Heart } from "lucide-react";
<IconButton label={liked ? "Unlike" : "Like"} pressed={liked} onClick={onToggle}>
  <Heart
    size={24}
    strokeWidth={1.75}
    aria-hidden="true"
    className={liked ? "text-[var(--like)]" : "text-[var(--ink)]"}
    fill={liked ? "currentColor" : "none"}
  />
</IconButton>
```

#### 8.7.3 Semantic Icon Map (Use These Consistently)

One meaning = one icon across the whole app. Verify names against the installed version.

| Meaning | Lucide icon | Notes |
|---|---|---|
| Home | `House` | Filled state: `fill="currentColor"` when active |
| Search | `Search` | Clear input: `X` |
| Create post | `SquarePlus` | Attach image: `ImagePlus` |
| Notifications | `Bell` | Or `Heart` for the activity tab; unread dot is a separate element |
| Profile / account | `User`, `UserRound` | Avatar is preferred in the tab bar |
| Like | `Heart` | Filled with `--like` when active |
| Comment | `MessageCircle` | |
| Share | `Send` | Share with note: `Repeat2` for the Shares tab |
| Follow / Unfollow | `UserPlus` / `UserCheck` | |
| More menu | `Ellipsis` | |
| Report | `Flag` | |
| Hide content | `EyeOff` | Restore: `Eye` |
| Remove / delete | `Trash2` | Confirmation required |
| Suspend user | `Ban` | Restore: `UserCheck` |
| Edit | `Pencil` | |
| Hashtag | `Hash` | |
| Settings | `Settings` | |
| Sign out | `LogOut` | Sign in: `LogIn` |
| Back / next | `ChevronLeft` / `ChevronRight` | Disclosure: `ChevronDown` / `ChevronUp` |
| Close | `X` | |
| Copy link | `Link` | Success: `Check` |
| Grid tab | `Grid3x3` | |
| Moderation | `ShieldCheck` | |
| Admin dashboard | `LayoutDashboard` | |
| Users (stat) | `Users` | |
| Posts (stat) | `FileText` | |
| Engagement (stat) | `Activity` | |
| Trend up / down | `TrendingUp` / `TrendingDown` | Always paired with the value and sign |
| Charts | `ChartLine`, `ChartColumn`, `ChartPie` | Older versions: `LineChart`, `BarChart3`, `PieChart`; check the installed version |
| Reports pending | `Clock` | |
| Escalated | `ArrowUpRight` or `TriangleAlert` | Older versions: `AlertTriangle` |
| Resolved | `CircleCheck` | Older versions: `CheckCircle2` |
| Dismissed | `CircleX` | Older versions: `XCircle` |
| Audit log | `ScrollText` | |
| Date range | `CalendarDays` | |
| Export | `Download` | |
| Refresh | `RefreshCw` | |
| Info tooltip | `Info` | |
| Loading spinner | `LoaderCircle` with CSS spin | Older versions: `Loader2`; spin stops under reduced motion |
| Error | `CircleAlert` | Older versions: `AlertCircle` |
| Menu (mobile drawer) | `Menu` | |
| Empty states | `ImageOff`, `SearchX`, `Inbox`, `MessageCircleOff` | Sized 48px, muted color |

Status badges combine icon, text, and color (for example `Clock` + "Pending", `TriangleAlert` + "Escalated", `CircleCheck` + "Resolved").

#### 8.7.4 No-Emoji Policy (Web Pages)
- No emoji characters (Unicode Emoji, Extended_Pictographic) anywhere in rendered pages or shipped strings: UI copy (`copy.js`), buttons, headings, toasts, empty and error states, `<title>` and meta tags, Open Graph text, alt text, aria labels, notification sentences, email templates, seed data, and code comments in the UI code.
- Favicon and PWA icons are image files (SVG/PNG/ICO) generated from the project wordmark. Never pass an emoji as a favicon.
- No emoji picker in the composer. User-generated text: `constants.js` exports `ALLOW_EMOJI_IN_USER_CONTENT = false`. When false, server-side zod validation rejects text matching `/\p{Extended_Pictographic}/u` with the message "Emoji are not supported. Remove them and try again." Set the flag to `true` only if the product owner decides to permit emoji in user content.
- Enforce with a repository check: `scripts/check-no-emoji.mjs` scans `src/**`, `public/**` (text files), and `supabase/seed.sql` for `\p{Extended_Pictographic}` and fails CI when found. Run it in `prebuild`.

```js
// scripts/check-no-emoji.mjs (excerpt)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const EMOJI = /\p{Extended_Pictographic}/u;
const exts = new Set([".js", ".jsx", ".css", ".html", ".md", ".json", ".sql", ".svg"]);
let failed = false;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) { if (!["node_modules", ".next", ".git"].includes(name)) walk(path); continue; }
    if (![...exts].some((e) => name.endsWith(e))) continue;
    readFileSync(path, "utf8").split("\n").forEach((line, i) => {
      if (EMOJI.test(line)) { console.error(`${path}:${i + 1} contains emoji`); failed = true; }
    });
  }
}
["src", "public", "supabase"].forEach((d) => { try { walk(d); } catch {} });
process.exit(failed ? 1 : 0);
```

Note: the check also flags `skill.md`-style docs only if you point it at them; keep it scoped to shipped code and assets.

#### 8.7.5 Icon Name Verification

Run after every dependency upgrade and in CI (`scripts/check-icons.mjs`): scan `src/**` for `import { ... } from "lucide-react"`, collect names, and assert each exists in `lucide-react` exports (`import * as icons from "lucide-react"`). Fail the build if a name is missing (a renamed icon would otherwise render nothing).

#### 8.7.6 Performance and Accessibility
- Icons are inline SVG; do not lazy-load individual icons. Do not import the whole namespace (`import * as icons`) in app code except in the verification script.
- Do not animate the SVG element directly; animate a wrapping `span`/`m.span` (Framer Motion rule).
- Provide text alternatives: icon-only control gets `aria-label`; decorative icon next to text gets `aria-hidden="true"`; meaningful standalone icons inside non-interactive elements get `role="img"` and `aria-label`.

### 8.8 Responsive QA Checklist (per Screen)
- Renders correctly at every width in section 8.3 with no horizontal scroll or clipped content.
- Bottom tab bar and top bar respect safe areas; content is not hidden behind them (add matching padding to the scroll container).
- All tap targets >= 44px; no hover-only functionality (hover info also available on focus/tap).
- Dialogs and sheets are usable with the on-screen keyboard open (inputs remain visible; use `dvh`).
- Images do not cause layout shift; skeletons match final size at each breakpoint.
- Long usernames, long captions, 5,000-character bodies, and 0-result lists are handled.
- Tested on iOS Safari and Android Chrome (or emulation) and desktop Chrome, Firefox, Safari.

