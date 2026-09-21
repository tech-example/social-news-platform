"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Search, SquarePlus, Bell, User, Menu } from "lucide-react";

export function AppShell({ children }) {
  const pathname = usePathname();
  
  const navItems = [
    { name: "Home", href: "/", icon: House },
    { name: "Search", href: "/search", icon: Search },
    { name: "Create", href: "/compose", icon: SquarePlus },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Profile", href: "/u/me", icon: User },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] bg-[var(--bg)]">
      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[var(--line)] bg-[var(--bg)] px-4">
        <span className="text-xl font-semibold">SocialNews</span>
        <div className="flex gap-2">
          <Link href="/notifications" className="p-2" aria-label="Notifications"><Bell size={24} /></Link>
          <Link href="/compose" className="p-2" aria-label="Create"><SquarePlus size={24} /></Link>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col w-[72px] xl:w-[244px] border-r border-[var(--line)] sticky top-0 h-[100dvh] p-3">
        <div className="flex items-center mb-8 px-2 xl:px-4 py-4">
          <span className="hidden xl:inline text-2xl font-bold">SocialNews</span>
          <span className="xl:hidden text-2xl font-bold">SN</span>
        </div>
        
        <div className="flex flex-col gap-2 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--surface-strong)] transition-colors"
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={24} strokeWidth={isActive ? 2 : 1.75} fill={isActive ? "currentColor" : "none"} />
                <span className={`hidden xl:block text-lg ${isActive ? "font-semibold" : "font-normal"}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
        
        <button type="button" className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--surface-strong)] transition-colors mt-auto">
          <Menu size={24} strokeWidth={1.75} />
          <span className="hidden xl:block text-lg">More</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[935px] mx-auto min-w-0 pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t border-[var(--line)] bg-[var(--bg)] pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className="p-3 flex items-center justify-center flex-1"
              aria-label={item.name}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={24} strokeWidth={isActive ? 2 : 1.75} fill={isActive ? "currentColor" : "none"} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
