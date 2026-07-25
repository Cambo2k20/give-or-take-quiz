import { questions } from "../lib/questions";
import type { QuestionSubtype } from "../lib/types";

const errors: string[] = [];
const ids = new Set<string>();
const counts: Record<QuestionSubtype, number> = {
  country: 0,
  city: 0,
  event: 0,
};

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

  if (question.category === "population") {
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

  if (question.category === "history") {
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
}

if (questions.length < 60) {
  errors.push(`question bank has ${questions.length} records; expected at least 60`);
}
if (counts.country < 15) {
  errors.push(`question bank has ${counts.country} countries; expected at least 15`);
}
if (counts.city < 15) {
  errors.push(`question bank has ${counts.city} cities; expected at least 15`);
}
if (counts.event < 30) {
  errors.push(`question bank has ${counts.event} events; expected at least 30`);
}

if (errors.length > 0) {
  console.error(`Question data validation failed with ${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${questions.length} questions: ${counts.country} countries, ${counts.city} cities, ${counts.event} historic events.`,
  );
}
