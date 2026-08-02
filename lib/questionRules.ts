import { ALL_CATEGORIES } from "./categories";
import type { Question, QuestionMeasure, QuestionSubtype, QuestionUnit } from "./types";

/**
 * The question validation rules, shared between `scripts/validate-data.ts`
 * (which checks the committed bank) and `scripts/import-questions.ts` (which
 * checks a new pack before it becomes a migration). Keeping one copy means a
 * rule added here protects both paths instead of only the one someone
 * remembered to update.
 */

/** Every subtype belongs to exactly one measure and one set of units. */
export const SUBTYPE_RULES: Record<
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

/**
 * Field types, checked before anything reads them.
 *
 * The category bank arrives from Postgres through a typed generator, but
 * hand-authored input (the daily schedule, or an imported pack) could have
 * any shape, or a missing field. Without this pass a single mistyped value
 * throws and hides every other problem in the file.
 */
export function shapeErrors(question: Question): string[] {
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
 * Every rule that applies to a single record, wherever it is banked. The
 * daily bank, the category bank, and any imported pack are held to exactly
 * the same standard.
 */
export function validateQuestion(
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
