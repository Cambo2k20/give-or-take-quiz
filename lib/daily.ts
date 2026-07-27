import schedule from "../data/daily-sets.json";
import type { DailySchedule, DailySet } from "./types";

export const DAILY_PROGRESS_KEY = "give-or-take:daily:v2";

export const DAILY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Shorter than a category round on purpose: the daily is meant to be a habit,
 * and five questions is a thing you do rather than a thing you sit down for.
 */
export const DAILY_QUESTIONS_PER_SET = 5;

export const DAILY_MAX_SCORE = DAILY_QUESTIONS_PER_SET * 1000;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

/**
 * What is known about one date. `officialScore` is null until an official
 * result exists — locally, from the server, or both — because "0" is a real
 * score and must not be mistaken for "not played".
 */
export type DailyDateProgress = {
  officialScore: number | null;
  practiceBest: number | null;
  attemptCount: number;
};

/**
 * Per-date records rather than a single best, because two dailies are
 * different puzzles: a best-ever daily score would compare an easy day with a
 * hard one.
 */
export type DailyProgress = {
  current: number;
  longest: number;
  lastPlayedDate: string | null;
  dates: Record<string, DailyDateProgress>;
};

const EMPTY_DATE_PROGRESS: DailyDateProgress = {
  officialScore: null,
  practiceBest: null,
  attemptCount: 0,
};

const EMPTY_PROGRESS: DailyProgress = {
  current: 0,
  longest: 0,
  lastPlayedDate: null,
  dates: {},
};

/** What the server decided about one attempt, however that was learned. */
export type OfficialDailyResult = {
  /** The score for the officially-counted attempt, whoever submitted it. */
  score: number;
  /** Total attempts on this date, official and practice — server truth when
   * available, so reconciliation does not have to guess. */
  attempts: number;
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
  if (!target) return { ...EMPTY_PROGRESS, dates: {} };

  try {
    const raw = target.getItem(DAILY_PROGRESS_KEY);
    if (!raw) return { ...EMPTY_PROGRESS, dates: {} };
    const stored = JSON.parse(raw) as {
      version?: number;
      progress?: Partial<DailyProgress>;
    };
    if (stored.version !== 2 || !stored.progress) {
      return { ...EMPTY_PROGRESS, dates: {} };
    }

    const { current, longest, lastPlayedDate, dates } = stored.progress;
    const validDates: Record<string, DailyDateProgress> = {};
    for (const [date, entry] of Object.entries(
      (dates ?? {}) as Record<string, unknown>,
    )) {
      if (!DAILY_DATE_PATTERN.test(date)) continue;
      const parsed = parseDateProgress(entry);
      if (parsed) validDates[date] = parsed;
    }

    return {
      current: countOrZero(current),
      longest: countOrZero(longest),
      lastPlayedDate:
        typeof lastPlayedDate === "string" &&
        DAILY_DATE_PATTERN.test(lastPlayedDate)
          ? lastPlayedDate
          : null,
      dates: validDates,
    };
  } catch {
    return { ...EMPTY_PROGRESS, dates: {} };
  }
}

function parseDateProgress(value: unknown): DailyDateProgress | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Record<keyof DailyDateProgress, unknown>>;

  const score = (name: "officialScore" | "practiceBest") => {
    const raw = candidate[name];
    return typeof raw === "number" && Number.isFinite(raw) && raw >= 0
      ? raw
      : null;
  };

  return {
    officialScore: score("officialScore"),
    practiceBest: score("practiceBest"),
    attemptCount: countOrZero(candidate.attemptCount),
  };
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
      JSON.stringify({ version: 2, progress }),
    );
  } catch {
    // Disabled or full local storage must never interrupt play.
  }
}

/**
 * Extends, starts, or leaves the streak alone, then returns the updated
 * per-date map alongside it. Shared by every path that can learn a date is
 * now officially covered, so the "credit once" rule cannot drift between them.
 */
function creditStreakOnce(
  progress: DailyProgress,
  dates: Record<string, DailyDateProgress>,
  date: string,
  now: Date,
): DailyProgress {
  if (date !== todayIso(now) || progress.lastPlayedDate === date) {
    return { ...progress, dates };
  }

  const continues = progress.lastPlayedDate === previousDay(date);
  const current = continues ? progress.current + 1 : 1;

  return {
    current,
    longest: Math.max(progress.longest, current),
    lastPlayedDate: date,
    dates,
  };
}

/**
 * Folds a finished daily into progress when there is no server to defer to —
 * a signed-out player, or the leaderboard disabled entirely. The first play of
 * a date is treated as official by convention, since nothing else can decide.
 *
 * Only today's puzzle moves the streak. Replaying the archive still records
 * the score for that date, because a streak you could top up by grinding old
 * days is not a streak.
 */
export function recordLocalDailyResult(
  progress: DailyProgress,
  playedDate: string,
  score: number,
  now: Date = new Date(),
): DailyProgress {
  const prior = progress.dates[playedDate] ?? EMPTY_DATE_PROGRESS;
  const isFirstPlay = prior.officialScore === null;

  const dates = {
    ...progress.dates,
    [playedDate]: isFirstPlay
      ? { ...prior, officialScore: score, attemptCount: prior.attemptCount + 1 }
      : {
          ...prior,
          practiceBest: Math.max(prior.practiceBest ?? 0, score),
          attemptCount: prior.attemptCount + 1,
        },
  };

  return creditStreakOnce(progress, dates, playedDate, now);
}

/**
 * Folds in what the server actually decided about a date — the authoritative
 * counterpart to `recordLocalDailyResult`, used once a round has been
 * submitted and after checking whether today is already covered elsewhere.
 *
 * A `null` result means the server has nothing to say (not signed in, or
 * nothing found yet) and progress is returned unchanged.
 *
 * This does not undo an optimistic local streak advance if two devices submit
 * within the same window and this device's guess turns out to have been
 * wrong — that race is rare enough not to warrant unwinding a streak the
 * player already saw confirmed on screen. The on-load check this pairs with
 * closes the realistic version of the gap: a device that has not played yet
 * finds out before it tries to.
 */
export function applyOfficialDailyResult(
  progress: DailyProgress,
  date: string,
  result: OfficialDailyResult | null,
  now: Date = new Date(),
): DailyProgress {
  if (!result) return progress;

  const prior = progress.dates[date] ?? EMPTY_DATE_PROGRESS;
  const dates = {
    ...progress.dates,
    [date]: {
      ...prior,
      officialScore: result.score,
      attemptCount: Math.max(prior.attemptCount, result.attempts),
    },
  };

  return creditStreakOnce(progress, dates, date, now);
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
