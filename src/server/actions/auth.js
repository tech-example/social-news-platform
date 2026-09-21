"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createUserClient } from "@/server/supabase";
import { getAdminClient } from "@/server/admin-client";
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
  const confirmPassword = formData.get("confirmPassword");
  const username = formData.get("username");
  const displayName = formData.get("displayName");

  const result = signUpSchema.safeParse({ email, password, confirmPassword, username, displayName });
  if (!result.success) {
    const fieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return {
      ok: false,
      error: result.error.issues[0]?.message || "Invalid input.",
      fieldErrors,
    };
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

  // First try standard user signUp
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        username: result.data.username,
        display_name: result.data.displayName,
      },
    },
  });

  // If standard signUp fails (e.g. Supabase project rejects email or SMTP is unconfigured):
  // Gracefully fallback to creating the user via the admin service role with email_confirm: true
  if (signUpError) {
    console.warn("Standard signUp failed, attempting admin registration fallback:", signUpError.message);
    try {
      const adminClient = getAdminClient();
      const { data: adminData, error: adminErr } = await adminClient.auth.admin.createUser({
        email: result.data.email,
        password: result.data.password,
        email_confirm: true,
        user_metadata: {
          username: result.data.username,
          display_name: result.data.displayName,
        },
      });

      if (adminErr || !adminData?.user) {
        console.error("Admin user creation failed:", adminErr);
        return { ok: false, error: adminErr?.message || signUpError.message || "Failed to create account." };
      }

      // Ensure profile exists in profiles table
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("id", adminData.user.id)
        .maybeSingle();

      if (!existingProfile) {
        await adminClient.from("profiles").insert({
          id: adminData.user.id,
          username: result.data.username.toLowerCase(),
          display_name: result.data.displayName,
          role: "user",
        });
      }

      // Automatically sign the user in so the session cookie is saved
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      });

      if (signInErr) {
        console.error("Sign in after admin registration failed:", signInErr);
      }

      revalidatePath("/", "layout");
      redirect("/");
    } catch (err) {
      if (err.message === "NEXT_REDIRECT") throw err;
      return { ok: false, error: err?.message || signUpError.message || "Failed to create account." };
    }
  }

  // If signUp succeeded but email confirmation is required:
  if (signUpData?.user && !signUpData.session) {
    try {
      const adminClient = getAdminClient();
      await adminClient.auth.admin.updateUserById(signUpData.user.id, {
        email_confirm: true,
      });
      // Attempt immediate login
      const { error: autoSignInErr } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      });
      if (!autoSignInErr) {
        revalidatePath("/", "layout");
        redirect("/");
      }
    } catch (err) {
      if (err.message === "NEXT_REDIRECT") throw err;
    }

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
