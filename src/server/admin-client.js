import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/server/env";

let client;

export function getAdminClient() {
  client ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
