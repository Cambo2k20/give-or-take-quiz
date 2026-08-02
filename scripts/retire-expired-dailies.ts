import { createClient } from "@supabase/supabase-js";

/**
 * Returns daily questions whose every scheduled date has passed to the
 * ordinary category pool, by calling
 * `public.retire_expired_daily_questions()`.
 *
 * Writing to the question bank is a maintenance action, so this needs the
 * service role key rather than the publishable one. Run it from the scheduled
 * refresh, which regenerates the offline bank straight afterwards: the flag
 * and the committed bank have to move together or a player is dealt a question
 * the server still refuses to score.
 */

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. The service role key is a secret: never put it in .env.example or a client build.",
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await supabase.rpc("retire_expired_daily_questions");

if (error) {
  console.error(`Could not retire expired dailies: ${error.message}`);
  process.exit(1);
}

const retired = typeof data === "number" ? data : 0;

console.log(
  retired === 0
    ? "No dailies were due for retirement."
    : `Retired ${retired} daily question(s) into the category pool.`,
);
