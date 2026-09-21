"use client";
import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CircleAlert } from "lucide-react";
import { COPY } from "@/lib/copy";

function SignInContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  const [state, formAction, isPending] = useActionState(signInAction, null);

  return (
    <div className="flex min-h-[80dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-[360px] bg-[var(--bg)] border border-[var(--line)] rounded-xl p-8 shadow-xs">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">
            {COPY.appName}
          </h1>
          <p className="text-xs text-[var(--ink-muted)] mt-1">
            Sign in to follow news and share updates
          </p>
        </div>

        {state?.error && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-[var(--surface)] border border-[var(--danger)] text-xs text-[var(--danger)]"
          >
            <CircleAlert size={16} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-3.5">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
              {COPY.auth.email}
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="e.g. name@domain.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
              {COPY.auth.password}
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full mt-2">
            {isPending ? "Signing in..." : COPY.auth.signIn}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[var(--line)] text-center text-xs text-[var(--ink-muted)]">
          {COPY.auth.noAccount}{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] rounded"
          >
            {COPY.auth.signUp}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80dvh] items-center justify-center" />}>
      <SignInContent />
    </Suspense>
  );
}
