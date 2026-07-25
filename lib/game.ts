import { questions } from "./questions";
import type {
  GameMode,
  Question,
  QuestionCategory,
  QuestionUnit,
} from "./types";

// v3: the subject list changed again, so v2 best scores are recorded against
// categories that no longer exist.
export const STORAGE_KEY = "close-enough:v3";

export const QUESTIONS_PER_GAME = 10;

/** Every mode that draws from a single category, in mode-chooser order. */
export const CATEGORIES: readonly QuestionCategory[] = [
  "population",
  "history",
  "geography",
  "science",
  "animals",
  "space",
  "technology",
  "movies",
];

export const GAME_MODES: readonly GameMode[] = [...CATEGORIES, "mixed"];

export type BestScores = Record<GameMode, number>;

const EMPTY_BEST_SCORES: BestScores = {
  population: 0,
  history: 0,
  geography: 0,
  science: 0,
  animals: 0,
  space: 0,
  technology: 0,
  movies: 0,
  mixed: 0,
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function positionToValue(question: Question, position: number): number {
  const safePosition = clamp(position, 0, 1);
  if (question.scale === "log") {
    const logMin = Math.log(question.min);
    const logMax = Math.log(question.max);
    return Math.round(Math.exp(logMin + safePosition * (logMax - logMin)));
  }
  return Math.round(question.min + safePosition * (question.max - question.min));
}

export function valueToPosition(question: Question, value: number): number {
  const safeValue = clamp(value, question.min, question.max);
  if (question.scale === "log") {
    return (
      (Math.log(safeValue) - Math.log(question.min)) /
      (Math.log(question.max) - Math.log(question.min))
    );
  }
  return (safeValue - question.min) / (question.max - question.min);
}

export function scoreGuess(question: Question, guess: number): number {
  const distance = Math.abs(
    valueToPosition(question, question.answer) -
      valueToPosition(question, guess),
  );
  return Math.round(1000 * (1 - distance) ** 2);
}

export type AccuracyTier = {
  id: "bullseye" | "close" | "fair" | "wide" | "far";
  headline: string;
};

const ACCURACY_TIERS: ReadonlyArray<{ floor: number } & AccuracyTier> = [
  { floor: 980, id: "bullseye", headline: "Bullseye!" },
  { floor: 850, id: "close", headline: "So close!" },
  { floor: 600, id: "fair", headline: "Not bad." },
  { floor: 300, id: "wide", headline: "Off the mark." },
  { floor: 0, id: "far", headline: "Way off." },
];

/** Turns a round score into the verdict shown above the reveal. */
export function accuracyTier(points: number): AccuracyTier {
  const tier =
    ACCURACY_TIERS.find((candidate) => points >= candidate.floor) ??
    ACCURACY_TIERS[ACCURACY_TIERS.length - 1];
  return { id: tier.id, headline: tier.headline };
}

export function formatYear(value: number): string {
  if (value <= 0) {
    return `${value === 0 ? 1 : Math.abs(value)} BCE`;
  }
  return `${value} CE`;
}

/**
 * Appended after the formatted number. Empty where the prompt already names
 * what is being counted (`people`, `count`) or the formatter supplies its own
 * wording (`year`, `usd`).
 */
const UNIT_SUFFIXES: Record<QuestionUnit, string> = {
  people: "",
  year: "",
  count: "",
  usd: "",
  percent: "%",
  metre: " m",
  kilometre: " km",
  "square-kilometre": " km²",
  kilogram: " kg",
  tonne: " tonnes",
  second: " seconds",
  minute: " minutes",
  hour: " hours",
  day: " days",
  "duration-year": " years",
  kph: " km/h",
  celsius: " °C",
};

// Sliders only ever emit whole numbers, but a stored answer may be fractional.
const UNIT_FRACTION_DIGITS: Partial<Record<QuestionUnit, number>> = {
  percent: 1,
  celsius: 1,
};

export function formatQuestionValue(question: Question, value: number): string {
  if (question.unit === "year") return formatYear(value);

  const formatted = new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: UNIT_FRACTION_DIGITS[question.unit] ?? 0,
  }).format(value);

  if (question.unit === "usd") return `$${formatted}`;
  return `${formatted}${UNIT_SUFFIXES[question.unit]}`;
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function byCategory(category: QuestionCategory): Question[] {
  return questions.filter((question) => question.category === category);
}

/**
 * How many questions a mode can draw from. Derived rather than written down,
 * so the chooser cannot go stale the next time the bank grows.
 */
export function questionCount(mode: GameMode): number {
  return mode === "mixed" ? questions.length : byCategory(mode).length;
}

export function selectQuestions(
  mode: GameMode,
  rng: () => number = Math.random,
): Question[] {
  if (mode === "mixed") {
    // An even draw from every category, so no one topic dominates a round.
    // With more categories than there is room for, each contributes its share
    // and the shortfall is topped up from whatever is left, so a mixed round
    // is always a full ten rather than one per category.
    const perCategory = Math.floor(QUESTIONS_PER_GAME / CATEGORIES.length);
    const pools = CATEGORIES.map((category) =>
      shuffled(byCategory(category), rng),
    );

    const picked = pools.flatMap((pool) => pool.slice(0, perCategory));
    const pickedIds = new Set(picked.map((question) => question.id));

    // Drawn from a shuffle of the categories too, so the same topics do not
    // always supply the remainder.
    const remainder = shuffled(pools, rng)
      .flatMap((pool) => pool.slice(perCategory))
      .filter((question) => !pickedIds.has(question.id))
      .slice(0, QUESTIONS_PER_GAME - picked.length);

    return shuffled([...picked, ...remainder], rng);
  }

  return shuffled(byCategory(mode), rng).slice(0, QUESTIONS_PER_GAME);
}

export function readBestScores(storage?: StorageLike | null): BestScores {
  const target =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!target) return { ...EMPTY_BEST_SCORES };

  try {
    const raw = target.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_BEST_SCORES };
    const stored = JSON.parse(raw) as {
      version?: number;
      bestScores?: Partial<Record<GameMode, unknown>>;
    };
    if (stored.version !== 1 || !stored.bestScores) {
      return { ...EMPTY_BEST_SCORES };
    }

    // Each mode is read independently so a record written before a mode
    // existed keeps its other scores instead of resetting the lot.
    const scores = { ...EMPTY_BEST_SCORES };
    for (const mode of GAME_MODES) {
      const value = stored.bestScores[mode];
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        scores[mode] = value;
      }
    }
    return scores;
  } catch {
    return { ...EMPTY_BEST_SCORES };
  }
}

export function writeBestScores(
  scores: BestScores,
  storage?: StorageLike | null,
) {
  const target =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!target) return;

  try {
    target.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, bestScores: scores }),
    );
  } catch {
    // Disabled or full local storage must never interrupt play.
  }
}
