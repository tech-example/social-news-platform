"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/use-mounted";

export function FloatingMenu({
  open,
  onClose,
  anchorRef,
  children,
  className = "w-44",
  align = "right",
  role = "menu",
  ariaLabel = "Menu options",
}) {
  const mounted = useMounted();
  const menuRef = useRef(null);
  const [coords, setCoords] = useState(null);

  // Calculate position anchored to trigger button
  useEffect(() => {
    if (!open || !anchorRef?.current) return;

    const updatePosition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Estimate menu height (~200px)
      const spaceBelow = viewportHeight - rect.bottom;
      const showAbove = spaceBelow < 200 && rect.top > 200;

      // Vertical position
      const top = showAbove ? undefined : rect.bottom + 4;
      const bottom = showAbove ? viewportHeight - rect.top + 4 : undefined;

      // Horizontal position
      let right = undefined;
      let left = undefined;

      if (align === "right") {
        right = Math.max(8, viewportWidth - rect.right);
      } else {
        left = Math.max(8, rect.left);
      }

      setCoords({ top, bottom, left, right });
    };

    updatePosition();

    // Re-check on scroll or resize
    const handleScroll = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, anchorRef, align]);

  // Click outside and Escape key listeners
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handlePointerDown = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !mounted || !coords) return null;

  return createPortal(
    <div
      ref={menuRef}
      role={role}
      aria-label={ariaLabel}
      style={{
        position: "fixed",
        top: coords.top !== undefined ? `${coords.top}px` : "auto",
        bottom: coords.bottom !== undefined ? `${coords.bottom}px` : "auto",
        left: coords.left !== undefined ? `${coords.left}px` : "auto",
        right: coords.right !== undefined ? `${coords.right}px` : "auto",
      }}
      className={`z-[60] bg-[var(--bg)] border border-[var(--line)] rounded-xl shadow-xl py-1 animate-slideDown overflow-hidden ${className}`}
      onClick={(e) => {
        // If clicking a button or role="menuitem" inside menu, close menu
        if (e.target.closest("button, [role='menuitem']")) {
          onClose();
        }
      }}
    >
      {children}
    </div>,
    document.body
  );
}
