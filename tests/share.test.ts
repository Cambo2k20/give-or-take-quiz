import { describe, expect, it } from "vitest";
import { dailyResultGrid } from "@/lib/share";
import { accuracyTier } from "@/lib/game";

describe("dailyResultGrid", () => {
  it("draws one square per question, in the order they were asked", () => {
    // 1000 is a bullseye, 0 is as far off as the rail allows.
    expect(dailyResultGrid([1000, 0, 1000, 0, 1000])).toBe("🟩🟥🟩🟥🟩");
  });

  it("colours each square by the tier the reveal already showed", () => {
    // One score from inside each tier band, checked against the same function
    // the game grades with rather than against hard-coded boundaries.
    const samples = [1000, 900, 700, 400, 100];
    expect(samples.map((points) => accuracyTier(points).id)).toEqual([
      "bullseye",
      "close",
      "fair",
      "wide",
      "far",
    ]);
    expect(dailyResultGrid(samples)).toBe("🟩🟩🟨🟧🟥");
  });

  it("separates a near miss from a wild one", () => {
    // Both are losing tiers, but a row that reds out either way would tell the
    // reader nothing about how the round actually went.
    expect(dailyResultGrid([400])).not.toBe(dailyResultGrid([100]));
  });

  it("gives back nothing for a round with no recorded breakdown", () => {
    expect(dailyResultGrid([])).toBe("");
  });

  it("says nothing about the questions or their answers", () => {
    const grid = dailyResultGrid([1000, 512, 0, 250, 875]);
    // Squares only: anything else would risk spoiling the day's puzzle for
    // whoever the result is shared with.
    expect(grid).toMatch(/^[🟩🟨🟧🟥]+$/u);
    expect([...grid]).toHaveLength(5);
  });

  it("handles a round of any length", () => {
    expect(dailyResultGrid([1000])).toBe("🟩");
    expect(dailyResultGrid(Array(10).fill(1000))).toBe("🟩".repeat(10));
  });
});
