import { readFileSync } from "node:fs";
import { CATEGORY_REGISTRY, RANK_FLOORS } from "../lib/categories";
import { DAILY_QUESTIONS_PER_SET } from "../lib/daily";
import { QUESTIONS_PER_GAME } from "../lib/game";
import { questions } from "../lib/questions";
import { shapeErrors, validateQuestion } from "../lib/questionRules";
import type { DailySchedule, QuestionSubtype } from "../lib/types";

const errors: string[] = [];
const ids = new Set<string>();
const counts: Record<QuestionSubtype, number> = {
  country: 0,
  city: 0,
  event: 0,
  length: 0,
  area: 0,
  mass: 0,
  count: 0,
  percentage: 0,
  money: 0,
  duration: 0,
  speed: 0,
  temperature: 0,
};

const report = (id: string, message: string) => {
  errors.push(`${id}: ${message}`);
};

for (const question of questions) {
  if (ids.has(question.id)) {
    report(question.id, "id is duplicated");
  }
  ids.add(question.id);
  counts[question.subtype] += 1;
  validateQuestion(question, report);
}

if (counts.country < 15) {
  errors.push(`question bank has ${counts.country} countries; expected at least 15`);
}
if (counts.city < 15) {
  errors.push(`question bank has ${counts.city} cities; expected at least 15`);
}

// Incubating subjects need one safe test round. A live subject needs four
// five-question rounds before repetition; changing its registry entry to live
// before reaching that launch threshold therefore fails every production build.
for (const category of CATEGORY_REGISTRY) {
  const total = questions.filter(
    (question) => question.category === category.id,
  ).length;
  const minimum = category.availability === "live" ? 20 : QUESTIONS_PER_GAME;
  if (total < minimum) {
    errors.push(
      `question bank has ${total} ${category.id} records; ${category.availability} categories require at least ${minimum}`,
    );
  }

  const titleRanks = category.rankTitles.map((entry) => entry.rank);
  if (
    titleRanks.length !== RANK_FLOORS.length ||
    RANK_FLOORS.some((rank) => !titleRanks.includes(rank))
  ) {
    errors.push(`${category.id} does not define all six rank-title floors`);
  }
}

// Every subtype needs at least a full round of its own so a mode can never
// deal the same question twice.
for (const [subtype, total] of Object.entries(counts)) {
  if (total < 10) {
    errors.push(`question bank has ${total} ${subtype} records; expected at least 10`);
  }
}

// ── Daily sets ──────────────────────────────────────────────────────────────
//
// Read off disk rather than imported, so the validator checks the file the app
// will actually bundle.

const DAILY_PATH = new URL("../data/daily-sets.json", import.meta.url);
const bankIds = new Set(questions.map((question) => question.id));
const bankPrompts = new Set(
  questions.map((question) => question.prompt.trim().toLowerCase()),
);

let daily: DailySchedule | null = null;
try {
  daily = JSON.parse(readFileSync(DAILY_PATH, "utf8")) as DailySchedule;
} catch (cause) {
  errors.push(
    `data/daily-sets.json could not be read: ${(cause as Error).message}`,
  );
}

let dailyQuestionCount = 0;

if (daily) {
  if (daily.version !== 1) {
    errors.push("data/daily-sets.json must declare version 1");
  }
  if (!Array.isArray(daily.sets)) {
    errors.push("data/daily-sets.json must have a sets array");
    daily = null;
  }
}

if (daily) {
  const seenDates = new Set<string>();
  const seenDailyIds = new Set<string>();

  for (const set of daily.sets) {
    const where = `daily ${set.date ?? "(undated)"}`;

    if (typeof set.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(set.date)) {
      errors.push(`${where}: date must be an ISO YYYY-MM-DD string`);
    } else if (Number.isNaN(Date.parse(`${set.date}T00:00:00Z`))) {
      errors.push(`${where}: date is not a real calendar day`);
    }

    if (seenDates.has(set.date)) {
      errors.push(`${where}: two sets share this date`);
    }
    seenDates.add(set.date);

    if (!Array.isArray(set.questions)) {
      errors.push(`${where}: questions must be an array`);
      continue;
    }

    // A fixed length is what makes daily scores comparable between players.
    if (set.questions.length !== DAILY_QUESTIONS_PER_SET) {
      errors.push(
        `${where}: has ${set.questions.length} questions; every set needs exactly ${DAILY_QUESTIONS_PER_SET}`,
      );
    }

    const withinSet = new Set<string>();
    for (const question of set.questions) {
      dailyQuestionCount += 1;

      if (withinSet.has(question.id)) {
        errors.push(`${where}: ${question.id} appears twice in the same set`);
      }
      withinSet.add(question.id);

      if (seenDailyIds.has(question.id)) {
        errors.push(`${where}: ${question.id} is already used by another date`);
      }
      seenDailyIds.add(question.id);

      // Daily questions are written for the daily; a shared record would leak
      // the answer to anyone who had met it in category play.
      if (bankIds.has(question.id)) {
        errors.push(`${where}: ${question.id} also exists in the category bank`);
      }
      if (bankPrompts.has(question.prompt?.trim().toLowerCase())) {
        errors.push(
          `${where}: ${question.id} repeats a prompt from the category bank`,
        );
      }

      // A mistyped field would throw inside the semantic checks, so report the
      // shape and move on rather than taking the whole run down with it.
      const malformed = shapeErrors(question);
      if (malformed.length > 0) {
        for (const problem of malformed) {
          errors.push(`${where} / ${question.id ?? "(unnamed)"}: ${problem}`);
        }
        continue;
      }

      validateQuestion(question, (id, message) =>
        errors.push(`${where} / ${id}: ${message}`),
      );
    }
  }
}

if (errors.length > 0) {
  console.error(`Question data validation failed with ${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  const breakdown = Object.entries(counts)
    .map(([subtype, total]) => `${total} ${subtype}`)
    .join(", ");
  const dailyTotal = daily?.sets.length ?? 0;
  console.log(`Validated ${questions.length} questions: ${breakdown}.`);
  console.log(
    `Validated ${dailyTotal} daily set(s) holding ${dailyQuestionCount} daily-only questions.`,
  );
}
