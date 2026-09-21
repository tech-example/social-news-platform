"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signUpAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CircleAlert, CircleCheck } from "lucide-react";
import { COPY } from "@/lib/copy";

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, null);

  return (
    <div className="flex min-h-[80dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-[360px] bg-[var(--bg)] border border-[var(--line)] rounded-xl p-8 shadow-xs">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">
            {COPY.appName}
          </h1>
          <p className="text-xs text-[var(--ink-muted)] mt-1">
            Create an account to join discussions and share news
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

        {state?.requiresConfirmation ? (
          <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
            <CircleCheck size={36} strokeWidth={2} aria-hidden="true" className="text-[var(--success)]" />
            <h2 className="text-sm font-semibold text-[var(--ink)]">Registration Successful</h2>
            <p className="text-xs text-[var(--ink-muted)]">{state.message}</p>
            <Link href="/sign-in" className="mt-3">
              <Button variant="secondary" className="text-xs">
                Go to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
                {COPY.auth.email} *
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="name@domain.com"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="username" className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
                Username *
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                spellCheck={false}
                placeholder="e.g. campus_reporter"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="displayName" className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
                Display Name *
              </label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="name"
                placeholder="e.g. John Doe"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
                {COPY.auth.password} (8+ chars) *
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" disabled={isPending} className="w-full mt-2">
              {isPending ? "Creating account..." : COPY.auth.signUp}
            </Button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-[var(--line)] text-center text-xs text-[var(--ink-muted)]">
          {COPY.auth.hasAccount}{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] rounded"
          >
            {COPY.auth.signIn}
          </Link>
        </div>
      </div>
    </div>
  );
}
