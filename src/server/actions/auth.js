"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createUserClient } from "@/server/supabase";
import { signInSchema, signUpSchema } from "@/lib/validators";

export async function signInAction(prevState, formData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const redirectTo = formData.get("redirectTo") || "/";

  const result = signInSchema.safeParse({ email, password });
  if (!result.success) {
    const issues = result.error.issues;
    const emailIssue = issues.find((i) => i.path[0] === "email");
    const passwordIssue = issues.find((i) => i.path[0] === "password");

    return {
      ok: false,
      error: emailIssue?.message || passwordIssue?.message || "Invalid credentials.",
      fieldErrors: {
        email: emailIssue?.message,
        password: passwordIssue?.message,
      },
    };
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    return {
      ok: false,
      error: "Incorrect email or password. Please check your credentials.",
      fieldErrors: {
        password: "Incorrect password",
      },
    };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signUpAction(prevState, formData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const username = formData.get("username");
  const displayName = formData.get("displayName");

  const result = signUpSchema.safeParse({ email, password, username, displayName });
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message || "Invalid input." };
  }

  const supabase = await createUserClient();

  // Check if username is already taken in profiles
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", result.data.username)
    .maybeSingle();

  if (existingUser) {
    return { ok: false, error: "Username is already taken. Please choose another." };
  }

  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        username: result.data.username,
        display_name: result.data.displayName,
      },
    },
  });

  if (error) {
    return { ok: false, error: error.message || "Failed to create account." };
  }

  // If email confirmation is required:
  if (data?.user && !data.session) {
    return {
      ok: true,
      requiresConfirmation: true,
      message: "Account created. Please check your email to confirm your registration.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOutAction() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/sign-in");
}
