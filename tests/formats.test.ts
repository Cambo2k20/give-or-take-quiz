import { beforeEach, describe, expect, it } from "vitest";
import {
  FORMAT_RECORDS_KEY,
  SURVIVAL_START_WINDOW,
  SURVIVAL_WINDOW_FLOOR,
  buildSurvivalDeck,
  questionsUntilTighten,
  readFormatRecords,
  recordSurvivalRun,
  survivalVerdict,
  survivalWindow,
  writeFormatRecords,
} from "@/lib/formats";
import { positionToValue } from "@/lib/game";
import type { Question } from "@/lib/types";
import schedule from "@/data/daily-sets.json";

function question(overrides: Partial<Question> = {}): Question {
  return {
    id: "test-question",
    category: "history",
    measure: "history",
    subtype: "event",
    prompt: "When did the test event happen?",
    answer: 50,
    min: 0,
    max: 100,
    scale: "linear",
    unit: "year",
    source: { title: "Test source", url: "https://example.com/source" },
    explanation: "A deterministic fixture used by the unit tests.",
    ...overrides,
  };
}

describe("survivalWindow", () => {
  it("opens at the starting width and holds it for three questions", () => {
    expect(survivalWindow(1)).toBeCloseTo(SURVIVAL_START_WINDOW, 10);
    expect(survivalWindow(2)).toBeCloseTo(SURVIVAL_START_WINDOW, 10);
    expect(survivalWindow(3)).toBeCloseTo(SURVIVAL_START_WINDOW, 10);
    expect(survivalWindow(4)).toBeLessThan(survivalWindow(3));
  });

  it("never widens as the run goes on", () => {
    for (let n = 2; n <= 60; n += 1) {
      expect(survivalWindow(n)).toBeLessThanOrEqual(survivalWindow(n - 1));
    }
  });

  it("stops at the floor rather than reaching zero", () => {
    expect(survivalWindow(500)).toBe(SURVIVAL_WINDOW_FLOOR);
    expect(survivalWindow(10_000)).toBe(SURVIVAL_WINDOW_FLOOR);
  });

  it("matches the schedule the server enforces", () => {
    // The SQL twin in submit_survival_run is greatest(0.04, 0.12 - 0.01 *
    // floor((n - 1) / 3)). Verified against the live database; if this fails,
    // the two have drifted and runs will be judged differently client and side.
    const expected = [
      0.12, 0.12, 0.12, 0.11, 0.11, 0.11, 0.1, 0.1, 0.1, 0.09, 0.09, 0.09,
      0.08, 0.08, 0.08,
    ];
    expected.forEach((value, index) => {
      expect(survivalWindow(index + 1)).toBeCloseTo(value, 10);
    });
  });
});

describe("questionsUntilTighten", () => {
  it("counts down within each band", () => {
    expect(questionsUntilTighten(1)).toBe(3);
    expect(questionsUntilTighten(2)).toBe(2);
    expect(questionsUntilTighten(3)).toBe(1);
    expect(questionsUntilTighten(4)).toBe(3);
  });

  it("reports nothing further once the floor is reached", () => {
    expect(questionsUntilTighten(500)).toBeNull();
  });
});

describe("survivalVerdict", () => {
  it("lives on a guess inside the window and dies outside it", () => {
    const subject = question({ answer: 50, min: 0, max: 100 });
    // Rail space and value space coincide on this 0..100 linear question, so
    // the window of 0.12 is twelve units either side of the answer.
    expect(survivalVerdict(subject, 55, 1).survived).toBe(true);
    expect(survivalVerdict(subject, 62, 1).survived).toBe(true);
    expect(survivalVerdict(subject, 65, 1).survived).toBe(false);
  });

  it("judges the boundary as surviving", () => {
    const subject = question({ answer: 50, min: 0, max: 100 });
    const window = survivalWindow(1);
    const onEdge = positionToValue(subject, 0.5 + window);
    expect(survivalVerdict(subject, onEdge, 1).distance).toBeCloseTo(window, 6);
    expect(survivalVerdict(subject, onEdge, 1).survived).toBe(true);
  });

  it("tightens as the run goes on, so the same guess later dies", () => {
    const subject = question({ answer: 50, min: 0, max: 100 });
    const guess = positionToValue(subject, 0.5 + 0.1);
    expect(survivalVerdict(subject, guess, 1).survived).toBe(true);
    expect(survivalVerdict(subject, guess, 20).survived).toBe(false);
  });

  it("measures in rail space, so a log question is judged the same way", () => {
    const subject = question({
      id: "log-question",
      answer: 1_000_000,
      min: 1,
      max: 1_000_000_000,
      scale: "log",
      unit: "count",
    });
    // Half a magnitude out on a nine-magnitude rail is a small rail distance,
    // which would be an enormous relative error if judged in value space.
    const near = positionToValue(subject, 0.666 + 0.05);
    const verdict = survivalVerdict(subject, near, 1);
    expect(verdict.distance).toBeLessThan(survivalWindow(1));
    expect(verdict.survived).toBe(true);
  });
});

describe("buildSurvivalDeck", () => {
  it("deals the whole bank with no repeats", () => {
    const deck = buildSurvivalDeck(() => 0.42);
    expect(deck.length).toBeGreaterThan(100);
    expect(new Set(deck.map((q) => q.id)).size).toBe(deck.length);
  });

  it("excludes questions reserved for a daily that has not been played", () => {
    const deck = buildSurvivalDeck(() => 0.42);
    const dealt = new Set(deck.map((q) => q.id));
    const today = new Date().toISOString().slice(0, 10);

    // A `daily-` id no longer means the server would reject the question:
    // once every date it was scheduled for has passed it is retired into the
    // category pool and dealt like any other. What must never be dealt is a
    // daily still ahead of us, today's included, because that leaks the
    // answer to a puzzle still being scored.
    const reserved = schedule.sets
      .filter((set) => set.date >= today)
      .flatMap((set) => set.questions.map((q) => q.id));

    // Without this the assertion goes quietly vacuous once the schedule runs
    // out, which is exactly when it would matter most.
    expect(reserved.length).toBeGreaterThan(0);
    expect(reserved.filter((id) => dealt.has(id))).toEqual([]);
  });
});

describe("format records", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips a best run", () => {
    writeFormatRecords({ survivalBest: 14 }, window.localStorage);
    expect(readFormatRecords(window.localStorage).survivalBest).toBe(14);
  });

  it("only moves the best upward", () => {
    const first = recordSurvivalRun({ survivalBest: 0 }, 9);
    expect(first.survivalBest).toBe(9);
    expect(recordSurvivalRun(first, 4).survivalBest).toBe(9);
    expect(recordSurvivalRun(first, 12).survivalBest).toBe(12);
  });

  it("ignores a stored record from another version", () => {
    window.localStorage.setItem(
      FORMAT_RECORDS_KEY,
      JSON.stringify({ version: 99, records: { survivalBest: 500 } }),
    );
    expect(readFormatRecords(window.localStorage).survivalBest).toBe(0);
  });

  it("survives corrupt storage rather than throwing", () => {
    window.localStorage.setItem(FORMAT_RECORDS_KEY, "{not json");
    expect(readFormatRecords(window.localStorage).survivalBest).toBe(0);
  });
});
