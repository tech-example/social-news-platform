import Link from "next/link";
import { FileQuestion, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Page Not Found - Social News",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--surface-strong)] flex items-center justify-center mb-6 text-[var(--ink-muted)]">
        <FileQuestion size={36} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)] mb-3">
        404 - Page Not Found
      </h1>
      <p className="text-base text-[var(--ink-muted)] max-w-md mb-8 leading-relaxed">
        Sorry, this page isn&apos;t available. The link you followed may be broken, or the page may have been removed.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <Button variant="primary" className="!text-white active:!text-white flex items-center gap-2">
            <Home size={18} aria-hidden="true" />
            <span>Back to Home</span>
          </Button>
        </Link>
        <Link href="/explore">
          <Button variant="secondary" className="flex items-center gap-2">
            <Search size={18} aria-hidden="true" />
            <span>Explore News</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
