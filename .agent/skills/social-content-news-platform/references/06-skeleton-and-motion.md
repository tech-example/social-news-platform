## 9. Skeleton Loading (Required)

Skeletons are mandatory for every asynchronous surface. They must match the final layout (same dimensions) so nothing shifts when data arrives.

### 9.1 Where

| Surface | Mechanism |
|---|---|
| Route transitions | `loading.jsx` per route group, rendering that page's skeleton layout |
| Server-rendered widgets | `<Suspense fallback={<XSkeleton/>}>` around each async Server Component |
| Infinite feed "load more" | Append 3 `PostCardSkeleton` items while SWR is fetching next page |
| Charts (dynamic import) | `next/dynamic` `loading: () => <ChartSkeleton/>` |
| Tables | `TableSkeleton rows={pageSize}` |
| Notifications dropdown | `NotificationItemSkeleton` x 5 |
| Profile header, post detail, comment thread | Dedicated skeletons |

### 9.2 Required Skeleton Components

`Skeleton` (base), `PostCardSkeleton`, `FeedSkeleton`, `ProfileHeaderSkeleton`, `CommentThreadSkeleton`, `NotificationItemSkeleton`, `StatCardSkeleton`, `ChartSkeleton` (axes + faint bars/line), `BarListSkeleton`, `TableSkeleton`, `ReportCardSkeleton`, `SidebarSkeleton`, `DashboardSkeleton` (composition of the above matching the dashboard grid), `ProfileGridSkeleton` (3-column square tiles), `AvatarRailSkeleton` (row of circles), `SuggestionListSkeleton`, `PostDialogSkeleton` (two-pane on desktop, single pane on mobile). Skeleton shapes follow the Instagram-style layout: circle avatar, short username bar, square/4:5 media block, icon row placeholders, caption lines.

### 9.3 Implementation Notes

```jsx
// components/ui/skeleton.jsx
export function Skeleton({ className = "", ...props }) {
  return <div aria-hidden="true" className={`skeleton rounded-md ${className}`} {...props} />;
}
```

```css
/* globals.css */
.skeleton {
  background: linear-gradient(90deg, var(--surface) 25%, var(--surface-strong) 37%, var(--surface) 63%);
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.4s ease infinite;
}
@keyframes skeleton-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
```

- Wrap a skeleton region with `role="status"` and a visually hidden "Loading…" (or set `aria-busy="true"` on the container) so assistive tech gets one announcement.
- Skeleton dimensions come from shared constants (avatar 40px, stat card height, chart height 280px) reused by the real components to prevent layout shift.
- Show a skeleton immediately; do not delay it artificially. Fade content in (opacity only) when data arrives.
- Never show skeletons forever: on error, swap to the error state with Retry.

## 10. Motion Guidelines (motion-framer)

Motion is purposeful, short, and interruptible. Use it to show what changed, not as decoration. Animate `transform` and `opacity` only. Never `transition: all`.

### 10.1 Setup

```jsx
// components/motion/motion-provider.jsx
"use client";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";

export function MotionProvider({ children }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 300, damping: 30 }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
```

Use `m.div` (not `motion.div`) inside `LazyMotion` to keep the bundle small. `reducedMotion="user"` honors `prefers-reduced-motion`.

### 10.2 Approved Patterns

| Pattern | API | Notes |
|---|---|---|
| Dashboard load | Parent `variants` with `staggerChildren: 0.05`, children `opacity 0->1, y 8->0` | One orchestrated entrance per page, first render only |
| Feed list | `AnimatePresence` + keyed `m.li` (`initial`/`animate`/`exit`) | New post slides in; deleted post fades and collapses |
| Like / follow feedback | `whileTap={{ scale: 0.92 }}` and a brief scale-up on the icon when toggled | Answers a user action |
| Tabs / filters underline | `layoutId="tab-underline"` | Use sparingly; `layoutId` is global |
| Dialogs, dropdowns, toasts | `AnimatePresence` + `initial`/`animate`/`exit` with opacity + y (8px) | Exit must complete before unmount |
| Report status changes | `layout="position"` on the timeline items | Only in the report detail view |
| Number counters | `useSpring` + `useTransform` on stat values | Duration under 600 ms, skipped under reduced motion |
| Skeleton -> content | Opacity fade-in only (150 ms) | No slide, avoids layout shift |
| Double-tap like | Heart icon in a wrapper `m.span`: scale 0.6 -> 1.2 -> 1 with opacity fade, 600 ms max | Uses a Lucide `Heart` (no emoji); also triggered by the Like button |
| Bottom sheet (mobile dialogs) | `m.div` with `y: "100%" -> 0`, spring; drag-to-dismiss optional with a visible Close button | Reduced motion: fade only |
| Post dialog (desktop) | Fade + scale 0.98 -> 1 (150 ms) | Backdrop opacity only |

### 10.3 Rules

- Duration 120-250 ms for UI feedback; spring `stiffness 300, damping 30` default; entrance sequences <= 600 ms total.
- Do **not** animate every card on hover or every section on scroll. `whileInView` is allowed only for the first dashboard load, with `viewport={{ once: true }}`.
- Every animation must be interruptible (rely on springs / `animate` prop state, not blocking timelines).
- No autoplay looping motion apart from skeleton shimmer (which stops under reduced motion).
- Set correct `transform-origin`; for SVG, animate a wrapping `<g>`/`div` rather than the SVG element.
- Provide static equivalents when reduced motion is on (final state rendered immediately).
- Keep layout animations (`layout`) off long lists.

