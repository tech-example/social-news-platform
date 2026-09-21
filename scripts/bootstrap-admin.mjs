import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

if (!adminEmail) {
  console.error("Missing BOOTSTRAP_ADMIN_EMAIL environment variable.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log(`Looking up user by email: ${adminEmail}…`);
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  const user = users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());
  if (!user) {
    console.error(`User with email "${adminEmail}" was not found in auth.users. Please sign up first.`);
    process.exit(1);
  }

  console.log(`Promoting user ${user.id} (${adminEmail}) to admin role…`);
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", user.id);

  if (updateError) {
    console.error("Failed to update profile role:", updateError.message);
    process.exit(1);
  }

  console.log(`Successfully promoted ${adminEmail} to admin!`);
}

main().catch((err) => {
  console.error("Bootstrap script failed:", err);
  process.exit(1);
});
