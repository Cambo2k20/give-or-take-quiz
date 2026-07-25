import { CATEGORIES, QUESTIONS_PER_GAME } from "../lib/game";
import { questions } from "../lib/questions";
import type {
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

const VALID_CATEGORIES = new Set<string>(CATEGORIES);

const report = (id: string, message: string) => {
  errors.push(`${id}: ${message}`);
};

for (const question of questions) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(question.id)) {
    report(question.id, "id must be non-empty kebab-case");
  }

  if (ids.has(question.id)) {
    report(question.id, "id is duplicated");
  }
  ids.add(question.id);
  counts[question.subtype] += 1;

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

    const requiredDefinition =
      question.subtype === "country" ? "country-total" : "city proper";
    if (!question.prompt.toLowerCase().includes(requiredDefinition)) {
      report(
        question.id,
        `population prompt must state the ${requiredDefinition} definition`,
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

if (counts.country < 15) {
  errors.push(`question bank has ${counts.country} countries; expected at least 15`);
}
if (counts.city < 15) {
  errors.push(`question bank has ${counts.city} cities; expected at least 15`);
}

// Each category is a mode of its own, so it must be able to deal a full round
// without asking the same question twice.
for (const category of CATEGORIES) {
  const total = questions.filter(
    (question) => question.category === category,
  ).length;
  if (total < QUESTIONS_PER_GAME) {
    errors.push(
      `question bank has ${total} ${category} records; expected at least ${QUESTIONS_PER_GAME}`,
    );
  }
}

// Every subtype needs at least a full round of its own so a mode can never
// deal the same question twice.
for (const [subtype, total] of Object.entries(counts)) {
  if (total < 10) {
    errors.push(`question bank has ${total} ${subtype} records; expected at least 10`);
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
  console.log(`Validated ${questions.length} questions: ${breakdown}.`);
}
