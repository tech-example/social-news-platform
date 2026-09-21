"use client";

export function Tabs({ tabs, activeTab, onTabChange, className = "" }) {
  return (
    <div
      role="tablist"
      className={`flex border-b border-[var(--line)] bg-[var(--bg)] ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-bright)] ${
              isActive
                ? "text-[var(--ink)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            {Icon && (
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.75}
                aria-hidden="true"
                className="shrink-0"
              />
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-xs text-[var(--ink-muted)] tabular-nums">
                ({tab.count})
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ink)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
