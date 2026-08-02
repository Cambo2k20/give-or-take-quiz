import { isPlayableCategory, shuffled, valueToPosition } from "./game";
import { questions } from "./questions";
import type { Question } from "./types";

/**
 * Survival: answer until a guess lands outside a tightening window.
 *
 * The window is measured in rail space — the same space the score uses — so it
 * means the same thing on a log question as on a linear one. It travels with
 * the player's thumb rather than sitting on the answer, because a window
 * centred on the answer would give the answer away.
 *
 * These four constants ARE the game. The SQL twin in submit_survival_run must
 * verify runs against exactly the same schedule, so if one changes, change the
 * other in the same commit (see the population-prompt rule for how they drift).
 */
export const SURVIVAL_START_WINDOW = 0.12;
export const SURVIVAL_WINDOW_STEP = 0.01;
export const SURVIVAL_TIGHTEN_EVERY = 3;
export const SURVIVAL_WINDOW_FLOOR = 0.04;

export const FORMAT_RECORDS_KEY = "give-or-take:formats:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

/** Half-width of the survival window for question `n` (1-based). */
export function survivalWindow(questionNumber: number): number {
  const steps = Math.floor(
    (Math.max(1, questionNumber) - 1) / SURVIVAL_TIGHTEN_EVERY,
  );
  return Math.max(
    SURVIVAL_WINDOW_FLOOR,
    SURVIVAL_START_WINDOW - SURVIVAL_WINDOW_STEP * steps,
  );
}

/**
 * How many questions until the window next narrows, counting the current one,
 * or null once it has reached the floor and will never narrow again.
 */
export function questionsUntilTighten(questionNumber: number): number | null {
  const n = Math.max(1, questionNumber);
  if (survivalWindow(n) <= SURVIVAL_WINDOW_FLOOR) return null;
  return SURVIVAL_TIGHTEN_EVERY - ((n - 1) % SURVIVAL_TIGHTEN_EVERY);
}

export type SurvivalVerdict = {
  survived: boolean;
  /** Rail distance between guess and answer, 0..1. */
  distance: number;
  /** The half-width the guess was judged against. */
  window: number;
};

/**
 * Lives or dies, in rail space. The client's view of the rule; the server
 * re-runs the same check over the submitted guesses and its answer is the one
 * the leaderboard believes.
 */
export function survivalVerdict(
  question: Question,
  guess: number,
  questionNumber: number,
): SurvivalVerdict {
  const distance = Math.abs(
    valueToPosition(question, question.answer) -
      valueToPosition(question, guess),
  );
  const window = survivalWindow(questionNumber);
  return { survived: distance <= window, distance, window };
}

/**
 * One run's question order: the whole bank, shuffled, no repeats. A run that
 * outlives the bank simply ends undefeated — nobody has ever been that good.
 * History is deliberately untouched, exactly as the daily leaves it alone.
 */
export function buildSurvivalDeck(rng: () => number = Math.random): Question[] {
  return shuffled(
    questions.filter((question) => isPlayableCategory(question.category)),
    rng,
  );
}

/** Device-local bests, one per format. The server board is the social layer. */
export type FormatRecords = {
  survivalBest: number;
};

const EMPTY_RECORDS: FormatRecords = { survivalBest: 0 };

export function readFormatRecords(storage?: StorageLike | null): FormatRecords {
  const target =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!target) return { ...EMPTY_RECORDS };

  try {
    const raw = target.getItem(FORMAT_RECORDS_KEY);
    if (!raw) return { ...EMPTY_RECORDS };
    const stored = JSON.parse(raw) as {
      version?: number;
      records?: Partial<FormatRecords>;
    };
    if (stored.version !== 1 || !stored.records) return { ...EMPTY_RECORDS };

    const best = stored.records.survivalBest;
    return {
      survivalBest:
        typeof best === "number" && Number.isFinite(best) && best >= 0
          ? Math.floor(best)
          : 0,
    };
  } catch {
    return { ...EMPTY_RECORDS };
  }
}

export function writeFormatRecords(
  records: FormatRecords,
  storage?: StorageLike | null,
) {
  const target =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!target) return;

  try {
    target.setItem(
      FORMAT_RECORDS_KEY,
      JSON.stringify({ version: 1, records }),
    );
  } catch {
    // Disabled or full local storage must never interrupt play.
  }
}

/** Folds a finished run into the records; only a longer run moves the best. */
export function recordSurvivalRun(
  records: FormatRecords,
  survived: number,
): FormatRecords {
  return {
    ...records,
    survivalBest: Math.max(records.survivalBest, Math.floor(survived)),
  };
}
