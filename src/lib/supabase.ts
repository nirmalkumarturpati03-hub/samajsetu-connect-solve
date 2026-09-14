import { createClient } from "@supabase/supabase-js";

const getEnv = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {}
  try {
    if (typeof process !== "undefined" && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch {}
  return undefined;
};

const url = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL");
const key = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || getEnv("SUPABASE_PUBLISHABLE_KEY");

export const isSupabaseConfigured = Boolean(url && key);

// The client is intentionally unavailable until environment variables are set.
// This prevents a build-time placeholder from ever being treated as a backend.
export const supabase = isSupabaseConfigured
  ? createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
