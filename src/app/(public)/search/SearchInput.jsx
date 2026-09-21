"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";

export function SearchInput({ initialQuery = "", initialType = "accounts" }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}&type=${initialType}`);
  };

  const handleClear = () => {
    setQuery("");
    router.push(`/search?type=${initialType}`);
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center w-full">
      <Search
        size={18}
        strokeWidth={1.75}
        aria-hidden="true"
        className="absolute left-3.5 text-[var(--ink-muted)] pointer-events-none"
      />
      <input
        type="text"
        inputMode="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search accounts, tags, or news keywords..."
        className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:bg-[var(--bg)] focus-visible:outline-2 focus-visible:outline-[var(--accent-bright)] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
      />
      {query && (
        <div className="absolute right-2">
          <IconButton label="Clear search" onClick={handleClear}>
            <X size={16} strokeWidth={2} aria-hidden="true" className="text-[var(--ink-muted)] hover:text-[var(--ink)]" />
          </IconButton>
        </div>
      )}
    </form>
  );
}
