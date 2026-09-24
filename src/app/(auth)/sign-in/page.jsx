"use client";
import { Suspense, useState, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { CircleAlert } from "lucide-react";
import { COPY } from "@/lib/copy";

function SignInContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  const [state, formAction, isPending] = useActionState(signInAction, null);
  const [email, setEmail] = useState("");
  const [emailClientError, setEmailClientError] = useState("");

  const validateEmail = (val) => {
    const trimmed = val.trim();
    if (!trimmed) {
      return "Email is required";
    }
    if (!trimmed.includes("@")) {
      return `Please include an '@' in the email address. '${trimmed}' is missing an '@'.`;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (emailClientError) {
      setEmailClientError(validateEmail(val));
    }
  };

  const handleEmailBlur = () => {
    setEmailClientError(validateEmail(email));
  };

  const handleSubmit = (e) => {
    const err = validateEmail(email);
    if (err) {
      e.preventDefault();
      setEmailClientError(err);
    }
  };

  const emailError = emailClientError || state?.fieldErrors?.email;
  const passwordError = state?.fieldErrors?.password;

  return (
    <div className="flex min-h-[80dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-[380px] bg-white border border-[#DBDBDB] rounded-2xl p-8 shadow-xs">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#262626]">
            {COPY.appName}
          </h1>
          <p className="text-sm text-[#737373] mt-1.5 font-normal">
            Sign in to follow news and share updates
          </p>
        </div>

        {state?.error && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 mb-5 rounded-lg bg-red-50/40 border border-[#C8323C] text-xs font-medium text-[#C8323C]"
          >
            <CircleAlert size={16} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {/* noValidate disables HTML5 browser default popups completely */}
        <form noValidate onSubmit={handleSubmit} action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-[#262626] tracking-tight">
              {COPY.auth.email}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              autoComplete="email"
              spellCheck={false}
              placeholder="name@domain.com"
              className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 bg-white text-[#262626] placeholder:text-[#8E8E8E] ${
                emailError
                  ? "border-[#C8323C] bg-red-50/20 focus-visible:outline-[#C8323C]"
                  : "border-[#DBDBDB] hover:border-[#737373] focus:border-[#0095F6] focus-visible:outline-[#0095F6]"
              }`}
            />
            {emailError && (
              <span className="text-xs font-medium text-[#C8323C] mt-0.5">
                {emailError}
              </span>
            )}
          </div>

          {/* Password input - No character count requirement on login */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-[#262626] tracking-tight">
              {COPY.auth.password}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 bg-white text-[#262626] placeholder:text-[#8E8E8E] ${
                passwordError
                  ? "border-[#C8323C] bg-red-50/20 focus-visible:outline-[#C8323C]"
                  : "border-[#DBDBDB] hover:border-[#737373] focus:border-[#0095F6] focus-visible:outline-[#0095F6]"
              }`}
            />
            {passwordError && (
              <span className="text-xs font-medium text-[#C8323C] mt-0.5">
                {passwordError}
              </span>
            )}
          </div>

          <Button
            type="submit"
            disabled={isPending}
            loading={isPending}
            className="w-full mt-2 font-semibold bg-[#0095F6] !text-white active:!text-white focus:!text-white hover:bg-[#0074CC]"
          >
            {isPending ? "Signing in..." : COPY.auth.signIn}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#DBDBDB] text-center text-xs text-[#737373]">
          {COPY.auth.noAccount}{" "}
          <Link
            href="/register"
            className="font-semibold text-[#0095F6] hover:underline focus-visible:outline-2 focus-visible:outline-[#0095F6] rounded ml-1"
          >
            Register
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
