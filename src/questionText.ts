import { useEffect, useState } from "react";
import { formatQuestionValue } from "../lib/game";
import type { Question } from "../lib/types";

const SUBTYPE_LABELS: Record<Question["subtype"], string> = {
  country: "Country population",
  city: "City population",
  event: "Historic event",
  length: "Length and distance",
  area: "Area",
  mass: "Mass",
  count: "How many",
  percentage: "Share of the whole",
  money: "Historic cost",
  duration: "How long",
  speed: "Speed",
  temperature: "Temperature",
};

export function formatPoints(points: number) {
  return new Intl.NumberFormat("en-GB").format(points);
}

export function subtypeLabel(question: Question) {
  return SUBTYPE_LABELS[question.subtype];
}

export function unitSuffix(question: Question) {
  return question.unit === "people" ? " people" : "";
}

function differenceLabel(question: Question, guess: number) {
  const difference = Math.abs(question.answer - guess);
  if (question.unit === "year") {
    return `${formatPoints(difference)} ${difference === 1 ? "year" : "years"}`;
  }
  if (question.unit === "people") {
    return `${formatPoints(difference)} ${difference === 1 ? "person" : "people"}`;
  }
  // Every other unit already carries its own wording out of the formatter.
  return formatQuestionValue(question, difference);
}

export function verdictDetail(question: Question, guess: number) {
  if (guess === question.answer) return "Exactly right.";
  const behind = guess < question.answer;
  const direction =
    question.unit === "year"
      ? behind
        ? "too early"
        : "too late"
      : question.unit === "people"
        ? behind
          ? "under"
          : "over"
        : behind
          ? "too low"
          : "too high";
  return `You were ${differenceLabel(question, guess)} ${direction}.`;
}

export function prefersReducedMotion() {
  return (
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Counts up to `target` once `enabled`, so the points land rather than appear. */
export function useCountUp(target: number, enabled: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setValue(0);
      return;
    }
    if (target === 0 || prefersReducedMotion()) {
      setValue(target);
      return;
    }

    const duration = 550;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(step);
    });

    return () => cancelAnimationFrame(frame);
  }, [target, enabled]);

  return value;
}
