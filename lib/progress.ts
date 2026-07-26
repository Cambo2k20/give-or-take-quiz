import { CATEGORIES } from "./game";
import { supabase } from "./supabase";
import type { QuestionCategory } from "./types";

/**
 * Progression is read, never written. Every number here is derived on the
 * server from rounds already recorded, so there is no client-side XP to keep
 * in step and nothing to reconcile after a round — submitting the round *is*
 * the write. Refetching is the only way progress ever changes.
 *
 * It is also signed-in only, by design: a rank you lose by clearing your
 * browser is worse than no rank at all.
 */

/** The title shown before a subject has earned one of its own. */
export const DEFAULT_RANK_TITLE = "Newcomer";

export type CategoryRank = {
  category: QuestionCategory;
  xp: number;
  rank: number;
  title: string;
  questionsAnswered: number;
  perfectAnswers: number;
  /** XP at which this rank began, and at which the next one starts. */
  rankFloorXp: number;
  nextRankXp: number;
  /** 0..1 through the current rank, for a progress bar. */
  fraction: number;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  tier: "bronze" | "silver" | "gold";
  progress: number;
  threshold: number;
  earned: boolean;
};

export type PlayerProgress = {
  /** Every subject, in chooser order, including ones never played. */
  categories: CategoryRank[];
  achievements: Achievement[];
  /** Summed across subjects — the one headline number for the account screen. */
  totalXp: number;
};

function client() {
  if (!supabase) throw new Error("Progress is not configured.");
  return supabase;
}

/** Guards against a rank whose floor and ceiling coincide. */
function rankFraction(xp: number, floor: number, next: number): number {
  const span = next - floor;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (xp - floor) / span));
}

const EMPTY: PlayerProgress = { categories: [], achievements: [], totalXp: 0 };

/**
 * One player's whole progression. Two reads rather than one: the views are
 * shaped differently and joining them server-side would mean a row per
 * subject per achievement.
 */
export async function fetchProgress(playerId: string): Promise<PlayerProgress> {
  const supabaseClient = client();

  const [progress, achievements] = await Promise.all([
    supabaseClient
      .from("player_progress")
      .select(
        "category, xp, rank, title, questions_answered, perfect_answers, rank_floor_xp, next_rank_xp",
      )
      .eq("player_id", playerId),
    supabaseClient
      .from("player_achievements")
      .select(
        "achievement_id, name, description, tier, progress, threshold, earned, sort_order",
      )
      .eq("player_id", playerId)
      .order("sort_order"),
  ]);

  if (progress.error) throw new Error(progress.error.message);
  if (achievements.error) throw new Error(achievements.error.message);

  const byCategory = new Map(
    (progress.data ?? []).map((row) => [row.category as QuestionCategory, row]),
  );

  // Ordered by CATEGORIES rather than by whatever the view returned, so the
  // account screen matches the mode chooser. A subject with no row is a player
  // who has never touched it, which is rank 1 rather than an error.
  const categories: CategoryRank[] = CATEGORIES.map((category) => {
    const row = byCategory.get(category);
    const xp = row?.xp ?? 0;
    const rankFloorXp = row?.rank_floor_xp ?? 0;
    const nextRankXp = row?.next_rank_xp ?? 0;

    return {
      category,
      xp,
      rank: row?.rank ?? 1,
      title: row?.title ?? DEFAULT_RANK_TITLE,
      questionsAnswered: row?.questions_answered ?? 0,
      perfectAnswers: row?.perfect_answers ?? 0,
      rankFloorXp,
      nextRankXp,
      fraction: rankFraction(xp, rankFloorXp, nextRankXp),
    };
  });

  return {
    categories,
    achievements: (achievements.data ?? []).map((row) => ({
      id: row.achievement_id,
      name: row.name,
      description: row.description,
      tier: row.tier as Achievement["tier"],
      progress: row.progress,
      threshold: row.threshold,
      earned: row.earned,
    })),
    totalXp: categories.reduce((sum, entry) => sum + entry.xp, 0),
  };
}

export const EMPTY_PROGRESS = EMPTY;

/**
 * What changed between two snapshots, for the ribbon on the results and death
 * screens. Diffed on the client because the views report where a player *is*,
 * not what just moved — and the client is the only place that remembers the
 * before.
 */
export type ProgressChange = {
  rankUps: Array<{ category: QuestionCategory; rank: number; title: string }>;
  unlocked: Achievement[];
};

export function diffProgress(
  before: PlayerProgress | null,
  after: PlayerProgress,
): ProgressChange {
  // With nothing to compare against, nothing is *newly* earned. Announcing a
  // player's whole back catalogue after one round would be worse than silence.
  if (!before) return { rankUps: [], unlocked: [] };

  const previousRank = new Map(
    before.categories.map((entry) => [entry.category, entry.rank]),
  );
  const previouslyEarned = new Set(
    before.achievements.filter((item) => item.earned).map((item) => item.id),
  );

  return {
    rankUps: after.categories
      .filter((entry) => entry.rank > (previousRank.get(entry.category) ?? 1))
      .map(({ category, rank, title }) => ({ category, rank, title })),
    unlocked: after.achievements.filter(
      (item) => item.earned && !previouslyEarned.has(item.id),
    ),
  };
}
