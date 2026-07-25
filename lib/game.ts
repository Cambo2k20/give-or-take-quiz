import { questions } from "./questions";
import type { GameMode, Question } from "./types";

export const STORAGE_KEY = "close-enough:v1";

export type BestScores = Record<GameMode, number>;

const EMPTY_BEST_SCORES: BestScores = {
  population: 0,
  history: 0,
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

export function formatYear(value: number): string {
  if (value <= 0) {
    return `${value === 0 ? 1 : Math.abs(value)} BCE`;
  }
  return `${value} CE`;
}

export function formatQuestionValue(question: Question, value: number): string {
  return question.unit === "year"
    ? formatYear(value)
    : new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value);
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function selectQuestions(
  mode: GameMode,
  rng: () => number = Math.random,
): Question[] {
  const population = questions.filter(
    (question) => question.category === "population",
  );
  const history = questions.filter(
    (question) => question.category === "history",
  );

  if (mode === "mixed") {
    return shuffled(
      [
        ...shuffled(population, rng).slice(0, 5),
        ...shuffled(history, rng).slice(0, 5),
      ],
      rng,
    );
  }

  return shuffled(
    mode === "population" ? population : history,
    rng,
  ).slice(0, 10);
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
      bestScores?: Partial<BestScores>;
    };
    if (
      stored.version !== 1 ||
      typeof stored.bestScores?.population !== "number" ||
      typeof stored.bestScores?.history !== "number" ||
      typeof stored.bestScores?.mixed !== "number"
    ) {
      return { ...EMPTY_BEST_SCORES };
    }
    return {
      population: stored.bestScores.population,
      history: stored.bestScores.history,
      mixed: stored.bestScores.mixed,
    };
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
