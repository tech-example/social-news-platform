import "server-only";
import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_ANON_KEY: z.string().min(20, "SUPABASE_ANON_KEY must be at least 20 characters"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "SUPABASE_SERVICE_ROLE_KEY must be at least 20 characters"),
  SITE_URL: z.string().url("SITE_URL must be a valid URL"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters").optional(),
});

export const env = schema.parse({
  SUPABASE_URL: process.env.SUPABASE_URL || "https://placeholder-project.supabase.co",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "placeholder-anon-key-for-build-step",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key-for-build-step",
  SITE_URL: process.env.SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://social-news-nine.vercel.app"),
  CRON_SECRET: process.env.CRON_SECRET || (process.env.NODE_ENV === "development" ? "dev-cron-secret-key-32chars-min!!" : undefined),
});
