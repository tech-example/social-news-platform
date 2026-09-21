## 12. GitHub -> Vercel Deployment

### 12.1 Repository

- One GitHub repository. `main` = production, feature branches = preview deployments.
- Branch protection on `main`: PR required, CI (lint + build + secret scan) must pass.
- `.gitignore` includes `.env*`, `.next`, `node_modules`, `.vercel`, `supabase/.temp`. Keep `.env.example`.
- Enable GitHub secret scanning and push protection.
- Conventional commits (`feat:`, `fix:`, `chore:`).

### 12.2 Vercel Setup

1. In Vercel: **Add New -> Project -> Import Git Repository** (the GitHub repo). Framework preset: Next.js.
2. **Settings -> Environment Variables**: add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL` for **Production**, **Preview** and **Development** (use a separate Supabase project for Preview if possible). Mark sensitive values as *Sensitive*. Do not prefix with `NEXT_PUBLIC_`.
3. Region: choose the Vercel Function region closest to the Supabase region to cut latency.
4. Enable Deployment Protection for preview URLs if the project is not public.
5. Each push to a branch creates a preview; merging to `main` deploys production.

### 12.3 Supabase Setup

1. Create the project; note URL and keys (keep keys out of chat, screenshots, and Git).
2. Auth: enable Email + Password; set Site URL and Redirect URLs to the Vercel domains; configure email templates and (optionally) email confirmation.
3. Run migrations with the CLI: `supabase link` then `supabase db push`.
4. Storage: create bucket `post-images` (public read, server-only write via signed URLs) and `avatars`.
5. Turn on RLS everywhere (verify with `select tablename from pg_tables where schemaname='public' and rowsecurity=false;` -> must return nothing).
6. Run `node scripts/bootstrap-admin.mjs` locally once (with `BOOTSTRAP_ADMIN_EMAIL` set) after the admin has signed up, to promote that account.

### 12.4 `next.config.mjs` (Excerpt)

```js
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Add a Content-Security-Policy tuned to your assets; test with report-only first.
];

export default {
  experimental: { optimizePackageImports: ["lucide-react", "recharts", "framer-motion"] },
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }] },
  async headers() { return [{ source: "/(.*)", headers: securityHeaders }]; },
};
```

### 12.5 CI Secret Guard

`scripts/check-secrets.mjs` runs after `next build` and fails the pipeline if any file in `.next/static` contains the service-role key value, the anon key value, the Supabase URL host followed by `/rest/v1`, or the strings `service_role` / `SUPABASE_SERVICE_ROLE_KEY`. Add to `package.json`: `"postbuild": "node scripts/check-secrets.mjs"`. Also run a "Network tab check" manually: the browser must only ever call your own domain.

### 12.6 Definition of a Safe Deploy

- No `NEXT_PUBLIC_` secrets. Bundle scan passes.
- RLS enabled on all tables; policies tested for each role (guest, user, moderator, admin) and for cross-user access attempts.
- Env vars set in Vercel for all environments; keys rotated if ever exposed.
- Supabase redirect URLs match deployed domains.
- Smoke test on Preview before promoting.

