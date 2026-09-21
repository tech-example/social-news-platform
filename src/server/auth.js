import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createUserClient } from "@/server/supabase";
import { getAdminClient } from "@/server/admin-client";
import { ROLE_RANK } from "@/lib/constants";

export class AuthError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = "AuthError";
    this.code = code;
  }
}

export const getSession = cache(async () => {
  try {
    const supabase = await createUserClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    let { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, role, is_suspended")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      // Auto-heal missing profile record if user exists in auth.users
      const rawUser = user.user_metadata?.username || user.email?.split("@")[0] || `user_${user.id.slice(0, 6)}`;
      const cleanUsername = rawUser.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || `user_${user.id.slice(0, 6)}`;
      const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || cleanUsername;

      const adminSupabase = getAdminClient();
      const { data: createdProfile } = await adminSupabase
        .from("profiles")
        .insert({
          id: user.id,
          username: cleanUsername,
          display_name: displayName.slice(0, 60),
          role: "user",
        })
        .select("id, username, display_name, avatar_url, role, is_suspended")
        .maybeSingle();

      if (createdProfile) {
        profile = createdProfile;
      } else {
        return null;
      }
    }

    if (profile.is_suspended) return null;

    return { user, profile };
  } catch (err) {
    console.error("Error in getSession:", err);
    return null;
  }
});

export async function requireRole(minRole = "user") {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  const userRank = ROLE_RANK[session.profile.role] || 0;
  const requiredRank = ROLE_RANK[minRole] || 1;

  if (userRank < requiredRank) {
    redirect("/");
  }
  return session;
}

export async function requireRoleOrThrow(minRole = "user") {
  const session = await getSession();
  if (!session) {
    throw new AuthError("UNAUTHENTICATED", "You must be signed in to perform this action.");
  }
  const userRank = ROLE_RANK[session.profile.role] || 0;
  const requiredRank = ROLE_RANK[minRole] || 1;

  if (userRank < requiredRank) {
    throw new AuthError("FORBIDDEN", "You do not have permission to perform this action.");
  }
  return session;
}
