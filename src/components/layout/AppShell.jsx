"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Search, SquarePlus, Bell, User, Menu } from "lucide-react";
import { COPY } from "@/lib/copy";

export function AppShell({ children }) {
  const pathname = usePathname();

  const navItems = [
    { name: COPY.nav.home, href: "/", icon: House },
    { name: COPY.nav.search, href: "/search", icon: Search },
    { name: COPY.nav.compose, href: "/compose", icon: SquarePlus },
    { name: COPY.nav.notifications, href: "/notifications", icon: Bell },
    { name: COPY.nav.profile, href: "/settings", icon: User },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] bg-[var(--bg)]">
      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--line)] bg-[var(--bg)] px-4 pt-[env(safe-area-inset-top)]">
        <Link href="/" className="text-xl font-bold tracking-tight text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] rounded">
          {COPY.appName}
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink)] hover:bg-[var(--surface-strong)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
            aria-label={COPY.nav.notifications}
          >
            <Bell size={24} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <Link
            href="/compose"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink)] hover:bg-[var(--surface-strong)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
            aria-label={COPY.nav.compose}
          >
            <SquarePlus size={24} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-[72px] xl:w-[244px] border-r border-[var(--line)] sticky top-0 h-[100dvh] p-3 select-none bg-[var(--bg)] shrink-0 z-30">
        <div className="flex items-center mb-6 px-2 xl:px-4 py-3">
          <Link href="/" className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] rounded">
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
            const isActive = pathname === item.href;
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
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  fill={isActive ? "currentColor" : "none"}
                  aria-hidden="true"
                  className="shrink-0"
                />
                <span className="hidden xl:block text-base truncate">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-2 border-t border-[var(--line)]">
          <button
            type="button"
            className="flex items-center gap-4 p-3 rounded-lg min-h-[44px] w-full text-[var(--ink)] hover:bg-[var(--surface)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] cursor-pointer"
            aria-label={COPY.nav.more}
          >
            <Menu size={24} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
            <span className="hidden xl:block text-base truncate">{COPY.nav.more}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area with Accessible Main landmark */}
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 w-full max-w-[935px] mx-auto min-w-0 pb-20 md:pb-8 outline-none"
      >
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-[var(--line)] bg-[var(--bg)] pb-[env(safe-area-inset-bottom)]"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)]"
              aria-label={item.name}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                size={24}
                strokeWidth={isActive ? 2.25 : 1.75}
                fill={isActive ? "currentColor" : "none"}
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
