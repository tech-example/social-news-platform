"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth";
import { createUserClient } from "@/server/supabase";
import { postSchema } from "@/lib/validators";

export async function createPostAction(input) {
  const session = await requireRole("user");
  const parsed = postSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid post data." };
  }

  const { title, body, imageUrl, tags } = parsed.data;
  const supabase = await createUserClient();

  const { data: newPost, error: postError } = await supabase
    .from("posts")
    .insert({
      user_id: session.user.id,
      title: title || null,
      body,
      image_url: imageUrl || null,
      status: "published",
    })
    .select("id")
    .single();

  if (postError || !newPost) {
    return { ok: false, error: postError?.message || "Failed to create post." };
  }

  if (tags && tags.length > 0) {
    const { error: tagError } = await supabase.rpc("set_post_tags", {
      p_post_id: newPost.id,
      p_tag_names: tags,
    });
    if (tagError) {
      console.error("Error setting tags:", tagError);
    }
  }

  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath(`/u/${session.profile.username}`);
  return { ok: true, postId: newPost.id };
}

export async function editPostAction(postId, input) {
  const session = await requireRole("user");
  const parsed = postSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid post data." };
  }

  const { title, body, imageUrl, tags } = parsed.data;
  const supabase = await createUserClient();

  // Verify ownership
  const { data: existingPost } = await supabase
    .from("posts")
    .select("id, user_id")
    .eq("id", postId)
    .single();

  if (!existingPost) return { ok: false, error: "Post not found." };
  if (existingPost.user_id !== session.user.id && session.profile.role !== "admin") {
    return { ok: false, error: "You are not authorized to edit this post." };
  }

  const { error: updateError } = await supabase
    .from("posts")
    .update({
      title: title || null,
      body,
      image_url: imageUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);

  if (updateError) {
    return { ok: false, error: updateError.message || "Failed to update post." };
  }

  if (tags) {
    await supabase.rpc("set_post_tags", {
      p_post_id: postId,
      p_tag_names: tags,
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
    .select("id, user_id")
    .eq("id", postId)
    .single();

  if (!post) return { ok: false, error: "Post not found." };

  const isOwner = post.user_id === session.user.id;
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
