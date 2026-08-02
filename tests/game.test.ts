import { describe, expect, it } from "vitest";
import {
  formatQuestionValue,
  formatYear,
  positionToValue,
  QUESTION_HISTORY_KEY,
  QUESTIONS_PER_GAME,
  pickDemoQuestion,
  readBestScores,
  readQuestionHistory,
  scoreGuess,
  selectQuestions,
  selectQuestionsWithHistory,
  startPosition,
  STORAGE_KEY,
  valueToPosition,
  writeBestScores,
  writeQuestionHistory,
} from "@/lib/game";
import { questions } from "@/lib/questions";

type Question = Parameters<typeof positionToValue>[0];

// Tied to the real Question type rather than a hand-listed subset, so a field
// added to the model cannot silently become unsettable here.
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

describe("startPosition", () => {
  it("gives the same question the same start every time", () => {
    const subject = question({ id: "stable-question" });
    expect(startPosition(subject)).toBe(startPosition(subject));
    // A different object with the same id is the same puzzle to every player.
    expect(startPosition(question({ id: "stable-question" }))).toBe(
      startPosition(subject),
    );
  });

  it("moves the start around as the question changes", () => {
    const starts = new Set(
      Array.from({ length: 40 }, (_, index) =>
        startPosition(question({ id: `varied-${index}` })),
      ),
    );
    // No fixed strategy survives if the opening position keeps moving.
    expect(starts.size).toBeGreaterThan(30);
  });

  it("stays inside the band, away from both rail ends", () => {
    for (let index = 0; index < 200; index += 1) {
      const start = startPosition(question({ id: `banded-${index}` }));
      expect(start).toBeGreaterThanOrEqual(0.1);
      expect(start).toBeLessThanOrEqual(0.9);
    }
  });

  it("never opens on top of the answer, wherever the answer sits", () => {
    for (let answer = 0; answer <= 100; answer += 1) {
      const subject = question({ id: `answer-${answer}`, answer });
      const start = startPosition(subject);
      const answerPosition = valueToPosition(subject, answer);
      expect(Math.abs(start - answerPosition)).toBeGreaterThanOrEqual(0.2);
    }
  });

  it("keeps its distance on a log scale too, where positions bunch up", () => {
    for (let power = 0; power < 9; power += 1) {
      const subject = question({
        id: `log-${power}`,
        answer: 10 ** power,
        min: 1,
        max: 1_000_000_000,
        scale: "log",
        unit: "count",
      });
      const start = startPosition(subject);
      const answerPosition = valueToPosition(subject, subject.answer);
      expect(Math.abs(start - answerPosition)).toBeGreaterThanOrEqual(0.2);
    }
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
  it.each([
    "population",
    "history",
    "geography",
    "science",
    "animals",
    "space",
    "technology",
    "movies",
  ] as const)(
    "returns five unique %s questions",
    (mode) => {
      const selected = selectQuestions(mode, seededRandom(1234));

      expect(selected).toHaveLength(5);
      expect(new Set(selected.map(({ id }) => id)).size).toBe(5);
      expect(selected.every(({ category }) => category === mode)).toBe(true);
    },
  );

  it("returns a balanced, unique mixed round", () => {
    const selected = selectQuestions("mixed", seededRandom(5678));

    expect(selected).toHaveLength(5);
    expect(new Set(selected.map(({ id }) => id)).size).toBe(5);
    expect(new Set(selected.map(({ category }) => category)).size).toBe(5);
  });

  it("is deterministic when supplied the same random sequence", () => {
    const first = selectQuestions("mixed", seededRandom(42)).map(({ id }) => id);
    const second = selectQuestions("mixed", seededRandom(42)).map(
      ({ id }) => id,
    );

    expect(first).toEqual(second);
  });

  it("remembers seen questions and avoids repeats while enough remain", () => {
    const first = selectQuestionsWithHistory(
      "history",
      {},
      seededRandom(100),
    );
    const second = selectQuestionsWithHistory(
      "history",
      first.history,
      seededRandom(200),
    );
    const firstIds = new Set(first.questions.map(({ id }) => id));

    expect(second.questions).toHaveLength(QUESTIONS_PER_GAME);
    expect(second.questions.every(({ id }) => !firstIds.has(id))).toBe(true);
  });

  it("finishes a small category cycle before recycling questions", () => {
    const category = "science";
    const unseenQuestions = QUESTIONS_PER_GAME - 1;
    const categoryQuestionIds = questions
      .filter((question) => question.category === category)
      .map((question) => question.id);
    const seenQuestionIds = categoryQuestionIds.slice(0, -unseenQuestions);
    const result = selectQuestionsWithHistory(
      category,
      { [category]: seenQuestionIds },
      seededRandom(400),
    );
    const seenIds = new Set(seenQuestionIds);
    const resultIds = new Set(result.questions.map(({ id }) => id));

    expect(resultIds.size).toBe(QUESTIONS_PER_GAME);
    expect(
      result.questions.filter(({ id }) => !seenIds.has(id)),
    ).toHaveLength(unseenQuestions);
    expect(result.history[category]).toHaveLength(1);
  });

  it("remembers mixed questions while keeping five categories represented", () => {
    const first = selectQuestionsWithHistory("mixed", {}, seededRandom(500));
    const second = selectQuestionsWithHistory(
      "mixed",
      first.history,
      seededRandom(600),
    );
    const firstIds = new Set(first.questions.map(({ id }) => id));

    expect(second.questions.every(({ id }) => !firstIds.has(id))).toBe(true);
    expect(new Set(second.questions.map(({ category }) => category)).size).toBe(5);
  });
});

describe("formatQuestionValue", () => {
  const metres = (overrides = {}) =>
    question({ measure: "size", subtype: "length", unit: "metre", scale: "log", min: 0.1, max: 100, answer: 6.5, ...overrides });

  it("keeps a decimal on small fractional values", () => {
    // 6.5 m displaying as "7 m" would contradict the answer the round scores.
    expect(formatQuestionValue(metres(), 6.5)).toBe("6.5 m");
    expect(formatQuestionValue(metres(), 0.25)).toBe("0.3 m");
  });

  it("still rounds whole numbers and large magnitudes", () => {
    expect(formatQuestionValue(metres(), 7)).toBe("7 m");
    expect(formatQuestionValue(metres(), 143000.4)).toBe("143,000 m");
  });

  it("leaves units that set their own precision alone", () => {
    const percent = question({ measure: "quantity", subtype: "percentage", unit: "percent", scale: "linear", min: 0, max: 100, answer: 12.5 });
    expect(formatQuestionValue(percent, 12.5)).toBe("12.5%");
  });
});

describe("pickDemoQuestion", () => {
  it("draws from the whole bank rather than one category", () => {
    const drawn = new Set(
      Array.from({ length: 200 }, (_, index) =>
        pickDemoQuestion(seededRandom(index)).category,
      ),
    );

    expect(drawn.size).toBeGreaterThan(1);
  });

  it("is deterministic when supplied the same random sequence", () => {
    expect(pickDemoQuestion(seededRandom(7)).id).toBe(
      pickDemoQuestion(seededRandom(7)).id,
    );
  });

  it("stays in range at both ends of the random sequence", () => {
    expect(pickDemoQuestion(() => 0)).toBeDefined();
    // Math.random never returns 1, but an injected sequence might.
    expect(pickDemoQuestion(() => 1)).toBeDefined();
  });
});

describe("question history storage", () => {
  it("round-trips valid seen IDs and drops invalid data", () => {
    const draw = selectQuestionsWithHistory("history", {}, seededRandom(700));
    writeQuestionHistory(draw.history, window.localStorage);

    expect(window.localStorage.getItem(QUESTION_HISTORY_KEY)).not.toBeNull();
    expect(readQuestionHistory(window.localStorage)).toEqual(draw.history);

    window.localStorage.setItem(
      QUESTION_HISTORY_KEY,
      JSON.stringify({
        version: 1,
        seenByMode: {
          history: [
            draw.questions[0]?.id,
            draw.questions[0]?.id,
            "not-a-question",
            42,
          ],
        },
      }),
    );

    expect(readQuestionHistory(window.localStorage).history).toEqual([
      draw.questions[0]?.id,
    ]);
  });

  it("falls back safely for malformed or unknown versions", () => {
    window.localStorage.setItem(QUESTION_HISTORY_KEY, "{not valid JSON");
    expect(readQuestionHistory(window.localStorage)).toEqual({});

    window.localStorage.setItem(
      QUESTION_HISTORY_KEY,
      JSON.stringify({ version: 999, seenByMode: {} }),
    );
    expect(readQuestionHistory(window.localStorage)).toEqual({});
  });
});

describe("best-score storage", () => {
  const emptyScores = {
    population: 0,
    history: 0,
    geography: 0,
    science: 0,
    animals: 0,
    space: 0,
    technology: 0,
    movies: 0,
    dinosaurs: 0,
    games: 0,
    mixed: 0,
  };

  it("uses a versioned, application-specific key", () => {
    expect(STORAGE_KEY).toBe("close-enough:v4");
  });

  it("round-trips best scores through an injected Storage object", () => {
    const scores = {
      population: 7_800,
      history: 8_250,
      geography: 6_400,
      science: 7_100,
      animals: 5_950,
      space: 6_700,
      technology: 7_450,
      movies: 8_010,
      dinosaurs: 0,
      games: 0,
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
