import { describe, expect, it } from "vitest";
import {
  ALL_CATEGORIES,
  CATEGORY_REGISTRY,
  getPlayableCategories,
  LIVE_CATEGORIES,
} from "@/lib/categories";

const counts = Object.fromEntries(
  ALL_CATEGORIES.map((category) => [category, 20]),
);

describe("category registry", () => {
  it("defines ten live subjects at public launch", () => {
    expect(ALL_CATEGORIES).toHaveLength(10);
    expect(LIVE_CATEGORIES).toHaveLength(10);
    expect(
      CATEGORY_REGISTRY.every(({ availability }) => availability === "live"),
    ).toBe(true);
  });

  it("does not need the former incubating override in production", () => {
    expect(
      getPlayableCategories(counts, {
        mode: "production",
        enableIncubating: "true",
      }),
    ).toEqual(LIVE_CATEGORIES);
  });

  it("includes Dinosaurs and Games without a development override", () => {
    expect(
      getPlayableCategories(
        { ...counts, dinosaurs: 5, games: 4 },
        { mode: "development", enableIncubating: "true" },
      ),
    ).toEqual(LIVE_CATEGORIES);

    expect(
      getPlayableCategories(counts, {
        mode: "development",
        enableIncubating: "false",
      }),
    ).toEqual(LIVE_CATEGORIES);
  });
});
