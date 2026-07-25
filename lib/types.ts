export type GameMode =
  | "population"
  | "history"
  | "size"
  | "quantity"
  | "physics"
  | "mixed";

export type QuestionCategory = Exclude<GameMode, "mixed">;

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
