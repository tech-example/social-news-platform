"use client";
import { FlaggedContent } from "./FlaggedContent";

/**
 * Drop-in wrapper forwarding to the unified FlaggedContent component.
 */
export function ProfanityNotice(props) {
  return <FlaggedContent {...props} />;
}

export { FlaggedContent };
