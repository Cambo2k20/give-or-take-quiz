import { beforeEach, describe, expect, it, vi } from "vitest";

// player_progress reads stop at .eq(); player_achievements chains .order()
// on top; rank_titles is awaited directly after .select().
function tableResponse(data: unknown, error: unknown = null) {
  const resolved = Promise.resolve({ data, error });
  const order = vi.fn(() => resolved);
  const eq = vi.fn(() => ({
    then: resolved.then.bind(resolved),
    order,
  }));
  return {
    select: vi.fn(() => ({
      then: resolved.then.bind(resolved),
      eq,
      order,
    })),
    eq,
  };
}

const { tables } = vi.hoisted(() => ({
  tables: {} as Record<string, unknown>,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => (tables[table] as { select: unknown }) ?? {},
  },
  leaderboardEnabled: true,
}));

const { diffProgress, fetchProgress } = await import("@/lib/progress");
const { PLAYABLE_CATEGORIES } = await import("@/lib/game");
const { BADGE_RANK_FLOORS } = await import("@/lib/progress");

function badgeRows() {
  return PLAYABLE_CATEGORIES.flatMap((category) =>
    BADGE_RANK_FLOORS.map((rankFloor) => ({
      category,
      rank_floor: rankFloor,
      title: `${category} title ${rankFloor}`,
      badge_key: `${category}-${String(rankFloor).padStart(2, "0")}`,
    })),
  );
}

function progressRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    category: "population",
    xp: 0,
    rank: 1,
    title: "Newcomer",
    questions_answered: 0,
    perfect_answers: 0,
    rank_floor_xp: 0,
    next_rank_xp: 450,
    ...overrides,
  };
}

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key];
  tables.rank_titles = tableResponse(badgeRows());
});

describe("fetchProgress", () => {
  it("orders every subject to match the mode chooser, even ones never played", async () => {
    tables.player_progress = tableResponse([
      progressRow({ category: "space", xp: 5000, rank: 6, title: "Stargazer" }),
    ]);
    tables.player_achievements = tableResponse([]);

    const result = await fetchProgress("player-1");

    expect(result.categories.map((entry) => entry.category)).toEqual(
      PLAYABLE_CATEGORIES,
    );
    const space = result.categories.find((entry) => entry.category === "space");
    expect(space).toMatchObject({ xp: 5000, rank: 6, title: "Stargazer" });
    // Untouched subjects default to Newcomer at rank 1, not an error.
    const history = result.categories.find(
      (entry) => entry.category === "history",
    );
    expect(history).toMatchObject({ xp: 0, rank: 1, title: "Newcomer" });
    expect(result.badgeCatalogueAvailable).toBe(true);
    expect(result.badges).toHaveLength(48);
    expect(
      result.badges.find((badge) => badge.badgeKey === "space-05"),
    ).toMatchObject({ earned: true, current: true });
  });

  it("sums every subject's XP into the one headline total", async () => {
    tables.player_progress = tableResponse([
      progressRow({ category: "population", xp: 4000 }),
      progressRow({ category: "history", xp: 1500 }),
    ]);
    tables.player_achievements = tableResponse([]);

    const result = await fetchProgress("player-1");

    expect(result.totalXp).toBe(5500);
  });

  it("computes the fraction through the current rank for the progress bar", async () => {
    tables.player_progress = tableResponse([
      progressRow({
        category: "population",
        xp: 900,
        rank_floor_xp: 450,
        next_rank_xp: 1273,
      }),
    ]);
    tables.player_achievements = tableResponse([]);

    const result = await fetchProgress("player-1");
    const population = result.categories.find(
      (entry) => entry.category === "population",
    )!;

    // (900 - 450) / (1273 - 450) ≈ 0.547
    expect(population.fraction).toBeCloseTo(0.547, 2);
  });

  it("clamps the fraction rather than reporting out-of-range progress", async () => {
    // A rank card should never show a bar over 100% or negative because a
    // read landed exactly on a boundary a moment before the server's own
    // rank_for_xp caught up.
    tables.player_progress = tableResponse([
      progressRow({ category: "population", xp: 100, rank_floor_xp: 450, next_rank_xp: 1273 }),
    ]);
    tables.player_achievements = tableResponse([]);

    const result = await fetchProgress("player-1");
    const population = result.categories.find(
      (entry) => entry.category === "population",
    )!;
    expect(population.fraction).toBe(0);
  });

  it("maps achievements including unearned progress", async () => {
    tables.player_progress = tableResponse([]);
    tables.player_achievements = tableResponse([
      {
        achievement_id: "first-steps",
        name: "First Steps",
        description: "Finish your first round.",
        tier: "bronze",
        progress: 1,
        threshold: 1,
        earned: true,
        sort_order: 10,
      },
      {
        achievement_id: "regular",
        name: "Regular",
        description: "Finish 25 rounds.",
        tier: "silver",
        progress: 8,
        threshold: 25,
        earned: false,
        sort_order: 20,
      },
    ]);

    const result = await fetchProgress("player-1");

    expect(result.achievements).toEqual([
      {
        id: "first-steps",
        name: "First Steps",
        description: "Finish your first round.",
        tier: "bronze",
        progress: 1,
        threshold: 1,
        earned: true,
      },
      {
        id: "regular",
        name: "Regular",
        description: "Finish 25 rounds.",
        tier: "silver",
        progress: 8,
        threshold: 25,
        earned: false,
      },
    ]);
  });

  it("surfaces a read failure on either view rather than returning partial data", async () => {
    tables.player_progress = tableResponse(null, { message: "network error" });
    tables.player_achievements = tableResponse([]);

    await expect(fetchProgress("player-1")).rejects.toThrow("network error");
  });

  it("keeps ordinary progression when the optional badge catalogue fails", async () => {
    tables.player_progress = tableResponse([
      progressRow({ category: "science", xp: 900, rank: 3 }),
    ]);
    tables.player_achievements = tableResponse([]);
    tables.rank_titles = tableResponse(null, { message: "catalogue offline" });

    const result = await fetchProgress("player-1");

    expect(result.categories.find((entry) => entry.category === "science")).toMatchObject({
      xp: 900,
      rank: 3,
    });
    expect(result.badgeCatalogueAvailable).toBe(false);
    expect(result.badges).toEqual([]);
  });

  it("rejects an incomplete catalogue as a unit instead of mixing ladders", async () => {
    tables.player_progress = tableResponse([]);
    tables.player_achievements = tableResponse([]);
    tables.rank_titles = tableResponse(badgeRows().slice(0, -1));

    const result = await fetchProgress("player-1");

    expect(result.badgeCatalogueAvailable).toBe(false);
    expect(result.badges).toEqual([]);
  });
});

describe("diffProgress", () => {
  const before = {
    totalXp: 1000,
    categories: [
      {
        category: "population" as const,
        xp: 400,
        rank: 2,
        title: "Newcomer",
        questionsAnswered: 5,
        perfectAnswers: 0,
        rankFloorXp: 0,
        nextRankXp: 1273,
        fraction: 0.3,
      },
    ],
    achievements: [
      {
        id: "first-steps",
        name: "First Steps",
        description: "Finish your first round.",
        tier: "bronze" as const,
        progress: 1,
        threshold: 1,
        earned: true,
      },
      {
        id: "regular",
        name: "Regular",
        description: "Finish 25 rounds.",
        tier: "silver" as const,
        progress: 8,
        threshold: 25,
        earned: false,
      },
    ],
    badges: [
      {
        badgeKey: "population-05",
        category: "population" as const,
        rankFloor: 5 as const,
        title: "People Watcher",
        earned: false,
        current: false,
      },
    ],
    badgeCatalogueAvailable: true,
  };

  it("reports nothing when there is no prior snapshot to compare against", () => {
    // Announcing a returning player's whole back catalogue after one round
    // would be worse than staying quiet.
    const after = { ...before };
    expect(diffProgress(null, after)).toEqual({
      rankUps: [],
      unlocked: [],
      badgesUnlocked: [],
    });
  });

  it("reports nothing when nothing actually moved", () => {
    expect(diffProgress(before, before)).toEqual({
      rankUps: [],
      unlocked: [],
      badgesUnlocked: [],
    });
  });

  it("catches a rank-up in a single subject", () => {
    const after = {
      ...before,
      categories: [
        { ...before.categories[0], rank: 5, title: "People Watcher" },
      ],
    };

    expect(diffProgress(before, after)).toEqual({
      rankUps: [
        { category: "population", rank: 5, title: "People Watcher" },
      ],
      unlocked: [],
      badgesUnlocked: [],
    });
  });

  it("does not report a rank-up for a subject that only gained XP within its rank", () => {
    const after = {
      ...before,
      categories: [{ ...before.categories[0], xp: 800 }],
    };

    expect(diffProgress(before, after).rankUps).toEqual([]);
  });

  it("catches a newly earned achievement without re-announcing an old one", () => {
    const after = {
      ...before,
      achievements: [
        before.achievements[0],
        { ...before.achievements[1], progress: 25, earned: true },
      ],
    };

    const result = diffProgress(before, after);
    expect(result.unlocked).toHaveLength(1);
    expect(result.unlocked[0].id).toBe("regular");
  });

  it("reports every badge threshold crossed in one refresh", () => {
    const badgeSteps = [
      {
        badgeKey: "population-05",
        category: "population" as const,
        rankFloor: 5 as const,
        title: "People Watcher",
        earned: false,
        current: false,
      },
      {
        badgeKey: "population-10",
        category: "population" as const,
        rankFloor: 10 as const,
        title: "Crowd Counter",
        earned: false,
        current: false,
      },
      {
        badgeKey: "population-15",
        category: "population" as const,
        rankFloor: 15 as const,
        title: "Census Scout",
        earned: false,
        current: false,
      },
    ];
    const start = { ...before, badges: badgeSteps };
    const after = {
      ...start,
      categories: [{ ...before.categories[0], rank: 16 }],
      badges: badgeSteps.map((badge, index) => ({
        ...badge,
        earned: true,
        current: index === badgeSteps.length - 1,
      })),
    };

    expect(diffProgress(start, after).badgesUnlocked.map((badge) => badge.badgeKey)).toEqual([
      "population-05",
      "population-10",
      "population-15",
    ]);
  });

  it("does not announce a backlog when the catalogue recovers after a failure", () => {
    const after = {
      ...before,
      badges: before.badges.map((badge) => ({ ...badge, earned: true, current: true })),
    };

    expect(
      diffProgress(
        { ...before, badges: [], badgeCatalogueAvailable: false },
        after,
      ).badgesUnlocked,
    ).toEqual([]);
  });
});
