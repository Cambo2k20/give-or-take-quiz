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
  it("defines ten subjects while keeping eight live", () => {
    expect(ALL_CATEGORIES).toHaveLength(10);
    expect(LIVE_CATEGORIES).toHaveLength(8);
    expect(CATEGORY_REGISTRY.filter(({ availability }) => availability === "incubating").map(({ id }) => id)).toEqual([
      "dinosaurs",
      "games",
    ]);
  });

  it("ignores the incubating override outside development", () => {
    expect(
      getPlayableCategories(counts, {
        mode: "production",
        enableIncubating: "true",
      }),
    ).toEqual(LIVE_CATEGORIES);
  });

  it("requires both the development override and five questions", () => {
    expect(
      getPlayableCategories(
        { ...counts, dinosaurs: 5, games: 4 },
        { mode: "development", enableIncubating: "true" },
      ),
    ).toEqual([...LIVE_CATEGORIES, "dinosaurs"]);

    expect(
      getPlayableCategories(counts, {
        mode: "development",
        enableIncubating: "false",
      }),
    ).toEqual(LIVE_CATEGORIES);
  });
});
