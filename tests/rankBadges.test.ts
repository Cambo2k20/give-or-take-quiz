import { describe, expect, it } from "vitest";
import {
  EXPECTED_BADGE_KEYS,
  isRankBadgeKey,
  rankBadgeArtworkUrl,
} from "@/src/rankBadges";

describe("rank badge artwork catalogue", () => {
  it("contains exactly ten subjects by six rank floors", () => {
    expect(EXPECTED_BADGE_KEYS).toHaveLength(60);
    expect(new Set(EXPECTED_BADGE_KEYS).size).toBe(60);

    for (const key of EXPECTED_BADGE_KEYS) {
      expect(isRankBadgeKey(key), key).toBe(true);
      expect(rankBadgeArtworkUrl(key), key).toMatch(/\.webp(?:\?|$)/);
    }
  });

  it("degrades an unknown future server key instead of throwing", () => {
    expect(isRankBadgeKey("space-35")).toBe(false);
    expect(rankBadgeArtworkUrl("space-35")).toBeNull();
  });
});
