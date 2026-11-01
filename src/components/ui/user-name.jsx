import { getDisplayName } from "@/lib/user";
import { cn } from "@/lib/cn";

export { getDisplayName };

/**
 * Shared component for rendering user display names consistently.
 * Uses getDisplayName fallback logic:
 * 1. display_name
 * 2. username
 * 3. "Unknown user"
 */
export function UserName({
  user,
  profile,
  name,
  className = "",
  as: Component = "span",
  ...props
}) {
  const target = profile || user;
  const displayName = name || getDisplayName(target);

  return (
    <Component className={cn("truncate", className)} {...props}>
      {displayName}
    </Component>
  );
}
