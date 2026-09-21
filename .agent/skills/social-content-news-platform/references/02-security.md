## 4. Security Architecture (API Key Hiding)

### 4.1 Threat Model

Anything shipped to the browser (JS bundles, HTML, `NEXT_PUBLIC_*`) is public. Secrets must stay on the server. The database must stay safe even if the server layer has a bug (defense in depth).

### 4.2 Architecture - Backend-for-Frontend (BFF)

```text
Browser (React UI, no keys)
   |  HTTPS, httpOnly session cookie only
   v
Vercel: Next.js server layer  <-- holds SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
   |  Server Components / Server Actions / Route Handlers
   v
Supabase (Postgres + Auth + Storage) with Row Level Security enabled on every table
```

Principles:
- The browser talks **only** to the Next.js app. It never talks to `*.supabase.co` directly.
- Session is an **httpOnly, Secure, SameSite=Lax** cookie managed on the server by `@supabase/ssr`. No tokens in `localStorage`.
- Do **not** create a browser Supabase client. Do **not** install `NEXT_PUBLIC_SUPABASE_*` variables.
- Realtime features (notifications) use server-side polling via SWR against a Route Handler, not a browser WebSocket to Supabase.

### 4.3 Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `SUPABASE_URL` | server only | Supabase project URL |
| `SUPABASE_ANON_KEY` | server only | Used by the server to create user-scoped clients (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only, **highest risk** | Bypasses RLS; used only in `src/server/admin-client.js` for admin/moderation/system tasks after an explicit role check |
| `SITE_URL` | server | Absolute site URL for redirects and email links |
| `BOOTSTRAP_ADMIN_EMAIL` | local/CI script only | Used by the one-time admin bootstrap script; do not set on Vercel runtime |

Rules:
- Names must **not** start with `NEXT_PUBLIC_`.
- Validate at boot in `src/server/env.js` with zod; fail fast with a clear error.
- Commit `.env.example` with keys and empty values. `.gitignore` must contain `.env*` (except `.env.example`).

`src/server/env.js`:

```js
import "server-only";
import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SITE_URL: z.string().url(),
});

export const env = schema.parse({
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SITE_URL: process.env.SITE_URL,
});
```

### 4.4 Server-Only Modules

Every file that touches keys or the database starts with `import "server-only";` so the build fails if a Client Component imports it.

`src/server/supabase.js` (user-scoped client, RLS enforced):

```js
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/server/env";

export async function createUserClient() {
  const cookieStore = await cookies();
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; middleware refreshes the session.
        }
      },
    },
  });
}
```

`src/server/admin-client.js` (service role - use sparingly):

```js
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/server/env";

let client;
export function getAdminClient() {
  client ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
```

Use the admin client **only** for: role changes, suspending users, deleting users, cross-user moderation actions, aggregated dashboard queries that RLS would block, and audit-log writes. Always call `requireRole()` first.

### 4.5 Authorization Layer (Data Access Layer)

Create `src/server/auth.js`:

```js
import "server-only";
import { cache } from "react";
import { createUserClient } from "@/server/supabase";

export const getSession = cache(async () => {
  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser(); // validates JWT with Supabase, not just the cookie
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, role, is_suspended")
    .eq("id", user.id)
    .single();
  if (!profile || profile.is_suspended) return null;
  return { user, profile };
});

const RANK = { user: 1, moderator: 2, admin: 3 };

export async function requireRole(minRole = "user") {
  const session = await getSession();
  if (!session) throw new AuthError("UNAUTHENTICATED");
  if (RANK[session.profile.role] < RANK[minRole]) throw new AuthError("FORBIDDEN");
  return session;
}

export class AuthError extends Error {
  constructor(code) { super(code); this.code = code; }
}
```

Every Server Action follows this order: **validate input (zod) -> authenticate -> authorize (role + ownership) -> mutate -> audit (if privileged) -> revalidate**.

```js
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth";
import { createUserClient } from "@/server/supabase";

const schema = z.object({ postId: z.string().uuid() });

export async function toggleLike(input) {
  const { postId } = schema.parse(input);          // 1 validate
  const { profile } = await requireRole("user");   // 2 authenticate + 3 authorize
  const supabase = await createUserClient();       // RLS also enforces ownership
  const { error } = await supabase.rpc("toggle_like", { p_post_id: postId });
  if (error) return { ok: false, message: "Could not update like. Try again." };
  revalidatePath("/");
  return { ok: true };
}
```

### 4.6 Row Level Security (Defense in Depth)

- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` on **every** table in `public`.
- Default deny. Add explicit policies (section 6.4).
- Never expose `service_role` to policies as a shortcut; policies must be correct for the anon/authenticated roles.
- Sensitive columns (`role`, `is_suspended`) cannot be updated by users - enforced by a trigger (section 6.5), not just UI.

### 4.7 Additional Hardening Checklist

- Security headers in `next.config.mjs`: `Content-Security-Policy` (default-src 'self'; img-src 'self' data: and the Supabase Storage host via image proxy or `remotePatterns`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy`.
- CSRF: Server Actions are same-origin by default; do not disable Origin checks. Route Handlers that mutate must verify `Origin` and require a session.
- Rate limiting for sign-in, sign-up, post, comment, report actions (use a small `rate_limits` table with a SQL function, or an external limiter if the team adds one). Return HTTP 429 with a friendly message.
- Sanitize user-generated text on output (React escapes by default; never use `dangerouslySetInnerHTML` for user content). Render hashtags/mentions by parsing to React nodes, not HTML strings.
- Uploads: server issues a signed upload URL for Supabase Storage after checking role, mime type (`image/jpeg|png|webp`) and size (<= 5 MB). Bucket is private or public-read by design; write only via server.
- Password rules: minimum 8 characters; rely on Supabase Auth for hashing and breach protection settings.
- Logging: never log tokens, cookies, keys, or full request bodies.
- Add a CI check (section 12.5) that fails if the service-role key or the string `service_role` appears in `.next/static`.
- If a key is ever committed or leaked: rotate it in Supabase immediately, update Vercel env, redeploy, and clean git history.

