"use server";
import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { getSession } from "@/server/auth";
import { getAdminClient } from "@/server/admin-client";

/**
 * Server-side privacy-safe post view recorder.
 * 
 * Rules:
 * 1. Checks current authenticated viewer (if logged in).
 * 2. For guests: generates a daily-rotating salted hash (no IP, no raw cookie ID, no device fingerprint).
 * 3. Enforces rate limits (via rate_limits table).
 * 4. Never counts the author's own views.
 * 5. Dedupes views to at most 1 view per viewer per post per 30 minutes.
 * 
 * @param {string} postId - UUID of the post
 * @returns {Promise<{ ok: boolean, recorded: boolean }>}
 */
export async function recordPostViewAction(postId) {
  if (!postId || typeof postId !== "string") {
    return { ok: false, recorded: false };
  }

  try {
    const session = await getSession();
    const viewerId = session?.user?.id || null;
    let visitorHash = null;

    if (!viewerId) {
      // Guest tracking: daily-rotating salted hash
      const cookieStore = await cookies();
      let guestToken = cookieStore.get("sn_guest_visit_nonce")?.value;
      if (!guestToken) {
        guestToken = crypto.randomUUID();
        // Ephemeral session-like cookie, expires in 24 hours
        cookieStore.set("sn_guest_visit_nonce", guestToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 86400,
          path: "/",
        });
      }

      // Salt with rotating daily UTC date string and server secret
      const dayStamp = new Date().toISOString().slice(0, 10);
      const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "sn_secret_salt";
      visitorHash = crypto
        .createHmac("sha256", secret)
        .update(`${dayStamp}:${guestToken}`)
        .digest("hex");
    }

    const adminSupabase = getAdminClient();

    // Rate limit check: max 60 views recorded per minute per visitor
    const rateLimitKey = `view_rate:${viewerId || visitorHash}`;
    const now = new Date();
    const resetAt = new Date(now.getTime() + 60 * 1000).toISOString();

    const { data: rlData } = await adminSupabase
      .from("rate_limits")
      .select("count, reset_at")
      .eq("key", rateLimitKey)
      .maybeSingle();

    if (rlData && new Date(rlData.reset_at) > now) {
      if (rlData.count >= 60) {
        // Exceeded rate limit, return gracefully without recording
        return { ok: true, recorded: false };
      }
      await adminSupabase
        .from("rate_limits")
        .update({ count: rlData.count + 1 })
        .eq("key", rateLimitKey);
    } else {
      await adminSupabase
        .from("rate_limits")
        .upsert({ key: rateLimitKey, count: 1, reset_at: resetAt });
    }

    // Try calling the record_post_view Postgres RPC first
    const { data: rpcResult, error: rpcErr } = await adminSupabase.rpc(
      "record_post_view",
      {
        p_post_id: postId,
        p_viewer_id: viewerId,
        p_visitor_hash: visitorHash,
      }
    );

    if (!rpcErr && rpcResult !== undefined) {
      return { ok: true, recorded: Boolean(rpcResult) };
    }

    // Fallback if RPC not yet created in remote DB
    // Verify post author: never count author's own views
    const { data: post, error: postErr } = await adminSupabase
      .from("posts")
      .select("author_id, views_count")
      .eq("id", postId)
      .maybeSingle();

    if (postErr || !post) {
      return { ok: false, recorded: false };
    }

    if (viewerId && viewerId === post.author_id) {
      return { ok: true, recorded: false };
    }

    // Insert view with time_bucket constraint
    const currentNow = new Date();
    const minutes = currentNow.getUTCMinutes();
    const bucketMinute = minutes < 30 ? 0 : 30;
    const bucketTime = new Date(currentNow);
    bucketTime.setUTCMinutes(bucketMinute, 0, 0);

    const insertPayload = {
      post_id: postId,
      viewer_id: viewerId,
      visitor_hash: viewerId ? null : visitorHash,
      viewed_at: currentNow.toISOString(),
      time_bucket: bucketTime.toISOString(),
    };

    const { error: insErr } = await adminSupabase
      .from("post_views")
      .insert(insertPayload);

    if (!insErr) {
      // Increment views count on posts
      await adminSupabase
        .from("posts")
        .update({ views_count: (post.views_count || 0) + 1 })
        .eq("id", postId);
      return { ok: true, recorded: true };
    }

    return { ok: true, recorded: false };
  } catch (err) {
    console.error("recordPostViewAction error:", err);
    return { ok: false, recorded: false };
  }
}
