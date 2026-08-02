import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { questions as bundledQuestions } from "../lib/questions";
import { shapeErrors, validateQuestion } from "../lib/questionRules";
import type { DailySchedule, Question } from "../lib/types";

/**
 * Turns a Question Lab export into an additive Supabase migration.
 *
 * Postgres is the source of truth for the question bank (see
 * `scripts/generate-questions.ts`), so this script never touches
 * `lib/questions.generated.ts`. It only writes a migration file: applying it
 * to the database, then regenerating and committing, stays a deliberate,
 * separate step (`npm run questions:verify`).
 *
 * Usage: npm run questions:import -- path/to/approved-pack.json
 */

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: npm run questions:import -- <path-to-pack.json>");
  process.exit(1);
}

let raw: string;
try {
  raw = readFileSync(inputPath, "utf8");
} catch (cause) {
  console.error(`Could not read ${inputPath}: ${(cause as Error).message}`);
  process.exit(1);
}

let parsed: unknown;
try {
  parsed = JSON.parse(raw);
} catch (cause) {
  console.error(`${inputPath} is not valid JSON: ${(cause as Error).message}`);
  process.exit(1);
}

// Accept either a bare array or a Question Lab export wrapper.
const candidates: unknown[] = Array.isArray(parsed)
  ? parsed
  : Array.isArray((parsed as { questions?: unknown })?.questions)
    ? ((parsed as { questions: unknown[] }).questions)
    : [];

if (candidates.length === 0) {
  console.error(
    `${inputPath} contains no questions (expected an array, or an object with a "questions" array).`,
  );
  process.exit(1);
}

const errors: string[] = [];
const pack: Question[] = [];

for (const [index, candidate] of candidates.entries()) {
  const where = (candidate as { id?: unknown })?.id ?? `pack[${index}]`;
  const malformed = shapeErrors(candidate as Question);
  if (malformed.length > 0) {
    for (const problem of malformed) {
      errors.push(`${where}: ${problem}`);
    }
    continue;
  }
  pack.push(candidate as Question);
}

for (const question of pack) {
  validateQuestion(question, (id, message) => errors.push(`${id}: ${message}`));
}

// Duplicates within the pack itself.
const seenInPack = new Set<string>();
for (const question of pack) {
  if (seenInPack.has(question.id)) {
    errors.push(`${question.id}: id is duplicated within the pack`);
  }
  seenInPack.add(question.id);
}

// Duplicates against the bundled category bank.
const bundledIds = new Set(bundledQuestions.map((question) => question.id));
const bundledPrompts = new Set(
  bundledQuestions.map((question) => question.prompt.trim().toLowerCase()),
);
for (const question of pack) {
  if (bundledIds.has(question.id)) {
    errors.push(`${question.id}: id already exists in the bundled question bank`);
  }
  if (bundledPrompts.has(question.prompt.trim().toLowerCase())) {
    errors.push(`${question.id}: prompt already exists in the bundled question bank`);
  }
}

// Duplicates against the daily-only bank: daily questions must never be
// reused in category play, so a pack destined for category rounds must not
// collide with them either.
const DAILY_PATH = new URL("../data/daily-sets.json", import.meta.url);
try {
  const daily = JSON.parse(readFileSync(DAILY_PATH, "utf8")) as DailySchedule;
  const dailyIds = new Set(
    daily.sets.flatMap((set) => set.questions.map((question) => question.id)),
  );
  const dailyPrompts = new Set(
    daily.sets.flatMap((set) =>
      set.questions.map((question) => question.prompt.trim().toLowerCase()),
    ),
  );
  for (const question of pack) {
    if (dailyIds.has(question.id)) {
      errors.push(`${question.id}: id already exists in the daily-only bank`);
    }
    if (dailyPrompts.has(question.prompt.trim().toLowerCase())) {
      errors.push(`${question.id}: prompt already exists in the daily-only bank`);
    }
  }
} catch (cause) {
  errors.push(`Could not read data/daily-sets.json: ${(cause as Error).message}`);
}

if (errors.length > 0) {
  console.error(`Import rejected with ${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

/** Postgres string literal, quoting any embedded apostrophes. */
const lit = (value: string) => `'${value.replace(/'/g, "''")}'`;
const nullable = (value: string | undefined) =>
  value === undefined || value === null ? "null" : lit(value);

function questionRow(question: Question) {
  return `  (${[
    lit(question.id),
    lit(question.category),
    lit(question.measure),
    lit(question.subtype),
    lit(question.prompt),
    question.answer,
    question.min,
    question.max,
    lit(question.scale),
    lit(question.unit),
    nullable(question.referenceYear),
    lit(question.source.title),
    lit(question.source.url),
    lit(question.explanation),
    "false",
  ].join(", ")})`;
}

const categories = [...new Set(pack.map((question) => question.category))].sort();
const slug = categories.join("-").slice(0, 40);

const now = new Date();
const timestamp = [
  now.getUTCFullYear(),
  String(now.getUTCMonth() + 1).padStart(2, "0"),
  String(now.getUTCDate()).padStart(2, "0"),
  String(now.getUTCHours()).padStart(2, "0"),
  String(now.getUTCMinutes()).padStart(2, "0"),
  String(now.getUTCSeconds()).padStart(2, "0"),
].join("");

const migrationsDir = new URL("../supabase/migrations/", import.meta.url);
mkdirSync(migrationsDir, { recursive: true });
const outputPath = new URL(
  `${timestamp}_add_${slug}_questions.sql`,
  migrationsDir,
);

const sql = `-- Imported by scripts/import-questions.ts from ${inputPath}.

insert into public.questions (
  id, category, measure, subtype, prompt, answer, min, max, scale, unit,
  reference_year, source_title, source_url, explanation, is_daily
) values
${pack.map(questionRow).join(",\n")}
on conflict (id) do nothing;
`;

writeFileSync(outputPath, sql, "utf8");

const relativePath = `supabase/migrations/${timestamp}_add_${slug}_questions.sql`;
console.log(`Wrote ${relativePath} with ${pack.length} question(s).`);
console.log(
  "Apply this migration to Supabase, then run `npm run questions:verify` before committing.",
);
