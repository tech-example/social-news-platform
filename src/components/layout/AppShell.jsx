"use client";
import { useState, useEffect, useRef } from "react";
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
  ShieldAlert,
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
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((r) => r.json());

export function AppShell({ children, session = null }) {
  const pathname = usePathname();
  const [desktopMoreOpen, setDesktopMoreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const desktopMoreButtonRef = useRef(null);
  const desktopMenuRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Close menus on route change during render
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setDesktopMoreOpen(false);
    setMobileMenuOpen(false);
  }

  // Handle click outside and Escape key for desktop more menu
  useEffect(() => {
    if (!desktopMoreOpen) return;

    const handlePointerDown = (e) => {
      if (
        desktopMenuRef.current &&
        !desktopMenuRef.current.contains(e.target) &&
        desktopMoreButtonRef.current &&
        !desktopMoreButtonRef.current.contains(e.target)
      ) {
        setDesktopMoreOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setDesktopMoreOpen(false);
        desktopMoreButtonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [desktopMoreOpen]);

  // Move focus to first menu item when desktop menu opens
  useEffect(() => {
    if (desktopMoreOpen && desktopMenuRef.current) {
      const firstItem = desktopMenuRef.current.querySelector(
        '[role="menuitem"]:not([disabled])'
      );
      if (firstItem) {
        firstItem.focus();
      }
    }
  }, [desktopMoreOpen]);

  // Handle Escape key for mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Keyboard navigation within the desktop dropup menu (WAI-ARIA Menu pattern)
  const handleMenuKeyDown = (e) => {
    if (!desktopMenuRef.current) return;
    const items = Array.from(
      desktopMenuRef.current.querySelectorAll(
        'a[role="menuitem"], button[role="menuitem"], input[role="menuitem"]'
      )
    );
    if (!items.length) return;

    const currentIndex = items.indexOf(document.activeElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex =
        currentIndex === -1 || currentIndex === items.length - 1
          ? 0
          : currentIndex + 1;
      items[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex =
        currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      items[prevIndex]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Tab") {
      setDesktopMoreOpen(false);
    }
  };

  const profile = session?.profile || null;
  const userRole = profile?.role || "guest";
  const isAuthenticated = !!session?.user && !!profile;
  const isModerator = userRole === "moderator" || userRole === "admin";
  const isAdmin = userRole === "admin";

  const { data: notifData } = useSWR(
    isAuthenticated ? "/api/notifications?limit=1" : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );
  const unreadCount = notifData?.unreadCount || 0;

  const navItems = [
    { name: COPY.nav.home, href: "/", icon: House },
    { name: COPY.nav.search, href: "/search", icon: Search },
    { name: COPY.nav.compose, href: "/compose", icon: SquarePlus },
    ...(isAuthenticated
      ? [{ name: COPY.nav.notifications, href: "/notifications", icon: Bell, badge: unreadCount }]
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
                className="relative flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink)] hover:bg-[var(--surface-strong)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
                aria-label={`${COPY.nav.notifications}${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              >
                <Bell size={22} strokeWidth={1.75} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white ring-2 ring-[var(--bg)]">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
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
            ref={mobileMenuButtonRef}
            id="mobile-nav-toggle"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink)] hover:bg-[var(--surface-strong)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-haspopup="menu"
            aria-controls="mobile-nav-menu"
          >
            {mobileMenuOpen ? (
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
                aria-label={`${item.name}${item.badge > 0 ? ` (${item.badge} unread)` : ""}`}
              >
                <div className="relative shrink-0">
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
                    />
                  )}
                  {item.badge > 0 && (
                    <span className="xl:hidden absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white ring-2 ring-[var(--bg)]">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="hidden xl:flex items-center justify-between flex-1 min-w-0 text-base">
                  <span className="truncate">{item.name}</span>
                  {item.badge > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold rounded-full bg-[var(--accent)] text-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* More Menu Dropup */}
        <div className="relative mt-auto pt-2 border-t border-[var(--line)]">
          {desktopMoreOpen && (
            <div
              ref={desktopMenuRef}
              id="desktop-more-menu"
              role="menu"
              aria-label="More options"
              aria-labelledby="desktop-more-button"
              onKeyDown={handleMenuKeyDown}
              className="absolute bottom-full left-0 mb-2 w-64 bg-[var(--bg)] border border-[var(--line)] rounded-xl shadow-xl py-1.5 z-50 animate-fadeIn space-y-0.5 overflow-hidden"
            >
              {isAuthenticated ? (
                <>
                  {/* Logged in User Profile Card */}
                  <Link
                    href={`/u/${profile.username}`}
                    role="menuitem"
                    onClick={() => setDesktopMoreOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-3 hover:bg-[var(--surface)] transition-colors border-b border-[var(--line)] focus-visible:outline-none focus-visible:bg-[var(--surface)]"
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
                    role="menuitem"
                    onClick={() => setDesktopMoreOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--surface)] transition-colors focus-visible:outline-none focus-visible:bg-[var(--surface)]"
                  >
                    <Settings size={18} strokeWidth={1.75} aria-hidden="true" />
                    <span>Settings</span>
                  </Link>

                  {/* Show Moderation only if moderator or admin */}
                  {isModerator && (
                    <Link
                      href="/moderation"
                      role="menuitem"
                      onClick={() => setDesktopMoreOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--surface)] transition-colors focus-visible:outline-none focus-visible:bg-[var(--surface)]"
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
                    <>
                      <Link
                        href="/admin"
                        role="menuitem"
                        onClick={() => setDesktopMoreOpen(false)}
                        className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--surface)] transition-colors focus-visible:outline-none focus-visible:bg-[var(--surface)]"
                      >
                        <LayoutDashboard
                          size={18}
                          strokeWidth={1.75}
                          aria-hidden="true"
                          className="text-[var(--ink)]"
                        />
                        <span>Admin Dashboard</span>
                      </Link>
                      <Link
                        href="/admin/profanity"
                        role="menuitem"
                        onClick={() => setDesktopMoreOpen(false)}
                        className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--surface)] transition-colors focus-visible:outline-none focus-visible:bg-[var(--surface)]"
                      >
                        <ShieldAlert
                          size={18}
                          strokeWidth={1.75}
                          aria-hidden="true"
                          className="text-[var(--ink)]"
                        />
                        <span>Profanity Filter</span>
                      </Link>
                    </>
                  )}

                  <div className="my-1 border-t border-[var(--line)]" role="separator" />

                  {/* Sign Out Action */}
                  <form action={signOutAction} className="w-full">
                    <button
                      type="submit"
                      role="menuitem"
                      className="flex items-center gap-3 w-full px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:bg-red-50"
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
                    role="menuitem"
                    onClick={() => setDesktopMoreOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--surface)] transition-colors font-medium focus-visible:outline-none focus-visible:bg-[var(--surface)]"
                  >
                    <LogIn size={18} strokeWidth={1.75} aria-hidden="true" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/register"
                    role="menuitem"
                    onClick={() => setDesktopMoreOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--surface)] transition-colors font-medium focus-visible:outline-none focus-visible:bg-[var(--surface)]"
                  >
                    <UserPlus size={18} strokeWidth={1.75} aria-hidden="true" />
                    <span>Register</span>
                  </Link>
                </>
              )}
            </div>
          )}

          <button
            ref={desktopMoreButtonRef}
            id="desktop-more-button"
            type="button"
            onClick={() => {
              setDesktopMoreOpen((prev) => {
                const next = !prev;
                if (!next) {
                  desktopMoreButtonRef.current?.focus();
                }
                return next;
              });
            }}
            className="flex items-center gap-4 p-3 rounded-lg min-h-[44px] w-full text-[var(--ink)] hover:bg-[var(--surface)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] cursor-pointer"
            aria-label={COPY.nav.more}
            aria-expanded={desktopMoreOpen}
            aria-haspopup="menu"
            aria-controls="desktop-more-menu"
          >
            <Menu size={24} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
            <span className="hidden xl:block text-base truncate">{COPY.nav.more}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Popover Menu when mobile menu is open */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] cursor-default"
            onClick={() => {
              setMobileMenuOpen(false);
              mobileMenuButtonRef.current?.focus();
            }}
            aria-hidden="true"
          />
          <div
            ref={mobileMenuRef}
            id="mobile-nav-menu"
            role="menu"
            aria-label="Navigation menu"
            className="md:hidden fixed inset-x-0 top-14 bg-[var(--bg)] border-b border-[var(--line)] shadow-lg p-3 z-40 animate-fadeIn space-y-1"
          >
          {isAuthenticated ? (
            <>
              <Link
                href={`/u/${profile.username}`}
                role="menuitem"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-[var(--ink)] hover:bg-[var(--surface)] border-b border-[var(--line)] pb-3 focus-visible:outline-none focus-visible:bg-[var(--surface)]"
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
                role="menuitem"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-[var(--ink)] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:bg-[var(--surface)]"
              >
                <Settings size={18} strokeWidth={1.75} aria-hidden="true" />
                <span>Settings</span>
              </Link>
              {isModerator && (
                <Link
                  href="/moderation"
                  role="menuitem"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-[var(--ink)] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:bg-[var(--surface)]"
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
                <>
                  <Link
                    href="/admin"
                    role="menuitem"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-[var(--ink)] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:bg-[var(--surface)]"
                  >
                    <LayoutDashboard size={18} strokeWidth={1.75} aria-hidden="true" />
                    <span>Admin Dashboard</span>
                  </Link>
                  <Link
                    href="/admin/profanity"
                    role="menuitem"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-[var(--ink)] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:bg-[var(--surface)]"
                  >
                    <ShieldAlert size={18} strokeWidth={1.75} aria-hidden="true" />
                    <span>Profanity Filter</span>
                  </Link>
                </>
              )}
              <div className="border-t border-[var(--line)] my-1" role="separator" />
              <form action={signOutAction} className="w-full">
                <button
                  type="submit"
                  role="menuitem"
                  className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 w-full text-left cursor-pointer focus-visible:outline-none focus-visible:bg-red-50"
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
                role="menuitem"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-[var(--ink)] hover:bg-[var(--surface)] font-medium focus-visible:outline-none focus-visible:bg-[var(--surface)]"
              >
                <LogIn size={18} strokeWidth={1.75} aria-hidden="true" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/register"
                role="menuitem"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-2.5 rounded-lg text-sm text-[var(--ink)] hover:bg-[var(--surface)] font-medium focus-visible:outline-none focus-visible:bg-[var(--surface)]"
              >
                <UserPlus size={18} strokeWidth={1.75} aria-hidden="true" />
                <span>Register</span>
              </Link>
            </>
          )}
        </div>
      </>
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
              className="relative flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
              aria-label={`${item.name}${item.badge > 0 ? ` (${item.badge} unread)` : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
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
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white ring-2 ring-[var(--bg)]">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
