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
  const adminClient = getAdminClient();

  // 1. Check if username is already taken in profiles
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", result.data.username)
    .maybeSingle();

  if (existingUser) {
    return {
      ok: false,
      error: "Username is already taken. Please choose another.",
      fieldErrors: { username: "Username is already taken. Please choose another." },
    };
  }

  // 2. Upfront check: check if an account with this email already exists in auth.users
  try {
    const { data: { users: existingAuthUsers } = {} } = await adminClient.auth.admin.listUsers();
    const emailLower = result.data.email.toLowerCase();
    const emailCollision = existingAuthUsers?.some(
      (u) => u.email?.toLowerCase() === emailLower
    );
    if (emailCollision) {
      return {
        ok: false,
        error: "An account with this email already exists.",
        fieldErrors: { email: "An account with this email already exists." },
      };
    }
  } catch (err) {
    console.warn("Could not pre-check auth.users for duplicate email:", err);
  }

  // 3. Try standard user signUp
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

  // Supabase Auth returns a user object with empty identities [] when the email already exists
  if (
    signUpData?.user &&
    Array.isArray(signUpData.user.identities) &&
    signUpData.user.identities.length === 0
  ) {
    return {
      ok: false,
      error: "An account with this email already exists.",
      fieldErrors: { email: "An account with this email already exists." },
    };
  }

  // If standard signUp errors due to existing user
  if (signUpError) {
    const isDuplicate =
      signUpError.status === 422 ||
      signUpError.message?.toLowerCase().includes("already registered") ||
      signUpError.message?.toLowerCase().includes("already been registered") ||
      signUpError.message?.toLowerCase().includes("user already exists");

    if (isDuplicate) {
      return {
        ok: false,
        error: "An account with this email already exists.",
        fieldErrors: { email: "An account with this email already exists." },
      };
    }

    console.warn("Standard signUp failed, attempting admin registration fallback:", signUpError.message);
    try {
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
        const isAdminDuplicate =
          adminErr?.status === 422 ||
          adminErr?.message?.toLowerCase().includes("already registered") ||
          adminErr?.message?.toLowerCase().includes("already been registered") ||
          adminErr?.message?.toLowerCase().includes("user already exists");

        if (isAdminDuplicate) {
          return {
            ok: false,
            error: "An account with this email already exists.",
            fieldErrors: { email: "An account with this email already exists." },
          };
        }

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
