"use client";
import { useState, useActionState } from "react";
import Link from "next/link";
import { signUpAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { CircleAlert, CircleCheck } from "lucide-react";
import { COPY } from "@/lib/copy";

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

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
    if (emailError) {
      setEmailError(validateEmail(val));
    }
  };

  const handleEmailBlur = () => {
    setEmailError(validateEmail(email));
  };

  const handleSubmit = (e) => {
    const err = validateEmail(email);
    if (err) {
      e.preventDefault();
      setEmailError(err);
    }
  };

  return (
    <div className="flex min-h-[80dvh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-[380px] bg-white border border-[#DBDBDB] rounded-2xl p-8 shadow-xs">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#262626]">
            Create Account
          </h1>
          <p className="text-sm text-[#737373] mt-1.5 font-normal">
            Join the community to follow news and share stories
          </p>
        </div>

        {state?.error && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50/40 border border-[#C8323C] text-xs font-medium text-[#C8323C]"
          >
            <CircleAlert size={16} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {state?.requiresConfirmation ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
            <CircleCheck size={40} strokeWidth={2} aria-hidden="true" className="text-[#12805C]" />
            <h2 className="text-base font-semibold text-[#262626]">Registration Successful</h2>
            <p className="text-xs text-[#737373] max-w-xs leading-relaxed">{state.message}</p>
            <Link href="/sign-in" className="mt-2">
              <Button variant="secondary" className="text-xs bg-[#EFEFEF] text-[#262626] hover:bg-[#DBDBDB]">
                Go to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmit} action={formAction} className="flex flex-col gap-3.5">
            {/* Email */}
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-xs font-semibold text-[#262626] tracking-tight">
                {COPY.auth.email} *
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

            {/* Username */}
            <div className="flex flex-col gap-1">
              <label htmlFor="username" className="text-xs font-semibold text-[#262626] tracking-tight">
                Username *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                spellCheck={false}
                placeholder="e.g. campus_reporter"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border border-[#DBDBDB] bg-white text-[#262626] hover:border-[#737373] focus:border-[#0095F6] text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0095F6] placeholder:text-[#8E8E8E]"
                required
              />
            </div>

            {/* Display Name */}
            <div className="flex flex-col gap-1">
              <label htmlFor="displayName" className="text-xs font-semibold text-[#262626] tracking-tight">
                Display Name *
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="name"
                placeholder="e.g. John Doe"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border border-[#DBDBDB] bg-white text-[#262626] hover:border-[#737373] focus:border-[#0095F6] text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0095F6] placeholder:text-[#8E8E8E]"
                required
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-xs font-semibold text-[#262626] tracking-tight">
                {COPY.auth.password} (8+ characters) *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border border-[#DBDBDB] bg-white text-[#262626] hover:border-[#737373] focus:border-[#0095F6] text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0095F6] placeholder:text-[#8E8E8E]"
                required
              />
            </div>

            <Button type="submit" disabled={isPending} className="w-full mt-2 font-semibold bg-[#0095F6] text-white hover:bg-[#0074CC]">
              {isPending ? "Creating account..." : "Register"}
            </Button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-[#DBDBDB] text-center text-xs text-[#737373]">
          {COPY.auth.hasAccount}{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-[#0095F6] hover:underline focus-visible:outline-2 focus-visible:outline-[#0095F6] rounded ml-1"
          >
            {COPY.auth.signIn}
          </Link>
        </div>
      </div>
    </div>
  );
}
