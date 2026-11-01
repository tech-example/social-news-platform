"use client";
import { useEffect, useRef } from "react";
import { recordPostViewAction } from "@/server/actions/views";

/**
 * Lightweight client tracker that records a view once when a post enters the viewport.
 */
export function PostViewTracker({ postId }) {
  const recordedRef = useRef(false);

  useEffect(() => {
    if (!postId || recordedRef.current) return;
    recordedRef.current = true;

    // Trigger server-side view recording asynchronously without blocking UI
    recordPostViewAction(postId).catch(() => {});
  }, [postId]);

  return null;
}
