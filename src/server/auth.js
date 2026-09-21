import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createUserClient } from "@/server/supabase";
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, role, is_suspended")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.is_suspended) return null;

    return { user, profile };
  } catch {
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
