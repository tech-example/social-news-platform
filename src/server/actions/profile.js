"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth";
import { createUserClient } from "@/server/supabase";
import { profileUpdateSchema } from "@/lib/validators";
import { containsProfanity } from "@/lib/profanity";

export async function updateProfileAction(prevState, formData) {
  const session = await requireRole("user");

  const displayName = formData.get("displayName");
  const bio = formData.get("bio");
  const avatarUrl = formData.get("avatarUrl");

  const parsed = profileUpdateSchema.safeParse({ displayName, bio, avatarUrl });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid input." };
  }

  const profanityCheck = containsProfanity(parsed.data.displayName);
  if (profanityCheck.flagged) {
    return { ok: false, error: "Display name contains inappropriate language." };
  }

  const supabase = await createUserClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      bio: parsed.data.bio || null,
      avatar_url: parsed.data.avatarUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.user.id);

  if (error) {
    return { ok: false, error: error.message || "Failed to update profile." };
  }

  revalidatePath("/settings");
  revalidatePath(`/u/${session.profile.username}`);
  return { ok: true, message: "Profile updated successfully." };
}

export async function updateProfanityPreferenceAction(hideFlaggedContent) {
  const session = await requireRole("user");
  const parsed = typeof hideFlaggedContent === "boolean" ? hideFlaggedContent : Boolean(hideFlaggedContent);

  const supabase = await createUserClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      hide_flagged_content: parsed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.user.id);

  if (error) {
    return { ok: false, error: error.message || "Failed to update preference." };
  }

  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true, hideFlaggedContent: parsed };
}

export async function getActorProfileAction(actorId) {
  if (!actorId) return null;
  try {
    const supabase = await createUserClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", actorId)
      .maybeSingle();
    return data || null;
  } catch (err) {
    console.error("getActorProfileAction error:", err);
    return null;
  }
}


