import schedule from "../data/daily-sets.json";
import type { DailySchedule, DailySet } from "./types";

export const DAILY_PROGRESS_KEY = "give-or-take:daily:v1";

export const DAILY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Shorter than a category round on purpose: the daily is meant to be a habit,
 * and five questions is a thing you do rather than a thing you sit down for.
 */
export const DAILY_QUESTIONS_PER_SET = 5;

export const DAILY_MAX_SCORE = DAILY_QUESTIONS_PER_SET * 1000;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

/**
 * Per-date scores rather than a single best, because two dailies are different
 * puzzles: a best-ever daily score would compare an easy day with a hard one.
 */
export type DailyProgress = {
  current: number;
  longest: number;
  lastPlayedDate: string | null;
  scores: Record<string, number>;
};

const EMPTY_PROGRESS: DailyProgress = {
  current: 0,
  longest: 0,
  lastPlayedDate: null,
  scores: {},
};

// Validated by `npm run validate:data` before every build, so the shape is
// trusted here exactly as the generated question bank is.
const loaded = schedule as DailySchedule;

/** Every published set, oldest first. */
export const dailySets: readonly DailySet[] = [...loaded.sets].sort((a, b) =>
  a.date.localeCompare(b.date),
);

/**
 * The player's own calendar day. Deliberately local rather than UTC: a daily
 * that flips at midnight somewhere else is confusing to everyone but that zone.
 */
export function todayIso(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** The day before `date`, as an ISO string. */
export function previousDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day));
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous.toISOString().slice(0, 10);
}

export function dailySetFor(date: string): DailySet | null {
  return dailySets.find((set) => set.date === date) ?? null;
}

export function todaysDailySet(now: Date = new Date()): DailySet | null {
  return dailySetFor(todayIso(now));
}

/**
 * Past and present sets, newest first. A set dated in the future is withheld
 * until its day arrives, so the schedule can be committed well ahead of time.
 */
export function playableDailyDates(now: Date = new Date()): string[] {
  const today = todayIso(now);
  return dailySets
    .filter((set) => set.date <= today)
    .map((set) => set.date)
    .reverse();
}

export function readDailyProgress(storage?: StorageLike | null): DailyProgress {
  const target =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!target) return { ...EMPTY_PROGRESS, scores: {} };

  try {
    const raw = target.getItem(DAILY_PROGRESS_KEY);
    if (!raw) return { ...EMPTY_PROGRESS, scores: {} };
    const stored = JSON.parse(raw) as {
      version?: number;
      progress?: Partial<DailyProgress>;
    };
    if (stored.version !== 1 || !stored.progress) {
      return { ...EMPTY_PROGRESS, scores: {} };
    }

    const { current, longest, lastPlayedDate, scores } = stored.progress;
    const validScores: Record<string, number> = {};
    for (const [date, score] of Object.entries(scores ?? {})) {
      if (
        DAILY_DATE_PATTERN.test(date) &&
        typeof score === "number" &&
        Number.isFinite(score) &&
        score >= 0
      ) {
        validScores[date] = score;
      }
    }

    return {
      current: countOrZero(current),
      longest: countOrZero(longest),
      lastPlayedDate:
        typeof lastPlayedDate === "string" &&
        DAILY_DATE_PATTERN.test(lastPlayedDate)
          ? lastPlayedDate
          : null,
      scores: validScores,
    };
  } catch {
    return { ...EMPTY_PROGRESS, scores: {} };
  }
}

function countOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

export function writeDailyProgress(
  progress: DailyProgress,
  storage?: StorageLike | null,
) {
  const target =
    storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!target) return;

  try {
    target.setItem(
      DAILY_PROGRESS_KEY,
      JSON.stringify({ version: 1, progress }),
    );
  } catch {
    // Disabled or full local storage must never interrupt play.
  }
}

/**
 * Folds a finished daily into the player's progress.
 *
 * Only today's puzzle moves the streak. Replaying the archive still records the
 * score for that date, because a streak you could top up by grinding old days
 * is not a streak.
 */
export function recordDailyResult(
  progress: DailyProgress,
  playedDate: string,
  score: number,
  now: Date = new Date(),
): DailyProgress {
  const best = Math.max(progress.scores[playedDate] ?? 0, score);
  const scores = { ...progress.scores, [playedDate]: best };

  if (playedDate !== todayIso(now)) {
    return { ...progress, scores };
  }

  // Replaying today must not count twice.
  if (progress.lastPlayedDate === playedDate) {
    return { ...progress, scores };
  }

  const continues = progress.lastPlayedDate === previousDay(playedDate);
  const current = continues ? progress.current + 1 : 1;

  return {
    current,
    longest: Math.max(progress.longest, current),
    lastPlayedDate: playedDate,
    scores,
  };
}

/**
 * A streak only survives while yesterday's or today's puzzle is the last one
 * played; otherwise it is already broken and should read as zero before the
 * player starts.
 */
export function activeStreak(
  progress: DailyProgress,
  now: Date = new Date(),
): number {
  const today = todayIso(now);
  if (progress.lastPlayedDate === today) return progress.current;
  if (progress.lastPlayedDate === previousDay(today)) return progress.current;
  return 0;
}
