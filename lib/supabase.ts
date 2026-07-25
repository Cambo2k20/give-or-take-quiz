import { type SupabaseClient, createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Null whenever the project is not configured, which is a supported state
 * rather than an error. Every leaderboard feature is additive: an unconfigured
 * build still deals rounds from the bundled bank and still keeps best scores
 * on the device, it just never offers to publish them.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;

export const leaderboardEnabled = supabase !== null;
