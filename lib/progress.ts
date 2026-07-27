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

export const BADGE_RANK_FLOORS = [5, 10, 15, 20, 25, 30] as const;
export type BadgeRankFloor = (typeof BADGE_RANK_FLOORS)[number];

export type RankBadge = {
  badgeKey: string;
  category: QuestionCategory;
  rankFloor: BadgeRankFloor;
  title: string;
  earned: boolean;
  current: boolean;
};

export type PlayerProgress = {
  /** Every subject, in chooser order, including ones never played. */
  categories: CategoryRank[];
  achievements: Achievement[];
  badges: RankBadge[];
  badgeCatalogueAvailable: boolean;
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

const EMPTY: PlayerProgress = {
  categories: [],
  achievements: [],
  badges: [],
  badgeCatalogueAvailable: false,
  totalXp: 0,
};

/**
 * One player's whole progression. The required rank and achievement views
 * stay separate; the small public badge catalogue is optional so a rollout
 * or network failure there cannot hide ordinary XP.
 */
export async function fetchProgress(playerId: string): Promise<PlayerProgress> {
  const supabaseClient = client();

  const [progress, achievements, badgeCatalogue] = await Promise.all([
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
    supabaseClient
      .from("rank_titles")
      .select("category, rank_floor, title, badge_key"),
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

  type CatalogueRow = {
    category: QuestionCategory;
    rank_floor: BadgeRankFloor;
    title: string;
    badge_key: string;
  };
  const rawCatalogue = badgeCatalogue.error
    ? []
    : ((badgeCatalogue.data ?? []) as unknown as Array<
        Partial<CatalogueRow>
      >);
  const catalogueBySlot = new Map<string, CatalogueRow>();

  for (const row of rawCatalogue) {
    if (
      !CATEGORIES.includes(row.category as QuestionCategory) ||
      !BADGE_RANK_FLOORS.includes(row.rank_floor as BadgeRankFloor) ||
      typeof row.title !== "string" ||
      row.title.trim().length === 0 ||
      typeof row.badge_key !== "string"
    ) {
      continue;
    }
    const category = row.category as QuestionCategory;
    const rankFloor = row.rank_floor as BadgeRankFloor;
    const expectedKey = `${category}-${String(rankFloor).padStart(2, "0")}`;
    if (row.badge_key !== expectedKey) continue;
    catalogueBySlot.set(`${category}:${rankFloor}`, {
      category,
      rank_floor: rankFloor,
      title: row.title,
      badge_key: row.badge_key,
    });
  }

  const badgeCatalogueAvailable =
    catalogueBySlot.size === CATEGORIES.length * BADGE_RANK_FLOORS.length &&
    CATEGORIES.every((category) =>
      BADGE_RANK_FLOORS.every((rankFloor) =>
        catalogueBySlot.has(`${category}:${rankFloor}`),
      ),
    );
  const categoryRanks = new Map(
    categories.map((entry) => [entry.category, entry.rank]),
  );
  const badges: RankBadge[] = badgeCatalogueAvailable
    ? CATEGORIES.flatMap((category) => {
        const rank = categoryRanks.get(category) ?? 1;
        const currentFloor = [...BADGE_RANK_FLOORS]
          .reverse()
          .find((floor) => floor <= rank);

        return BADGE_RANK_FLOORS.map((rankFloor) => {
          const row = catalogueBySlot.get(`${category}:${rankFloor}`);
          if (!row) {
            throw new Error("Validated badge catalogue lost an expected row.");
          }
          return {
            badgeKey: row.badge_key,
            category,
            rankFloor,
            title: row.title,
            earned: rankFloor <= rank,
            current: rankFloor === currentFloor,
          };
        });
      })
    : [];

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
    badges,
    badgeCatalogueAvailable,
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
  badgesUnlocked: RankBadge[];
};

export function diffProgress(
  before: PlayerProgress | null,
  after: PlayerProgress,
): ProgressChange {
  // With nothing to compare against, nothing is *newly* earned. Announcing a
  // player's whole back catalogue after one round would be worse than silence.
  if (!before) return { rankUps: [], unlocked: [], badgesUnlocked: [] };

  const previousRank = new Map(
    before.categories.map((entry) => [entry.category, entry.rank]),
  );
  const previouslyEarned = new Set(
    before.achievements.filter((item) => item.earned).map((item) => item.id),
  );
  const previouslyEarnedBadges = new Set(
    before.badges.filter((badge) => badge.earned).map((badge) => badge.badgeKey),
  );

  return {
    rankUps: after.categories
      .filter((entry) => entry.rank > (previousRank.get(entry.category) ?? 1))
      .map(({ category, rank, title }) => ({ category, rank, title })),
    unlocked: after.achievements.filter(
      (item) => item.earned && !previouslyEarned.has(item.id),
    ),
    badgesUnlocked:
      before.badgeCatalogueAvailable && after.badgeCatalogueAvailable
        ? after.badges.filter(
            (badge) =>
              badge.earned && !previouslyEarnedBadges.has(badge.badgeKey),
          )
        : [],
  };
}
