import { createClient } from "@supabase/supabase-js";
import { generatedQuestions } from "../lib/questions.generated";

/** Blocks deployment when the offline client and Supabase regular banks differ. */

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error(
    "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase
  .from("questions")
  .select("id")
  .eq("is_daily", false)
  .order("id");

if (error) {
  console.error(`Could not read question IDs: ${error.message}`);
  process.exit(1);
}

const bundled = new Set(generatedQuestions.map((question) => question.id));
const database = new Set((data ?? []).map((question) => question.id));
const missingFromDatabase = [...bundled].filter((id) => !database.has(id));
const missingFromBundle = [...database].filter((id) => !bundled.has(id));

if (missingFromDatabase.length || missingFromBundle.length) {
  if (missingFromDatabase.length) {
    console.error(
      `Bundled but absent from Supabase (${missingFromDatabase.length}):\n${missingFromDatabase.join("\n")}`,
    );
  }
  if (missingFromBundle.length) {
    console.error(
      `In Supabase but absent from the bundle (${missingFromBundle.length}):\n${missingFromBundle.join("\n")}`,
    );
  }
  process.exit(1);
}

console.log(`Question IDs match: ${bundled.size} regular questions.`);
