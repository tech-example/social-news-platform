"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth";
import { createUserClient } from "@/server/supabase";
import { postSchema } from "@/lib/validators";
import { containsProfanity } from "@/lib/profanity";
import { processAndUploadPostImage } from "@/server/images";

export async function createPostAction(input) {
  const session = await requireRole("user");

  let rawTitle = "";
  let rawBody = "";
  let rawImageUrl = null;
  let rawTags = [];
  let imageFile = null;

  if (typeof FormData !== "undefined" && input instanceof FormData) {
    rawTitle = input.get("title")?.toString() || "";
    rawBody = input.get("body")?.toString() || "";
    const tagsField = input.get("tags")?.toString();
    if (tagsField) {
      try {
        rawTags = JSON.parse(tagsField);
      } catch {
        rawTags = tagsField.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }
    const file = input.get("image");
    if (file && typeof file === "object" && file.size > 0) {
      imageFile = file;
    }
  } else if (input && typeof input === "object") {
    rawTitle = input.title || "";
    rawBody = input.body || "";
    rawImageUrl = input.imageUrl || null;
    rawTags = input.tags || [];
    if (input.image && typeof input.image === "object" && input.image.size > 0) {
      imageFile = input.image;
    }
  }

  // If a file is uploaded, process with sharp and upload to Supabase Storage server-side
  if (imageFile) {
    try {
      const uploadResult = await processAndUploadPostImage(imageFile, session.user.id);
      rawImageUrl = uploadResult.fullUrl;
    } catch (err) {
      return { ok: false, error: err.message || "Failed to process image." };
    }
  }

  const parsed = postSchema.safeParse({
    title: rawTitle || undefined,
    body: rawBody,
    imageUrl: rawImageUrl || undefined,
    tags: rawTags,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid post data." };
  }

  const { title, body, imageUrl, tags } = parsed.data;
  const titleCheck = containsProfanity(title || "");
  const bodyCheck = containsProfanity(body || "");
  const isFlagged = titleCheck.flagged || bodyCheck.flagged;
  const flaggedReason = isFlagged ? "profanity" : null;

  const supabase = await createUserClient();

  const insertPayload = {
    author_id: session.user.id,
    title: title || null,
    body,
    image_url: imageUrl || null,
    status: "published",
    is_flagged: isFlagged,
    flagged_reason: flaggedReason,
  };

  let { data: newPost, error: postError } = await supabase
    .from("posts")
    .insert(insertPayload)
    .select("id")
    .single();

  // Graceful fallback if is_flagged column hasn't been migrated in DB yet
  if (postError && postError.code === "42703") {
    const { is_flagged, flagged_reason, ...legacyPayload } = insertPayload;
    const retry = await supabase.from("posts").insert(legacyPayload).select("id").single();
    newPost = retry.data;
    postError = retry.error;
  }

  if (postError || !newPost) {
    return { ok: false, error: postError?.message || "Failed to create post." };
  }

  if (tags && tags.length > 0) {
    const { error: tagError } = await supabase.rpc("set_post_tags", {
      p_post_id: newPost.id,
      p_tags: tags,
    });
    if (tagError) {
      console.error("Error setting tags:", tagError);
    }
  }

  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath(`/u/${session.profile.username}`);
  return { ok: true, postId: newPost.id, isFlagged };
}

export async function editPostAction(postId, input) {
  const session = await requireRole("user");
  const parsed = postSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid post data." };
  }

  const { title, body, imageUrl, tags } = parsed.data;
  const titleCheck = containsProfanity(title || "");
  const bodyCheck = containsProfanity(body || "");
  const isFlagged = titleCheck.flagged || bodyCheck.flagged;
  const flaggedReason = isFlagged ? "profanity" : null;

  const supabase = await createUserClient();

  // Verify ownership
  const { data: existingPost } = await supabase
    .from("posts")
    .select("id, author_id")
    .eq("id", postId)
    .single();

  if (!existingPost) return { ok: false, error: "Post not found." };
  if (existingPost.author_id !== session.user.id && session.profile.role !== "admin") {
    return { ok: false, error: "You are not authorized to edit this post." };
  }

  const updatePayload = {
    title: title || null,
    body,
    image_url: imageUrl || null,
    updated_at: new Date().toISOString(),
    is_flagged: isFlagged,
    flagged_reason: flaggedReason,
  };

  let { error: updateError } = await supabase
    .from("posts")
    .update(updatePayload)
    .eq("id", postId);

  // Graceful fallback if is_flagged column hasn't been migrated in DB yet
  if (updateError && updateError.code === "42703") {
    const { is_flagged, flagged_reason, ...legacyPayload } = updatePayload;
    const retry = await supabase.from("posts").update(legacyPayload).eq("id", postId);
    updateError = retry.error;
  }

  if (updateError) {
    return { ok: false, error: updateError.message || "Failed to update post." };
  }

  if (tags) {
    await supabase.rpc("set_post_tags", {
      p_post_id: postId,
      p_tags: tags,
    });
  }

  revalidatePath("/");
  revalidatePath(`/p/${postId}`);
  return { ok: true };
}

export async function deletePostAction(postId) {
  const session = await requireRole("user");
  const supabase = await createUserClient();

  const { data: post } = await supabase
    .from("posts")
    .select("id, author_id")
    .eq("id", postId)
    .single();

  if (!post) return { ok: false, error: "Post not found." };

  const isOwner = post.author_id === session.user.id;
  const isStaff = session.profile.role === "moderator" || session.profile.role === "admin";

  if (!isOwner && !isStaff) {
    return { ok: false, error: "Not authorized to delete this post." };
  }

  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) {
    return { ok: false, error: error.message || "Failed to delete post." };
  }

  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath(`/u/${session.profile.username}`);
  return { ok: true };
}
