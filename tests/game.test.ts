import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  formatYear,
  positionToValue,
  readBestScores,
  scoreGuess,
  selectQuestions,
  STORAGE_KEY,
  valueToPosition,
  writeBestScores,
} from "@/lib/game";

type Question = Parameters<typeof positionToValue>[0];

function question(
  overrides: Partial<{
    id: string;
    category: "population" | "history";
    subtype: string;
    prompt: string;
    answer: number;
    min: number;
    max: number;
    scale: "linear" | "log";
    unit: string;
    referenceYear: number;
    source: { title: string; url: string };
    explanation: string;
  }> = {},
) {
  return {
    id: "test-question",
    category: "history" as const,
    subtype: "year",
    prompt: "When did the test event happen?",
    answer: 50,
    min: 0,
    max: 100,
    scale: "linear" as const,
    unit: "year",
    source: { title: "Test source", url: "https://example.com/source" },
    explanation: "A deterministic fixture used by the unit tests.",
    ...overrides,
  } as Question;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

describe("question scale conversions", () => {
  it("maps and clamps a linear scale", () => {
    const fixture = question();

    expect(positionToValue(fixture, -1)).toBe(0);
    expect(positionToValue(fixture, 0)).toBe(0);
    expect(positionToValue(fixture, 0.5)).toBe(50);
    expect(positionToValue(fixture, 1)).toBe(100);
    expect(positionToValue(fixture, 2)).toBe(100);

    expect(valueToPosition(fixture, -1)).toBe(0);
    expect(valueToPosition(fixture, 0)).toBe(0);
    expect(valueToPosition(fixture, 50)).toBe(0.5);
    expect(valueToPosition(fixture, 100)).toBe(1);
    expect(valueToPosition(fixture, 101)).toBe(1);
  });

  it("uses a logarithmic scale for large ranges", () => {
    const fixture = question({
      category: "population",
      answer: 1_000,
      min: 100,
      max: 10_000,
      scale: "log",
      unit: "people",
    });

    expect(positionToValue(fixture, 0)).toBe(100);
    expect(positionToValue(fixture, 0.5)).toBe(1_000);
    expect(positionToValue(fixture, 1)).toBe(10_000);
    expect(valueToPosition(fixture, 1_000)).toBeCloseTo(0.5, 8);
  });

  it("keeps integer-rounded values approximately reversible", () => {
    const fixture = question({ min: 1800, max: 2025, answer: 1969 });

    for (const position of [0, 0.1, 0.25, 0.5, 0.9, 1]) {
      const displayedValue = positionToValue(fixture, position);
      expect(Number.isInteger(displayedValue)).toBe(true);
      expect(valueToPosition(fixture, displayedValue)).toBeCloseTo(position, 2);
    }
  });
});

describe("scoreGuess", () => {
  it("awards 1,000 points for an exact answer", () => {
    const fixture = question({ answer: 50 });
    expect(scoreGuess(fixture, 50)).toBe(1_000);
  });

  it("squares the remaining normalized accuracy", () => {
    const fixture = question({ answer: 50 });

    // The answer is at 0.5 on the normalized scale; either endpoint is
    // therefore 0.5 away: round(1000 * (1 - 0.5) ** 2) = 250.
    expect(scoreGuess(fixture, 0)).toBe(250);
    expect(scoreGuess(fixture, 100)).toBe(250);
  });

  it("returns zero for opposite ends of the scale", () => {
    const fixture = question({ answer: 0 });
    expect(scoreGuess(fixture, 100)).toBe(0);
  });
});

describe("formatYear", () => {
  it("uses historical era notation and has no display year zero", () => {
    expect(formatYear(-44)).toBe("44 BCE");
    expect(formatYear(0)).toBe("1 BCE");
    expect(formatYear(2024)).toBe("2024 CE");
  });
});

describe("selectQuestions", () => {
  it.each(["population", "history", "size", "quantity", "physics"] as const)(
    "returns ten unique %s questions",
    (mode) => {
      const selected = selectQuestions(mode, seededRandom(1234));

      expect(selected).toHaveLength(10);
      expect(new Set(selected.map(({ id }) => id)).size).toBe(10);
      expect(selected.every(({ category }) => category === mode)).toBe(true);
    },
  );

  it("returns a balanced, unique mixed round", () => {
    const selected = selectQuestions("mixed", seededRandom(5678));

    expect(selected).toHaveLength(10);
    expect(new Set(selected.map(({ id }) => id)).size).toBe(10);
    for (const category of CATEGORIES) {
      expect(
        selected.filter((question) => question.category === category),
      ).toHaveLength(2);
    }
  });

  it("is deterministic when supplied the same random sequence", () => {
    const first = selectQuestions("mixed", seededRandom(42)).map(({ id }) => id);
    const second = selectQuestions("mixed", seededRandom(42)).map(
      ({ id }) => id,
    );

    expect(first).toEqual(second);
  });
});

describe("best-score storage", () => {
  const emptyScores = {
    population: 0,
    history: 0,
    size: 0,
    quantity: 0,
    physics: 0,
    mixed: 0,
  };

  it("uses a versioned, application-specific key", () => {
    expect(STORAGE_KEY).toBe("close-enough:v1");
  });

  it("round-trips best scores through an injected Storage object", () => {
    const scores = {
      population: 7_800,
      history: 8_250,
      size: 6_400,
      quantity: 7_100,
      physics: 5_950,
      mixed: 9_100,
    };

    writeBestScores(scores, window.localStorage);

    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(readBestScores(window.localStorage)).toEqual(scores);
  });

  it("falls back safely for missing, malformed, or invalid data", () => {
    expect(readBestScores(window.localStorage)).toEqual(emptyScores);

    window.localStorage.setItem(STORAGE_KEY, "{not valid JSON");
    expect(readBestScores(window.localStorage)).toEqual(emptyScores);

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ population: "excellent", history: -1, mixed: null }),
    );
    expect(readBestScores(window.localStorage)).toEqual(emptyScores);
  });
});
