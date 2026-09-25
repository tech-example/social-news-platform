"use client";
import { useState, useActionState, useCallback } from "react";
import Link from "next/link";
import { signUpAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { CircleAlert, CircleCheck, Eye, EyeOff } from "lucide-react";
import { COPY } from "@/lib/copy";

function getInputClasses(touched, error) {
  const base =
    "w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 bg-white text-[#262626] placeholder:text-[#8E8E8E]";
  if (!touched) {
    return `${base} border-[#DBDBDB] hover:border-[#737373] focus:border-[#0095F6] focus-visible:outline-[#0095F6]`;
  }
  if (error) {
    return `${base} border-[#C8323C] bg-red-50/20 focus-visible:outline-[#C8323C]`;
  }
  return `${base} border-[#12805C] focus-visible:outline-[#12805C]`;
}

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, null);

  const [fields, setFields] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
    confirmPassword: "",
  });

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validate = useCallback(
    (name, value, allFields) => {
      const vals = { ...allFields, [name]: value };
      switch (name) {
        case "email": {
          const trimmed = value.trim();
          if (!trimmed) return "Email is required";
          if (!trimmed.includes("@"))
            return `Please include an '@' in the email address`;
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
            return "Please enter a valid email address";
          return "";
        }
        case "username": {
          const t = value.trim();
          if (!t) return "Username is required";
          if (t.length < 3) return "Username must be at least 3 characters";
          if (t.length > 30) return "Username must be 30 characters or fewer";
          if (!/^[a-z0-9_.]+$/i.test(t))
            return "Only letters, numbers, periods, and underscores";
          return "";
        }
        case "displayName": {
          const t = value.trim();
          if (!t) return "Display name is required";
          if (t.length > 50) return "Display name must be 50 characters or fewer";
          return "";
        }
        case "password": {
          if (!value) return "Password is required";
          if (value.length < 8) return "Password must be at least 8 characters";
          return "";
        }
        case "confirmPassword": {
          if (!value) return "Please confirm your password";
          if (value !== vals.password) return "Passwords do not match";
          return "";
        }
        default:
          return "";
      }
    },
    []
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => {
      const next = { ...prev, [name]: value };
      if (touched[name]) {
        setErrors((errs) => ({ ...errs, [name]: validate(name, value, next) }));
      }
      // Re-validate confirmPassword when password changes
      if (name === "password" && touched.confirmPassword) {
        setErrors((errs) => ({
          ...errs,
          confirmPassword: validate("confirmPassword", next.confirmPassword, next),
        }));
      }
      return next;
    });
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((errs) => ({ ...errs, [name]: validate(name, value, fields) }));
  };

  const handleSubmit = (e) => {
    const allTouched = {};
    const allErrors = {};
    let hasError = false;
    for (const key of Object.keys(fields)) {
      allTouched[key] = true;
      const err = validate(key, fields[key], fields);
      allErrors[key] = err;
      if (err) hasError = true;
    }
    setTouched(allTouched);
    setErrors(allErrors);
    if (hasError) {
      e.preventDefault();
    }
  };

  // Merge server-side field errors
  const fieldError = (name) => {
    if (errors[name]) return errors[name];
    if (state?.fieldErrors?.[name]) return state.fieldErrors[name];
    return "";
  };

  const isTouched = (name) => {
    return touched[name] || !!state?.fieldErrors?.[name];
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

        {state?.error && !state?.fieldErrors && (
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
                type="text"
                inputMode="email"
                value={fields.email}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="email"
                spellCheck={false}
                placeholder="name@domain.com"
                className={getInputClasses(isTouched("email"), fieldError("email"))}
              />
              {isTouched("email") && fieldError("email") && (
                <span className="text-xs font-medium text-[#C8323C] mt-0.5">
                  {fieldError("email")}
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
                value={fields.username}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="username"
                spellCheck={false}
                placeholder="e.g. campus_reporter"
                className={getInputClasses(isTouched("username"), fieldError("username"))}
              />
              {isTouched("username") && fieldError("username") && (
                <span className="text-xs font-medium text-[#C8323C] mt-0.5">
                  {fieldError("username")}
                </span>
              )}
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
                value={fields.displayName}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="name"
                placeholder="e.g. John Doe"
                className={getInputClasses(isTouched("displayName"), fieldError("displayName"))}
              />
              {isTouched("displayName") && fieldError("displayName") && (
                <span className="text-xs font-medium text-[#C8323C] mt-0.5">
                  {fieldError("displayName")}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-xs font-semibold text-[#262626] tracking-tight">
                {COPY.auth.password} (8+ characters) *
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={fields.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`${getInputClasses(isTouched("password"), fieldError("password"))} pr-10`}
                />
                {fields.password.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#262626] transition-colors p-1 rounded-md focus-visible:outline-2 focus-visible:outline-[#0095F6]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={20} strokeWidth={1.75} /> : <Eye size={20} strokeWidth={1.75} />}
                  </button>
                )}
              </div>
              {isTouched("password") && fieldError("password") && (
                <span className="text-xs font-medium text-[#C8323C] mt-0.5">
                  {fieldError("password")}
                </span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1">
              <label htmlFor="confirmPassword" className="text-xs font-semibold text-[#262626] tracking-tight">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={fields.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`${getInputClasses(isTouched("confirmPassword"), fieldError("confirmPassword"))} pr-10`}
                />
                {fields.confirmPassword.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#262626] transition-colors p-1 rounded-md focus-visible:outline-2 focus-visible:outline-[#0095F6]"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? <EyeOff size={20} strokeWidth={1.75} /> : <Eye size={20} strokeWidth={1.75} />}
                  </button>
                )}
              </div>
              {isTouched("confirmPassword") && fieldError("confirmPassword") && (
                <span className="text-xs font-medium text-[#C8323C] mt-0.5">
                  {fieldError("confirmPassword")}
                </span>
              )}
              {isTouched("confirmPassword") &&
                !fieldError("confirmPassword") &&
                fields.confirmPassword && (
                  <span className="text-xs font-medium text-[#12805C] mt-0.5 flex items-center gap-1">
                    <CircleCheck size={13} strokeWidth={2} aria-hidden="true" />
                    Passwords match
                  </span>
                )}
            </div>

            <Button
              type="submit"
              disabled={isPending}
              loading={isPending}
              className="w-full mt-2 font-semibold bg-[#0095F6] hover:bg-[#0074CC]"
            >
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
