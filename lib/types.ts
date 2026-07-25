/**
 * What a question is about. This is the axis players choose between, and it is
 * deliberately separate from `QuestionMeasure`: "how tall is the Burj Khalifa"
 * and "what did the Golden Gate Bridge cost" are both about the built world
 * even though one is a length and the other a sum of money.
 */
export type QuestionCategory =
  | "geography"
  | "history"
  | "science"
  | "space"
  | "human-world";

export type GameMode = QuestionCategory | "mixed";

/**
 * What a question measures. Groups the subtypes, and drives validation and
 * slider behaviour rather than anything the player picks.
 */
export type QuestionMeasure =
  | "population"
  | "history"
  | "size"
  | "quantity"
  | "physics";

export type QuestionSubtype =
  | "country"
  | "city"
  | "event"
  | "length"
  | "area"
  | "mass"
  | "count"
  | "percentage"
  | "money"
  | "duration"
  | "speed"
  | "temperature";

export type QuestionScale = "linear" | "log";

/**
 * `year` is a point on the calendar and renders as CE/BCE. A span of years is
 * `duration-year`, so "5,730 years" never renders as "5,730 CE".
 */
export type QuestionUnit =
  | "people"
  | "year"
  | "percent"
  | "metre"
  | "kilometre"
  | "square-kilometre"
  | "kilogram"
  | "tonne"
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "duration-year"
  | "kph"
  | "celsius"
  | "usd"
  | "count";

export interface QuestionSource {
  title: string;
  url: string;
}

export interface Question {
  id: string;
  category: QuestionCategory;
  measure: QuestionMeasure;
  subtype: QuestionSubtype;
  prompt: string;
  answer: number;
  min: number;
  max: number;
  scale: QuestionScale;
  unit: QuestionUnit;
  referenceYear?: string;
  source: QuestionSource;
  explanation: string;
}
