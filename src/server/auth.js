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

    let { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, role, hide_flagged_content, last_seen_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr && (profileErr.code === "42703" || profileErr.message?.includes("hide_flagged_content"))) {
      const fallback = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, role, last_seen_at")
        .eq("id", user.id)
        .maybeSingle();
      if (fallback.data) {
        profile = { ...fallback.data, hide_flagged_content: true };
      }
    }

    if (!profile) {
      // Auto-heal missing profile record if user exists in auth.users
      const rawUser = user.user_metadata?.username || user.email?.split("@")[0] || `user_${user.id.slice(0, 6)}`;
      const cleanUsername = rawUser.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || `user_${user.id.slice(0, 6)}`;
      const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || cleanUsername;

      const adminSupabase = getAdminClient();
      let createdProfile = null;

      try {
        const { data: p1 } = await adminSupabase
          .from("profiles")
          .insert({
            id: user.id,
            username: cleanUsername,
            display_name: displayName.slice(0, 60),
            role: "user",
            hide_flagged_content: true,
          })
          .select("id, username, display_name, avatar_url, role, hide_flagged_content")
          .maybeSingle();
        createdProfile = p1;
      } catch {
        // Fallback without hide_flagged_content if column does not exist
      }

      if (!createdProfile) {
        const { data: p2 } = await adminSupabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, role")
          .eq("id", user.id)
          .maybeSingle();
        if (p2) {
          createdProfile = { ...p2, hide_flagged_content: true };
        }
      }

      if (createdProfile) {
        profile = createdProfile;
      } else {
        return null;
      }
    }

    if (profile) {
      profile.hide_flagged_content = profile.hide_flagged_content !== false;

      // Throttled activity tracking (at most once every 5 minutes per user)
      // Counts users of ALL roles (user, moderator, admin) without filtering
      const lastSeenTime = profile.last_seen_at ? new Date(profile.last_seen_at).getTime() : 0;
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (!profile.last_seen_at || lastSeenTime < fiveMinutesAgo) {
        const nowIso = new Date().toISOString();
        const adminSb = getAdminClient();
        Promise.allSettled([
          adminSb.from("profiles").update({ last_seen_at: nowIso }).eq("id", profile.id),
          adminSb.from("activity_events").insert({ user_id: profile.id, kind: "sign_in", created_at: nowIso }),
        ]).catch(() => {});
        profile.last_seen_at = nowIso;
      }
    }

    return { user, profile };
  } catch (err) {
    console.error("Error in getSession:", err);
    return null;
  }
});

/**
 * Record user activity event and touch last_seen_at.
 * Throttled or direct write helper.
 */
export async function recordUserActivity(userId, kind = "sign_in") {
  if (!userId) return;
  try {
    const adminSb = getAdminClient();
    const nowIso = new Date().toISOString();
    await Promise.allSettled([
      adminSb.from("profiles").update({ last_seen_at: nowIso }).eq("id", userId),
      adminSb.from("activity_events").insert({ user_id: userId, kind: "sign_in", created_at: nowIso }),
    ]);
  } catch (err) {
    console.error("Error recording user activity:", err);
  }
}

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
