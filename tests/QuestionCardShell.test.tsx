import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Question } from "@/lib/types";
import {
  QuestionCardShell,
  questionArtworkVariant,
} from "@/src/QuestionCardShell";

const movieQuestion: Question = {
  id: "movies-release-pulp-fiction",
  category: "movies",
  measure: "history",
  subtype: "event",
  prompt: "In what year was Pulp Fiction first released in cinemas?",
  answer: 1994,
  min: 1895,
  max: 2026,
  scale: "linear",
  unit: "year",
  explanation: "It premiered in 1994.",
  source: { title: "Example source", url: "https://example.com" },
};

describe("QuestionCardShell", () => {
  it("renders category identity, progress, subtype, and prompt", () => {
    const { container } = render(
      <QuestionCardShell
        question={movieQuestion}
        progressLabel="Question 2 of 5"
        headingRef={null}
      >
        <button type="button">Lock in guess</button>
      </QuestionCardShell>,
    );

    expect(screen.getByText("Movies")).toBeInTheDocument();
    expect(container.querySelector(".question-card-category-icon-shell")).not.toBeNull();
    expect(container.querySelector(".question-card-category-name")).toHaveTextContent(
      "Movies",
    );
    expect(container.querySelector(".question-card-category-copy")).toHaveTextContent(
      "MoviesHistoric event",
    );
    expect(screen.getByLabelText("Question 2 of 5")).toBeInTheDocument();
    expect(container.querySelector(".question-card-counter-label")).toHaveTextContent(
      "Question",
    );
    expect(container.querySelector(".question-card-counter-value")).toHaveTextContent(
      "2 of 5",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      movieQuestion.prompt,
    );
    expect(container.querySelector("[data-category='movies']")).not.toBeNull();
  });

  it("selects artwork deterministically and reaches every variant", () => {
    expect(questionArtworkVariant(movieQuestion.id)).toBe(
      questionArtworkVariant(movieQuestion.id),
    );

    const variants = new Set(
      Array.from({ length: 100 }, (_, index) =>
        questionArtworkVariant(`question-${index}`),
      ),
    );
    expect(variants).toEqual(new Set([0, 1, 2]));
  });
});
