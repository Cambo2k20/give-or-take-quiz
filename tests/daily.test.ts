import { beforeEach, describe, expect, it } from "vitest";
import {
  DAILY_PROGRESS_KEY,
  activeStreak,
  previousDay,
  readDailyProgress,
  recordDailyResult,
  todayIso,
  writeDailyProgress,
} from "@/lib/daily";
import type { DailyProgress } from "@/lib/daily";

const at = (iso: string) => new Date(`${iso}T09:00:00`);

function progress(overrides: Partial<DailyProgress> = {}): DailyProgress {
  return {
    current: 0,
    longest: 0,
    lastPlayedDate: null,
    scores: {},
    ...overrides,
  };
}

describe("todayIso", () => {
  it("reads the local calendar day rather than the UTC one", () => {
    // Late evening in a positive-offset zone is still the same local day, and
    // would be tomorrow if this were read off toISOString().
    expect(todayIso(new Date(2026, 6, 26, 23, 30))).toBe("2026-07-26");
    expect(todayIso(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01");
  });
});

describe("previousDay", () => {
  it("steps back across month and year boundaries", () => {
    expect(previousDay("2026-07-26")).toBe("2026-07-25");
    expect(previousDay("2026-08-01")).toBe("2026-07-31");
    expect(previousDay("2026-01-01")).toBe("2025-12-31");
    expect(previousDay("2028-03-01")).toBe("2028-02-29");
  });
});

describe("recordDailyResult", () => {
  it("starts a streak on a first play", () => {
    const next = recordDailyResult(progress(), "2026-07-26", 6840, at("2026-07-26"));

    expect(next.current).toBe(1);
    expect(next.longest).toBe(1);
    expect(next.lastPlayedDate).toBe("2026-07-26");
    expect(next.scores["2026-07-26"]).toBe(6840);
  });

  it("extends the streak when yesterday was played", () => {
    const next = recordDailyResult(
      progress({ current: 4, longest: 9, lastPlayedDate: "2026-07-25" }),
      "2026-07-26",
      5000,
      at("2026-07-26"),
    );

    expect(next.current).toBe(5);
    expect(next.longest).toBe(9);
  });

  it("resets the streak when a day was missed", () => {
    const next = recordDailyResult(
      progress({ current: 12, longest: 12, lastPlayedDate: "2026-07-20" }),
      "2026-07-26",
      5000,
      at("2026-07-26"),
    );

    expect(next.current).toBe(1);
    expect(next.longest).toBe(12);
  });

  it("does not count replaying the same day twice", () => {
    const once = recordDailyResult(progress(), "2026-07-26", 4000, at("2026-07-26"));
    const twice = recordDailyResult(once, "2026-07-26", 9000, at("2026-07-26"));

    expect(twice.current).toBe(1);
    // The better attempt is still what gets remembered for that date.
    expect(twice.scores["2026-07-26"]).toBe(9000);
  });

  it("keeps the best score for a date rather than the latest", () => {
    const high = recordDailyResult(progress(), "2026-07-26", 9000, at("2026-07-26"));
    const low = recordDailyResult(high, "2026-07-26", 100, at("2026-07-26"));

    expect(low.scores["2026-07-26"]).toBe(9000);
  });

  it("records an archive replay without touching the streak", () => {
    const before = progress({
      current: 3,
      longest: 3,
      lastPlayedDate: "2026-07-25",
    });
    const next = recordDailyResult(before, "2026-07-10", 7000, at("2026-07-26"));

    expect(next.current).toBe(3);
    expect(next.lastPlayedDate).toBe("2026-07-25");
    expect(next.scores["2026-07-10"]).toBe(7000);
  });
});

describe("activeStreak", () => {
  it("still counts a streak the day after it was last played", () => {
    const held = progress({ current: 6, lastPlayedDate: "2026-07-25" });
    expect(activeStreak(held, at("2026-07-26"))).toBe(6);
  });

  it("counts a streak played today", () => {
    const held = progress({ current: 6, lastPlayedDate: "2026-07-26" });
    expect(activeStreak(held, at("2026-07-26"))).toBe(6);
  });

  it("reads as broken once a day has been missed", () => {
    const stale = progress({ current: 6, lastPlayedDate: "2026-07-24" });
    expect(activeStreak(stale, at("2026-07-26"))).toBe(0);
  });
});

describe("daily progress storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips through local storage", () => {
    const saved = progress({
      current: 2,
      longest: 5,
      lastPlayedDate: "2026-07-26",
      scores: { "2026-07-26": 8100 },
    });
    writeDailyProgress(saved, window.localStorage);

    expect(readDailyProgress(window.localStorage)).toEqual(saved);
  });

  it("returns empty progress when nothing is stored", () => {
    expect(readDailyProgress(window.localStorage)).toEqual(progress());
  });

  it("discards a record written by a different version", () => {
    window.localStorage.setItem(
      DAILY_PROGRESS_KEY,
      JSON.stringify({ version: 99, progress: { current: 40 } }),
    );

    expect(readDailyProgress(window.localStorage).current).toBe(0);
  });

  it("drops malformed dates and scores rather than trusting them", () => {
    window.localStorage.setItem(
      DAILY_PROGRESS_KEY,
      JSON.stringify({
        version: 1,
        progress: {
          current: -3,
          longest: "many",
          lastPlayedDate: "yesterday",
          scores: { "2026-07-26": 900, "not-a-date": 10, "2026-07-25": -5 },
        },
      }),
    );

    const read = readDailyProgress(window.localStorage);

    expect(read.current).toBe(0);
    expect(read.longest).toBe(0);
    expect(read.lastPlayedDate).toBeNull();
    expect(read.scores).toEqual({ "2026-07-26": 900 });
  });

  it("survives unparseable storage", () => {
    window.localStorage.setItem(DAILY_PROGRESS_KEY, "{{{");

    expect(readDailyProgress(window.localStorage)).toEqual(progress());
  });
});
