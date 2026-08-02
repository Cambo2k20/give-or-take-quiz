import { accuracyTier, type AccuracyTier } from "./game";

/**
 * One square per question, coloured by how close the guess was.
 *
 * Green and yellow follow the interface's own tiers (--good, --warn), but the
 * single --bad colour is split across two squares here. A row of five is the
 * whole artifact, and collapsing both losing tiers into one red gives an
 * ordinary round a flat wall of red that says nothing about how it went.
 *
 * Only these four squares are used because each stays legible on a light and a
 * dark background alike; the black and white squares vanish into one or other
 * of them wherever the result gets pasted.
 */
const TIER_SQUARES: Record<AccuracyTier["id"], string> = {
  bullseye: "🟩",
  close: "🟩",
  fair: "🟨",
  wide: "🟧",
  far: "🟥",
};

/**
 * The round as a row of squares, in the order the questions were asked.
 *
 * Deliberately says nothing about what was asked or what the answers were: the
 * point of sharing a daily is to invite someone to play the same puzzle, which
 * a grid that gave away its content would ruin.
 */
export function dailyResultGrid(pointsPerQuestion: readonly number[]): string {
  return pointsPerQuestion
    .map((points) => TIER_SQUARES[accuracyTier(points).id])
    .join("");
}
