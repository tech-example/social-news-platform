"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { CircleCheck, CircleAlert, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-16 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-md text-sm font-medium transition-all ${
              toast.type === "error"
                ? "bg-[var(--bg)] border-[var(--danger)] text-[var(--danger)]"
                : "bg-[var(--bg)] border-[var(--line)] text-[var(--ink)]"
            }`}
          >
            {toast.type === "error" ? (
              <CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-[var(--danger)]" />
            ) : (
              <CircleCheck size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-[var(--success)]" />
            )}
            <span className="flex-1">{toast.message}</span>
            <IconButton label="Dismiss notification" onClick={() => removeToast(toast.id)}>
              <X size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ink-muted)] hover:text-[var(--ink)]" />
            </IconButton>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      addToast: () => {},
    };
  }
  return ctx;
}
