import { spawnSync } from "node:child_process";
import { generatedQuestions } from "../lib/questions.generated";

/**
 * Restores the committed offline bank into a freshly reset local Supabase
 * project. Historical base questions predate the migration-only workflow, so
 * migrations recreate the schema and later additive banks while this guarded
 * helper restores the older rows before regeneration or ID comparison.
 */

const rows = generatedQuestions.map((question) => ({
  id: question.id,
  category: question.category,
  measure: question.measure,
  subtype: question.subtype,
  prompt: question.prompt,
  answer: question.answer,
  min: question.min,
  max: question.max,
  scale: question.scale,
  unit: question.unit,
  reference_year: question.referenceYear ?? null,
  source_title: question.source.title,
  source_url: question.source.url,
  explanation: question.explanation,
  is_daily: false,
}));

const json = JSON.stringify(rows).replaceAll("'", "''");
const sql = `
insert into public.questions (
  id, category, measure, subtype, prompt, answer, min, max, scale, unit,
  reference_year, source_title, source_url, explanation, is_daily
)
select
  id, category, measure, subtype, prompt, answer, min, max, scale, unit,
  reference_year, source_title, source_url, explanation, is_daily
from jsonb_to_recordset('${json}'::jsonb) as row(
  id text,
  category public.question_category,
  measure public.question_measure,
  subtype public.question_subtype,
  prompt text,
  answer numeric,
  min numeric,
  max numeric,
  scale public.question_scale,
  unit public.question_unit,
  reference_year text,
  source_title text,
  source_url text,
  explanation text,
  is_daily boolean
)
on conflict (id) do nothing;
`;

const container = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_give-or-take-quiz";
const result = spawnSync(
  "docker",
  ["exec", "-i", container, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"],
  { input: sql, encoding: "utf8" },
);

if (result.status !== 0) {
  console.error(result.stderr || `docker exited with status ${result.status}`);
  process.exit(1);
}

console.log(`Seeded ${rows.length} committed questions into local Supabase.`);
