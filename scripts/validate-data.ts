import { readFileSync } from "node:fs";
import {
  ALL_CATEGORIES,
  CATEGORY_REGISTRY,
  RANK_FLOORS,
} from "../lib/categories";
import { DAILY_QUESTIONS_PER_SET } from "../lib/daily";
import { QUESTIONS_PER_GAME } from "../lib/game";
import { questions } from "../lib/questions";
import type {
  DailySchedule,
  Question,
  QuestionMeasure,
  QuestionSubtype,
  QuestionUnit,
} from "../lib/types";

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

/** Every subtype belongs to exactly one measure and one set of units. */
const SUBTYPE_RULES: Record<
  QuestionSubtype,
  { measure: QuestionMeasure; units: readonly QuestionUnit[] }
> = {
  country: { measure: "population", units: ["people"] },
  city: { measure: "population", units: ["people"] },
  event: { measure: "history", units: ["year"] },
  length: { measure: "size", units: ["metre", "kilometre"] },
  area: { measure: "size", units: ["square-kilometre"] },
  mass: { measure: "size", units: ["kilogram", "tonne"] },
  count: { measure: "quantity", units: ["count"] },
  percentage: { measure: "quantity", units: ["percent"] },
  money: { measure: "quantity", units: ["usd"] },
  duration: {
    measure: "physics",
    units: ["second", "minute", "hour", "day", "duration-year"],
  },
  speed: { measure: "physics", units: ["kph"] },
  temperature: { measure: "physics", units: ["celsius"] },
};

const VALID_CATEGORIES = new Set<string>(ALL_CATEGORIES);

const report = (id: string, message: string) => {
  errors.push(`${id}: ${message}`);
};

/**
 * Field types, checked before anything reads them.
 *
 * The category bank arrives from Postgres through a typed generator, but the
 * daily schedule is hand-authored JSON: every field here could be any shape, or
 * missing. Without this pass a single mistyped value throws and hides every
 * other problem in the file.
 */
function shapeErrors(question: Question): string[] {
  const problems: string[] = [];
  const text = (name: keyof Question) => {
    if (typeof question[name] !== "string" || !question[name]) {
      problems.push(`${name} must be a non-empty string`);
    }
  };
  const finite = (name: "answer" | "min" | "max") => {
    if (typeof question[name] !== "number" || !Number.isFinite(question[name])) {
      problems.push(`${name} must be a number`);
    }
  };

  text("id");
  text("category");
  text("measure");
  text("subtype");
  text("prompt");
  text("unit");
  text("explanation");
  finite("answer");
  finite("min");
  finite("max");

  if (question.scale !== "linear" && question.scale !== "log") {
    problems.push('scale must be "linear" or "log"');
  }

  // Optional, but a year written as 2022 rather than "2022" is the easy slip.
  if (question.referenceYear !== undefined) {
    if (typeof question.referenceYear !== "string") {
      problems.push(
        `referenceYear must be a quoted string, got ${typeof question.referenceYear}`,
      );
    }
  }

  const source = question.source as unknown;
  if (!source || typeof source !== "object") {
    problems.push("source must be an object with a title and url");
  } else {
    const { title, url } = source as { title?: unknown; url?: unknown };
    if (typeof title !== "string") problems.push("source.title must be a string");
    if (typeof url !== "string") problems.push("source.url must be a string");
  }

  return problems;
}

/**
 * Every rule that applies to a single record, wherever it is banked. The daily
 * bank is held to exactly the same standard as the category bank.
 */
function validateQuestion(
  question: Question,
  report: (id: string, message: string) => void,
) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(question.id)) {
    report(question.id, "id must be non-empty kebab-case");
  }

  if (
    !Number.isFinite(question.min) ||
    !Number.isFinite(question.max) ||
    question.min >= question.max
  ) {
    report(question.id, "slider bounds must be finite with min < max");
  }

  if (!Number.isFinite(question.answer)) {
    report(question.id, "answer must be finite");
  } else if (
    question.answer < question.min ||
    question.answer > question.max
  ) {
    report(question.id, "answer must fall within the slider bounds");
  }

  if (question.scale === "log" && question.min <= 0) {
    report(question.id, "a logarithmic slider requires min > 0");
  }

  if (question.prompt.trim().length < 15) {
    report(question.id, "prompt is missing or too short");
  }

  if (question.explanation.trim().length < 20) {
    report(question.id, "explanation is missing or too short");
  }

  if (question.source.title.trim().length < 5) {
    report(question.id, "source title is missing or too short");
  }

  try {
    const url = new URL(question.source.url);
    if (!["http:", "https:"].includes(url.protocol)) {
      report(question.id, "source URL must use HTTP or HTTPS");
    }
    if (!url.hostname.includes(".")) {
      report(question.id, "source URL must have a public hostname");
    }
  } catch {
    report(question.id, "source URL is invalid");
  }

  if (!VALID_CATEGORIES.has(question.category)) {
    report(question.id, `${question.category} is not a known category`);
  }

  if (question.measure === "population") {
    if (!["country", "city"].includes(question.subtype)) {
      report(question.id, "population questions must be country or city");
    }
    if (question.unit !== "people") {
      report(question.id, "population questions must use people as the unit");
    }
    if (!question.referenceYear) {
      report(question.id, "population questions require a referenceYear");
    }

    const referenceYear = question.referenceYear?.match(/\b\d{4}\b/)?.[0];
    if (!referenceYear || !question.prompt.includes(referenceYear)) {
      report(
        question.id,
        "population prompt must include its four-digit reference year",
      );
    }

    // A population prompt has to pin down what is being counted. The UN series
    // needs the "country-total" wording to rule out a city or metro reading. A
    // named census already carries its own scope and its own published figure,
    // so it states the definition just as firmly.
    const prompt = question.prompt.toLowerCase();
    const statesDefinition =
      question.subtype === "country"
        ? prompt.includes("country-total") || /\bcensus\b/.test(prompt)
        : prompt.includes("city proper");

    if (!statesDefinition) {
      report(
        question.id,
        question.subtype === "country"
          ? "population prompt must say country-total, or name the census it counts"
          : "population prompt must state the city proper definition",
      );
    }
  }

  if (question.measure === "history") {
    if (question.subtype !== "event") {
      report(question.id, "history questions must use the event subtype");
    }
    if (question.unit !== "year" || !Number.isInteger(question.answer)) {
      report(question.id, "history answers must be integer years");
    }
    if (question.scale !== "linear") {
      report(question.id, "history year sliders must use a linear scale");
    }
  }

  const rule = SUBTYPE_RULES[question.subtype];
  if (rule) {
    if (question.measure !== rule.measure) {
      report(
        question.id,
        `subtype ${question.subtype} belongs to the ${rule.measure} measure`,
      );
    }
    if (!rule.units.includes(question.unit)) {
      report(
        question.id,
        `subtype ${question.subtype} cannot use the ${question.unit} unit`,
      );
    }
  }

  // A percentage slider that does not span 0-100 misrepresents the quantity.
  if (question.subtype === "percentage") {
    if (question.min !== 0 || question.max !== 100) {
      report(question.id, "percentage sliders must span 0 to 100");
    }
  }

  // Every money question is a historical figure, so it must say which year.
  if (question.subtype === "money" && !question.referenceYear) {
    report(question.id, "money questions require a referenceYear");
  }
}

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
