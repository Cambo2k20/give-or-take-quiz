import { CATEGORIES } from "../lib/game";
import {
  BADGE_RANK_FLOORS,
  type BadgeRankFloor,
} from "../lib/progress";
import type { QuestionCategory } from "../lib/types";

type PaddedBadgeRank = "05" | "10" | "15" | "20" | "25" | "30";
export type RankBadgeKey = `${QuestionCategory}-${PaddedBadgeRank}`;

const artworkModules = import.meta.glob<string>("./assets/badges/*.webp", {
  eager: true,
  import: "default",
  query: "?url",
});

function badgeKey(category: QuestionCategory, rank: BadgeRankFloor): RankBadgeKey {
  return `${category}-${String(rank).padStart(2, "0") as PaddedBadgeRank}`;
}

export const EXPECTED_BADGE_KEYS = CATEGORIES.flatMap((category) =>
  BADGE_RANK_FLOORS.map((rank) => badgeKey(category, rank)),
) as readonly RankBadgeKey[];

const expectedKeys = new Set<string>(EXPECTED_BADGE_KEYS);
const artworkByKey = Object.fromEntries(
  Object.entries(artworkModules).map(([path, url]) => [
    path.slice(path.lastIndexOf("/") + 1, -".webp".length),
    url,
  ]),
) as Record<string, string>;

const missingKeys = EXPECTED_BADGE_KEYS.filter((key) => !artworkByKey[key]);
const unexpectedKeys = Object.keys(artworkByKey).filter(
  (key) => !expectedKeys.has(key),
);

if (missingKeys.length > 0 || unexpectedKeys.length > 0) {
  throw new Error(
    [
      "Rank badge artwork does not match the eight-subject catalogue.",
      missingKeys.length > 0 ? `Missing: ${missingKeys.join(", ")}` : "",
      unexpectedKeys.length > 0
        ? `Unexpected: ${unexpectedKeys.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function isRankBadgeKey(value: unknown): value is RankBadgeKey {
  return typeof value === "string" && expectedKeys.has(value);
}

/**
 * Unknown server keys degrade to the neutral medallion instead of breaking
 * ordinary progression. Missing files from the committed 48-asset set are a
 * build error above, while a future catalogue can roll out independently.
 */
export function rankBadgeArtworkUrl(key: string): string | null {
  return isRankBadgeKey(key) ? artworkByKey[key] ?? null : null;
}
