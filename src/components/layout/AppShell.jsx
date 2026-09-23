"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Search,
  SquarePlus,
  Bell,
  User,
  Menu,
  ShieldCheck,
  LayoutDashboard,
  Settings,
  LogIn,
  UserPlus,
  LogOut,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { signOutAction } from "@/server/actions/auth";
import { COPY } from "@/lib/copy";

export function AppShell({ children, session = null }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const profile = session?.profile || null;
  const userRole = profile?.role || "guest";
  const isAuthenticated = !!session?.user && !!profile;
  const isModerator = userRole === "moderator" || userRole === "admin";
  const isAdmin = userRole === "admin";

  const navItems = [
    { name: COPY.nav.home, href: "/", icon: House },
    { name: COPY.nav.search, href: "/search", icon: Search },
    { name: COPY.nav.compose, href: "/compose", icon: SquarePlus },
    ...(isAuthenticated
      ? [{ name: COPY.nav.notifications, href: "/notifications", icon: Bell }]
      : []),
    {
      name: isAuthenticated ? COPY.nav.profile : "Sign In",
      href: isAuthenticated ? `/u/${profile.username}` : "/sign-in",
      icon: isAuthenticated ? User : LogIn,
      avatar: isAuthenticated ? profile.avatar_url : null,
      username: profile?.username,
    },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] bg-[var(--bg)]">
      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--line)] bg-[var(--bg)] px-4 pt-[env(safe-area-inset-top)]">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] rounded"
        >
          {COPY.appName}
        </Link>
        <div className="flex items-center gap-1">
          {isAuthenticated ? (
            <>
              <Link
                href="/notifications"
                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink)] hover:bg-[var(--surface-strong)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
                aria-label={COPY.nav.notifications}
              >
                <Bell size={22} strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <Link
                href="/compose"
                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink)] hover:bg-[var(--surface-strong)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
                aria-label={COPY.nav.compose}
              >
                <SquarePlus size={22} strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <Link
                href={`/u/${profile.username}`}
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[var(--surface-strong)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
                aria-label={profile.username}
              >
                <Avatar
                  src={profile.avatar_url}
                  name={profile.display_name || profile.username}
                  size={28}
                />
              </Link>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors mr-1"
            >
              Sign In
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink)] hover:bg-[var(--surface-strong)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={moreOpen}
          >
            {moreOpen ? (
              <X size={22} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-[72px] xl:w-[244px] border-r border-[var(--line)] sticky top-0 h-[100dvh] p-3 select-none bg-[var(--bg)] shrink-0 z-30">
        <div className="flex items-center mb-6 px-2 xl:px-4 py-3">
          <Link
            href="/"
            className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] rounded"
          >
            <span className="hidden xl:inline text-2xl font-bold tracking-tight text-[var(--ink)]">
              {COPY.appName}
            </span>
            <span className="xl:hidden text-2xl font-bold tracking-tight text-[var(--ink)]">
              SN
            </span>
          </Link>
        </div>

        <nav aria-label="Main Navigation" className="flex flex-col gap-1.5 flex-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.username && pathname.startsWith(`/u/${item.username}`));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-4 p-3 rounded-lg min-h-[44px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] ${
                  isActive
                    ? "bg-[var(--surface-strong)] text-[var(--ink)] font-semibold"
                    : "text-[var(--ink)] hover:bg-[var(--surface)] font-normal"
                }`}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.name}
              >
                {item.avatar ? (
                  <Avatar
                    src={item.avatar}
                    name={item.name}
                    size={24}
                    className={`shrink-0 ${
                      isActive ? "ring-2 ring-[var(--ink)]" : ""
                    }`}
                  />
                ) : (
                  <Icon
                    size={24}
                    strokeWidth={isActive ? 2.25 : 1.75}
                    fill={isActive ? "currentColor" : "none"}
                    aria-hidden="true"
                    className="shrink-0"
                  />
                )}
                <span className="hidden xl:block text-base truncate">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* More Menu Dropup */}
        <div className="relative mt-auto pt-2 border-t border-[var(--line)]">
          {moreOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-[var(--bg)] border border-[var(--line)] rounded-xl shadow-xl py-1.5 z-40 animate-fadeIn space-y-0.5 overflow-hidden">
              {isAuthenticated ? (
                <>
                  {/* Logged in User Profile Card */}
                  <Link
                    href={`/u/${profile.username}`}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-3 hover:bg-[var(--surface)] transition-colors border-b border-[var(--line)]"
                  >
                    <Avatar
                      src={profile.avatar_url}
                      name={profile.display_name || profile.username}
                      size={38}
                      className="shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-[var(--ink)] truncate">
                        {profile.display_name || profile.username}
                      </span>
                      <span className="text-xs text-[var(--ink-muted)] truncate">
                        @{profile.username}
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
                  >
                    <Settings size={18} strokeWidth={1.75} aria-hidden="true" />
                    <span>Settings</span>
                  </Link>

                  {/* Show Moderation only if moderator or admin */}
                  {isModerator && (
                    <Link
                      href="/moderation"
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
                    >
                      <ShieldCheck
                        size={18}
                        strokeWidth={1.75}
                        aria-hidden="true"
                        className="text-[var(--accent)]"
                      />
                      <span>Moderation</span>
                    </Link>
                  )}

                  {/* Show Admin Dashboard only if admin */}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--surface)] transition-colors"
                    >
                      <LayoutDashboard
                        size={18}
                        strokeWidth={1.75}
                        aria-hidden="true"
                        className="text-[var(--ink)]"
                      />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}

                  <div className="my-1 border-t border-[var(--line)]" />

                  {/* Sign Out Action */}
                  <form action={signOutAction} className="w-full">
                    <button
                      type="submit"
                      className="flex items-center gap-3 w-full px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                    >
                      <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
                      <span>Sign Out</span>
                    </button>
                  </form>
                </>
              ) : (
                <>
                  {/* Guest menu */}
                  <Link
                    href="/sign-in"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--surface)] transition-colors font-medium"
                  >
                    <LogIn size={18} strokeWidth={1.75} aria-hidden="true" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--surface)] transition-colors font-medium"
                  >
                    <UserPlus size={18} strokeWidth={1.75} aria-hidden="true" />
                    <span>Register</span>
                  </Link>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex items-center gap-4 p-3 rounded-lg min-h-[44px] w-full text-[var(--ink)] hover:bg-[var(--surface)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] cursor-pointer"
            aria-label={COPY.nav.more}
            aria-expanded={moreOpen}
          >
            <Menu size={24} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
            <span className="hidden xl:block text-base truncate">{COPY.nav.more}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Popover Menu when more is open */}
      {moreOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 bg-[var(--bg)] border-b border-[var(--line)] shadow-lg p-3 z-30 animate-fadeIn space-y-1">
          {isAuthenticated ? (
            <>
              <Link
                href={`/u/${profile.username}`}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-[var(--ink)] hover:bg-[var(--surface)] border-b border-[var(--line)] pb-3"
              >
                <Avatar
                  src={profile.avatar_url}
                  name={profile.display_name || profile.username}
                  size={36}
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-[var(--ink)] truncate">
                    {profile.display_name || profile.username}
                  </span>
                  <span className="text-xs text-[var(--ink-muted)] truncate">
                    @{profile.username}
                  </span>
                </div>
              </Link>
              <Link
                href="/settings"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-[var(--ink)] hover:bg-[var(--surface)]"
              >
                <Settings size={18} strokeWidth={1.75} aria-hidden="true" />
                <span>Settings</span>
              </Link>
              {isModerator && (
                <Link
                  href="/moderation"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-[var(--ink)] hover:bg-[var(--surface)]"
                >
                  <ShieldCheck
                    size={18}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="text-[var(--accent)]"
                  />
                  <span>Moderation</span>
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-[var(--ink)] hover:bg-[var(--surface)]"
                >
                  <LayoutDashboard size={18} strokeWidth={1.75} aria-hidden="true" />
                  <span>Admin Dashboard</span>
                </Link>
              )}
              <div className="border-t border-[var(--line)] my-1" />
              <form action={signOutAction} className="w-full">
                <button
                  type="submit"
                  className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 w-full text-left cursor-pointer"
                >
                  <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-[var(--ink)] hover:bg-[var(--surface)] font-medium"
              >
                <LogIn size={18} strokeWidth={1.75} aria-hidden="true" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/register"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-[var(--ink)] hover:bg-[var(--surface)] font-medium"
              >
                <UserPlus size={18} strokeWidth={1.75} aria-hidden="true" />
                <span>Register</span>
              </Link>
            </>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 w-full max-w-[1280px] mx-auto min-w-0 pb-20 md:pb-8 outline-none"
      >
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-[var(--line)] bg-[var(--bg)] pb-[env(safe-area-inset-bottom)]"
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.username && pathname.startsWith(`/u/${item.username}`));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
              aria-label={item.name}
              aria-current={isActive ? "page" : undefined}
            >
              {item.avatar ? (
                <Avatar
                  src={item.avatar}
                  name={item.name}
                  size={24}
                  className={isActive ? "ring-2 ring-[var(--ink)]" : ""}
                />
              ) : (
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  fill={isActive ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
