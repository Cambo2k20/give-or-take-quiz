import { describe, expect, it } from "vitest";
import {
  EXPECTED_BADGE_KEYS,
  isRankBadgeKey,
  rankBadgeArtworkUrl,
} from "@/src/rankBadges";

describe("rank badge artwork catalogue", () => {
  it("contains exactly eight subjects by six rank floors", () => {
    expect(EXPECTED_BADGE_KEYS).toHaveLength(48);
    expect(new Set(EXPECTED_BADGE_KEYS).size).toBe(48);

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
