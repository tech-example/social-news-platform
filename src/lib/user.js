/**
 * Shared helper to get the display name for a user or profile.
 * Fallback order:
 * 1. display_name (trimmed, non-empty)
 * 2. username (trimmed, non-empty)
 * 3. "Unknown user" (for deleted accounts or missing profile)
 *
 * @param {Object|string|null|undefined} profile
 * @returns {string}
 */
export function getDisplayName(profile) {
  if (!profile) return "Unknown user";

  if (typeof profile === "string") {
    const trimmed = profile.trim();
    return trimmed || "Unknown user";
  }

  const displayName =
    profile.display_name ??
    profile.displayName ??
    profile.author_display_name ??
    profile.actor_display_name;

  if (typeof displayName === "string" && displayName.trim()) {
    return displayName.trim();
  }

  const username =
    profile.username ??
    profile.author_username ??
    profile.actor_username;

  if (typeof username === "string" && username.trim()) {
    return username.trim();
  }

  return "Unknown user";
}
