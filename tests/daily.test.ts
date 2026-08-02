import { beforeEach, describe, expect, it } from "vitest";
import {
  DAILY_PROGRESS_KEY,
  activeStreak,
  applyOfficialDailyResult,
  previousDay,
  readDailyProgress,
  reconcileOfficialDailyHistory,
  recordLocalDailyResult,
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
    dates: {},
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

describe("recordLocalDailyResult", () => {
  it("starts a streak on a first play", () => {
    const next = recordLocalDailyResult(
      progress(),
      "2026-07-26",
      6840,
      at("2026-07-26"),
    );

    expect(next.current).toBe(1);
    expect(next.longest).toBe(1);
    expect(next.lastPlayedDate).toBe("2026-07-26");
    expect(next.dates["2026-07-26"]).toEqual({
      officialScore: 6840,
      practiceBest: null,
      attemptCount: 1,
    });
  });

  it("extends the streak when yesterday was played", () => {
    const next = recordLocalDailyResult(
      progress({ current: 4, longest: 9, lastPlayedDate: "2026-07-25" }),
      "2026-07-26",
      5000,
      at("2026-07-26"),
    );

    expect(next.current).toBe(5);
    expect(next.longest).toBe(9);
  });

  it("resets the streak when a day was missed", () => {
    const next = recordLocalDailyResult(
      progress({ current: 12, longest: 12, lastPlayedDate: "2026-07-20" }),
      "2026-07-26",
      5000,
      at("2026-07-26"),
    );

    expect(next.current).toBe(1);
    expect(next.longest).toBe(12);
  });

  it("does not count replaying the same day twice", () => {
    const once = recordLocalDailyResult(
      progress(),
      "2026-07-26",
      4000,
      at("2026-07-26"),
    );
    const twice = recordLocalDailyResult(
      once,
      "2026-07-26",
      9000,
      at("2026-07-26"),
    );

    expect(twice.current).toBe(1);
    // The first play is the one the local heuristic calls official — a
    // replay banks as practice, whatever it scores.
    expect(twice.dates["2026-07-26"]).toEqual({
      officialScore: 4000,
      practiceBest: 9000,
      attemptCount: 2,
    });
  });

  it("keeps the official score fixed while practice replays vary", () => {
    const high = recordLocalDailyResult(
      progress(),
      "2026-07-26",
      9000,
      at("2026-07-26"),
    );
    // The first play is official at 9000; this replay is practice at 100 —
    // it must not touch the official score, however it scores.
    const low = recordLocalDailyResult(high, "2026-07-26", 100, at("2026-07-26"));
    // A better practice replay raises practiceBest, still leaving official alone.
    const better = recordLocalDailyResult(
      low,
      "2026-07-26",
      6000,
      at("2026-07-26"),
    );

    expect(low.dates["2026-07-26"].officialScore).toBe(9000);
    expect(low.dates["2026-07-26"].practiceBest).toBe(100);
    expect(better.dates["2026-07-26"].officialScore).toBe(9000);
    expect(better.dates["2026-07-26"].practiceBest).toBe(6000);
  });

  it("stores the per-question breakdown for the official attempt only", () => {
    const official = recordLocalDailyResult(
      progress(),
      "2026-07-26",
      1067,
      at("2026-07-26"),
      [211, 212, 120, 95, 429],
    );
    expect(official.dates["2026-07-26"].officialPoints).toEqual([
      211, 212, 120, 95, 429,
    ]);

    // A practice replay reports its own per-question points, but the stored
    // breakdown must keep explaining the official score rather than this one.
    const replayed = recordLocalDailyResult(
      official,
      "2026-07-26",
      5000,
      at("2026-07-26"),
      [1000, 1000, 1000, 1000, 1000],
    );
    expect(replayed.dates["2026-07-26"].officialScore).toBe(1067);
    expect(replayed.dates["2026-07-26"].officialPoints).toEqual([
      211, 212, 120, 95, 429,
    ]);
  });

  it("omits the breakdown when no per-question points are given", () => {
    const next = recordLocalDailyResult(
      progress(),
      "2026-07-26",
      6840,
      at("2026-07-26"),
    );
    expect(next.dates["2026-07-26"].officialPoints).toBeUndefined();
  });

  it("records an archive replay without touching the streak", () => {
    const before = progress({
      current: 3,
      longest: 3,
      lastPlayedDate: "2026-07-25",
    });
    const next = recordLocalDailyResult(
      before,
      "2026-07-10",
      7000,
      at("2026-07-26"),
    );

    expect(next.current).toBe(3);
    expect(next.lastPlayedDate).toBe("2026-07-25");
    expect(next.dates["2026-07-10"].officialScore).toBe(7000);
  });
});

describe("applyOfficialDailyResult", () => {
  it("does nothing when the server has no result to report", () => {
    const before = progress({ current: 2, lastPlayedDate: "2026-07-25" });
    expect(applyOfficialDailyResult(before, "2026-07-26", null, at("2026-07-26"))).toBe(
      before,
    );
  });

  it("credits the streak for today from server truth alone", () => {
    // Nothing was recorded locally yet — this is the on-load reconciliation
    // path, where another device already went official today.
    const next = applyOfficialDailyResult(
      progress({ current: 3, lastPlayedDate: "2026-07-25" }),
      "2026-07-26",
      { score: 4200, attempts: 1 },
      at("2026-07-26"),
    );

    expect(next.current).toBe(4);
    expect(next.lastPlayedDate).toBe("2026-07-26");
    expect(next.dates["2026-07-26"]).toEqual({
      officialScore: 4200,
      practiceBest: null,
      attemptCount: 1,
    });
  });

  it("corrects a wrong local guess without double-crediting the streak", () => {
    // This device optimistically recorded itself as official...
    const optimistic = recordLocalDailyResult(
      progress({ current: 3, lastPlayedDate: "2026-07-25" }),
      "2026-07-26",
      1000,
      at("2026-07-26"),
    );
    expect(optimistic.current).toBe(4);

    // ...but the server says a different attempt actually won the slot.
    const corrected = applyOfficialDailyResult(
      optimistic,
      "2026-07-26",
      { score: 4200, attempts: 2 },
      at("2026-07-26"),
    );

    expect(corrected.current).toBe(4);
    expect(corrected.dates["2026-07-26"].officialScore).toBe(4200);
    expect(corrected.dates["2026-07-26"].attemptCount).toBe(2);
  });

  it("drops a breakdown the server's official score contradicts", () => {
    const optimistic = recordLocalDailyResult(
      progress(),
      "2026-07-26",
      1000,
      at("2026-07-26"),
      [200, 200, 200, 200, 200],
    );

    // A different attempt won the slot, so the stored per-question points no
    // longer add up to the score being shown and must not be displayed.
    const corrected = applyOfficialDailyResult(
      optimistic,
      "2026-07-26",
      { score: 4200, attempts: 2 },
      at("2026-07-26"),
    );
    expect(corrected.dates["2026-07-26"].officialPoints).toBeUndefined();
  });

  it("keeps the breakdown when the server confirms the same score", () => {
    const local = recordLocalDailyResult(
      progress(),
      "2026-07-26",
      1000,
      at("2026-07-26"),
      [200, 200, 200, 200, 200],
    );
    const confirmed = applyOfficialDailyResult(
      local,
      "2026-07-26",
      { score: 1000, attempts: 1 },
      at("2026-07-26"),
    );

    expect(confirmed.dates["2026-07-26"].officialPoints).toEqual([
      200, 200, 200, 200, 200,
    ]);
  });

  it("leaves the streak alone for a date other than today", () => {
    const before = progress({ current: 5, lastPlayedDate: "2026-07-26" });
    const next = applyOfficialDailyResult(
      before,
      "2026-07-10",
      { score: 3000, attempts: 1 },
      at("2026-07-26"),
    );

    expect(next.current).toBe(5);
    expect(next.lastPlayedDate).toBe("2026-07-26");
    expect(next.dates["2026-07-10"].officialScore).toBe(3000);
  });

  it("uses the larger of the local and server attempt counts", () => {
    const local = recordLocalDailyResult(
      progress(),
      "2026-07-26",
      1000,
      at("2026-07-26"),
    );
    const reconciled = applyOfficialDailyResult(
      local,
      "2026-07-26",
      { score: 1000, attempts: 1 },
      at("2026-07-26"),
    );

    expect(reconciled.dates["2026-07-26"].attemptCount).toBe(1);
  });
});

describe("reconcileOfficialDailyHistory", () => {
  it("restores scores and streaks on a fresh browser", () => {
    const reconciled = reconcileOfficialDailyHistory(progress(), [
      { date: "2026-07-31", score: 3100, attempts: 1 },
      { date: "2026-08-01", score: 4200, attempts: 2 },
      { date: "2026-08-02", score: 3900, attempts: 1 },
    ]);

    expect(reconciled.current).toBe(3);
    expect(reconciled.longest).toBe(3);
    expect(reconciled.lastPlayedDate).toBe("2026-08-02");
    expect(reconciled.dates["2026-08-01"]).toEqual({
      officialScore: 4200,
      practiceBest: null,
      attemptCount: 2,
    });
  });

  it("keeps device-only practice data while server truth replaces official data", () => {
    const local = progress({
      current: 1,
      longest: 4,
      lastPlayedDate: "2026-08-02",
      dates: {
        "2026-08-01": {
          officialScore: 1200,
          practiceBest: 4900,
          attemptCount: 3,
          officialPoints: [200, 200, 200, 200, 400],
        },
        "2026-08-02": {
          officialScore: 3000,
          practiceBest: null,
          attemptCount: 1,
          officialPoints: [600, 600, 600, 600, 600],
        },
      },
    });

    const reconciled = reconcileOfficialDailyHistory(local, [
      { date: "2026-08-01", score: 4100, attempts: 2 },
      { date: "2026-08-02", score: 3000, attempts: 1 },
    ]);

    expect(reconciled.dates["2026-08-01"]).toEqual({
      officialScore: 4100,
      practiceBest: 4900,
      attemptCount: 3,
    });
    expect(reconciled.dates["2026-08-02"].officialPoints).toEqual([
      600, 600, 600, 600, 600,
    ]);
    expect(reconciled.longest).toBe(4);
  });

  it("does not mutate the browser record", () => {
    const local = progress();
    const reconciled = reconcileOfficialDailyHistory(local, [
      { date: "2026-08-02", score: 3000, attempts: 1 },
    ]);

    expect(reconciled).not.toBe(local);
    expect(local.dates).toEqual({});
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
      dates: {
        "2026-07-26": {
          officialScore: 8100,
          practiceBest: null,
          attemptCount: 1,
        },
      },
    });
    writeDailyProgress(saved, window.localStorage);

    expect(readDailyProgress(window.localStorage)).toEqual(saved);
  });

  it("round-trips the per-question breakdown", () => {
    const saved = progress({
      current: 1,
      longest: 1,
      lastPlayedDate: "2026-07-26",
      dates: {
        "2026-07-26": {
          officialScore: 1067,
          practiceBest: null,
          attemptCount: 1,
          officialPoints: [211, 212, 120, 95, 429],
        },
      },
    });
    writeDailyProgress(saved, window.localStorage);

    expect(readDailyProgress(window.localStorage)).toEqual(saved);
  });

  it("drops a malformed breakdown rather than rendering it", () => {
    window.localStorage.setItem(
      DAILY_PROGRESS_KEY,
      JSON.stringify({
        version: 2,
        progress: {
          current: 1,
          longest: 1,
          lastPlayedDate: "2026-07-26",
          dates: {
            "2026-07-26": {
              officialScore: 900,
              practiceBest: null,
              attemptCount: 1,
              officialPoints: [200, "oops", -4],
            },
          },
        },
      }),
    );

    const read = readDailyProgress(window.localStorage);
    expect(read.dates["2026-07-26"].officialScore).toBe(900);
    expect(read.dates["2026-07-26"].officialPoints).toBeUndefined();
  });

  it("reads a record written before breakdowns were stored", () => {
    window.localStorage.setItem(
      DAILY_PROGRESS_KEY,
      JSON.stringify({
        version: 2,
        progress: {
          current: 1,
          longest: 1,
          lastPlayedDate: "2026-07-26",
          dates: {
            "2026-07-26": {
              officialScore: 8100,
              practiceBest: null,
              attemptCount: 1,
            },
          },
        },
      }),
    );

    const read = readDailyProgress(window.localStorage);
    expect(read.dates["2026-07-26"].officialScore).toBe(8100);
    expect(read.dates["2026-07-26"].officialPoints).toBeUndefined();
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

  it("does not mistake a v1 payload under the v2 key for current data", () => {
    window.localStorage.setItem(
      DAILY_PROGRESS_KEY,
      JSON.stringify({
        version: 1,
        progress: {
          current: 5,
          longest: 5,
          lastPlayedDate: "2026-07-26",
          scores: { "2026-07-26": 8100 },
        },
      }),
    );

    expect(readDailyProgress(window.localStorage)).toEqual(progress());
  });

  it("migrates the legacy v1 key into the current per-date format", () => {
    window.localStorage.setItem(
      "give-or-take:daily:v1",
      JSON.stringify({
        version: 1,
        progress: {
          current: 2,
          longest: 4,
          lastPlayedDate: "2026-08-01",
          scores: {
            "2026-07-31": 3600,
            "2026-08-01": 4100,
            invalid: 9999,
          },
        },
      }),
    );

    const migrated = readDailyProgress(window.localStorage);

    expect(migrated).toEqual(
      progress({
        current: 2,
        longest: 4,
        lastPlayedDate: "2026-08-01",
        dates: {
          "2026-07-31": {
            officialScore: 3600,
            practiceBest: null,
            attemptCount: 1,
          },
          "2026-08-01": {
            officialScore: 4100,
            practiceBest: null,
            attemptCount: 1,
          },
        },
      }),
    );
    expect(window.localStorage.getItem(DAILY_PROGRESS_KEY)).not.toBeNull();
  });

  it("keeps current records and fills missing dates from v1 storage", () => {
    const current = progress({
      dates: {
        "2026-08-02": {
          officialScore: 4200,
          practiceBest: null,
          attemptCount: 1,
        },
      },
    });
    writeDailyProgress(current, window.localStorage);
    window.localStorage.setItem(
      "give-or-take:daily:v1",
      JSON.stringify({
        version: 1,
        progress: { scores: { "2026-08-01": 100 } },
      }),
    );

    expect(readDailyProgress(window.localStorage)).toEqual({
      ...current,
      current: 2,
      longest: 2,
      lastPlayedDate: "2026-08-02",
      dates: {
        "2026-08-01": {
          officialScore: 100,
          practiceBest: null,
          attemptCount: 1,
        },
        ...current.dates,
      },
    });
  });

  it("drops malformed dates and entries rather than trusting them", () => {
    window.localStorage.setItem(
      DAILY_PROGRESS_KEY,
      JSON.stringify({
        version: 2,
        progress: {
          current: -3,
          longest: "many",
          lastPlayedDate: "yesterday",
          dates: {
            "2026-07-26": { officialScore: 900, practiceBest: null, attemptCount: 2 },
            "not-a-date": { officialScore: 100, practiceBest: null, attemptCount: 1 },
            "2026-07-25": { officialScore: -5, practiceBest: null, attemptCount: 1 },
          },
        },
      }),
    );

    const read = readDailyProgress(window.localStorage);

    expect(read.current).toBe(0);
    expect(read.longest).toBe(0);
    expect(read.lastPlayedDate).toBeNull();
    expect(read.dates).toEqual({
      "2026-07-26": { officialScore: 900, practiceBest: null, attemptCount: 2 },
      // A negative score is dropped, but the rest of that date's entry is
      // still worth keeping rather than discarding the whole record.
      "2026-07-25": { officialScore: null, practiceBest: null, attemptCount: 1 },
    });
  });

  it("survives unparseable storage", () => {
    window.localStorage.setItem(DAILY_PROGRESS_KEY, "{{{");

    expect(readDailyProgress(window.localStorage)).toEqual(progress());
  });
});
