export type GameMode = "population" | "history" | "mixed";

export type QuestionCategory = Exclude<GameMode, "mixed">;
export type QuestionSubtype = "country" | "city" | "event";
export type QuestionScale = "linear" | "log";
export type QuestionUnit = "people" | "year";

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
