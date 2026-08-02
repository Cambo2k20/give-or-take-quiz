import {
  DEFAULT_PROFILE_AVATAR,
  isProfileAvatarKey,
  type ProfileAvatarKey,
} from "./leaderboard";
import { isQuestionCategory } from "./categories";
import { isPlayableCategory, isPlayableGameMode } from "./game";
import { supabase } from "./supabase";
import type { BackgroundThemeId } from "./themes";
import { BACKGROUND_THEMES } from "./themes";
import type { QuestionCategory } from "./types";

export type ProfileRelationship =
  | "signed_out"
  | "self"
  | "none"
  | "incoming"
  | "outgoing"
  | "friend";

export type PublicProfilePlayer = {
  id: string;
  displayName: string;
  avatarKey: ProfileAvatarKey;
};

export type PublicCategoryRank = {
  category: QuestionCategory;
  xp: number;
  rank: number;
  title: string;
};

export type PublicBadge = {
  badgeKey: string;
  category: QuestionCategory;
  rankFloor: number;
  title: string;
};

export type PublicAchievement = {
  id: string;
  name: string;
  description: string;
  tier: "bronze" | "silver" | "gold";
};

export type PublicClassicBest = {
  category: QuestionCategory | "mixed";
  bestScore: number;
  correctAnswers: number;
  accuracy: number;
  bestDate: string;
};

export type PublicProfileShowcase = {
  featuredBadgeKey: string | null;
  customFeaturedBadgeKey: string | null;
  pinnedAchievementIds: string[];
  profileThemeId: BackgroundThemeId | null;
  customProfileThemeId: BackgroundThemeId | null;
};

export type PublicPlayerProfile = {
  player: PublicProfilePlayer;
  relationship: ProfileRelationship;
  showcase: PublicProfileShowcase;
  totalXp: number;
  categoryRanks: PublicCategoryRank[];
  earnedBadges: PublicBadge[];
  earnedAchievements: PublicAchievement[];
  classicBests: PublicClassicBest[];
  survival: { bestRun: number; attempts: number };
  daily: { played: number; longestStreak: number; bestScore: number };
};

export type ProfileShowcaseDraft = {
  featuredBadgeKey: string | null;
  pinnedAchievementIds: string[];
  profileThemeId: BackgroundThemeId | null;
};

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

const THEME_IDS = new Set(BACKGROUND_THEMES.map((theme) => theme.id));

function themeId(value: unknown): BackgroundThemeId | null {
  return typeof value === "string" && THEME_IDS.has(value as BackgroundThemeId)
    ? (value as BackgroundThemeId)
    : null;
}

function relationship(value: unknown): ProfileRelationship {
  switch (value) {
    case "self":
    case "none":
    case "incoming":
    case "outgoing":
    case "friend":
      return value;
    default:
      return "signed_out";
  }
}

function playableCategory(value: unknown): QuestionCategory | null {
  return isQuestionCategory(value) && isPlayableCategory(value) ? value : null;
}

function playableBadgeKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^([a-z0-9-]+)-(05|10|15|20|25|30)$/);
  return match && playableCategory(match[1]) ? value : null;
}

export function mapPublicPlayerProfile(value: unknown): PublicPlayerProfile {
  const row = object(value);
  const player = object(row.player);
  const showcase = object(row.showcase);
  const survival = object(row.survival);
  const daily = object(row.daily);
  const avatar = player.avatar_key;
  const categoryRanks = array(row.category_ranks).flatMap((value) => {
    const rank = object(value);
    const category = playableCategory(rank.category);
    return category
      ? [{
          category,
          xp: number(rank.xp),
          rank: number(rank.rank),
          title: text(rank.title, "Newcomer"),
        }]
      : [];
  });
  const earnedBadges = array(row.earned_badges).flatMap((value) => {
    const badge = object(value);
    const category = playableCategory(badge.category);
    const badgeKey = playableBadgeKey(badge.badge_key);
    return category && badgeKey
      ? [{
          badgeKey,
          category,
          rankFloor: number(badge.rank_floor),
          title: text(badge.title),
        }]
      : [];
  });
  const classicBests = array(row.classic_bests).flatMap((value) => {
    const best = object(value);
    if (!isPlayableGameMode(best.category)) return [];
    return [{
      category: best.category,
      bestScore: number(best.best_score),
      correctAnswers: number(best.correct_answers),
      accuracy: number(best.accuracy),
      bestDate: text(best.best_date),
    }];
  });

  return {
    player: {
      id: text(player.id),
      displayName: text(player.display_name, "Player"),
      avatarKey: isProfileAvatarKey(avatar)
        ? avatar
        : DEFAULT_PROFILE_AVATAR,
    },
    relationship: relationship(row.relationship),
    showcase: {
      featuredBadgeKey: playableBadgeKey(showcase.featured_badge_key),
      customFeaturedBadgeKey: playableBadgeKey(
        showcase.custom_featured_badge_key,
      ),
      pinnedAchievementIds: array(showcase.pinned_achievement_ids).filter(
        (id): id is string => typeof id === "string",
      ),
      profileThemeId: themeId(showcase.profile_theme_id),
      customProfileThemeId: themeId(showcase.custom_profile_theme_id),
    },
    totalXp: categoryRanks.reduce((sum, rank) => sum + rank.xp, 0),
    categoryRanks,
    earnedBadges,
    earnedAchievements: array(row.earned_achievements).map((value) => {
      const achievement = object(value);
      const tier = text(achievement.tier);
      return {
        id: text(achievement.id),
        name: text(achievement.name),
        description: text(achievement.description),
        tier:
          tier === "gold" || tier === "silver" ? tier : ("bronze" as const),
      };
    }),
    classicBests,
    survival: {
      bestRun: number(survival.best_run),
      attempts: number(survival.attempts),
    },
    daily: {
      played: number(daily.played),
      longestStreak: number(daily.longest_streak),
      bestScore: number(daily.best_score),
    },
  };
}

function client() {
  if (!supabase) throw new Error("Public profiles are not configured.");
  return supabase;
}

export async function fetchPublicPlayerProfile(
  playerId: string,
): Promise<PublicPlayerProfile | null> {
  const { data, error } = await client().rpc("get_public_player_profile", {
    p_player_id: playerId,
  });
  if (error) throw new Error(error.message);
  return data ? mapPublicPlayerProfile(data) : null;
}

export async function updateProfileShowcase(
  draft: ProfileShowcaseDraft,
): Promise<PublicPlayerProfile> {
  const { data, error } = await client().rpc("update_profile_showcase", {
    p_featured_badge_key: draft.featuredBadgeKey,
    p_pinned_achievement_ids: draft.pinnedAchievementIds,
    p_profile_theme_id: draft.profileThemeId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The public profile was not updated.");
  return mapPublicPlayerProfile(data);
}

export async function sendProfileFriendRequest(playerId: string): Promise<void> {
  const { error } = await client().rpc("send_friend_request_by_id", {
    p_player_id: playerId,
  });
  if (error) throw new Error(error.message);
}
