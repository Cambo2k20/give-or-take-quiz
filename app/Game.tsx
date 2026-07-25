"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type BestScores,
  formatQuestionValue,
  positionToValue,
  readBestScores,
  scoreGuess,
  selectQuestions,
  valueToPosition,
  writeBestScores,
} from "../lib/game";
import type { GameMode, Question } from "../lib/types";

type Phase = "category" | "playing" | "results";
type RoundResult = { question: Question; guess: number; points: number };

const MODES: Array<{
  mode: GameMode;
  number: string;
  title: string;
  description: string;
  note: string;
}> = [
  {
    mode: "population",
    number: "01",
    title: "Population",
    description: "Countries and cities, from compact capitals to billions.",
    note: "10 questions · logarithmic scale",
  },
  {
    mode: "history",
    number: "02",
    title: "History",
    description: "Place inventions, turning points and empires on the timeline.",
    note: "10 questions · linear timeline",
  },
  {
    mode: "mixed",
    number: "03",
    title: "Mixed",
    description: "Five population questions and five moments from history.",
    note: "10 questions · a little of both",
  },
];

const MODE_LABELS: Record<GameMode, string> = {
  population: "Population",
  history: "History",
  mixed: "Mixed",
};

function formatPoints(points: number) {
  return new Intl.NumberFormat("en-GB").format(points);
}

function subtypeLabel(question: Question) {
  if (question.subtype === "country") return "Country population";
  if (question.subtype === "city") return "City population";
  return "Historic event";
}

function unitSuffix(question: Question) {
  return question.unit === "people" ? " people" : "";
}

function differenceLabel(question: Question, guess: number) {
  const difference = Math.abs(question.answer - guess);
  if (question.unit === "year") {
    return `${formatPoints(difference)} ${difference === 1 ? "year" : "years"}`;
  }
  return `${formatPoints(difference)} ${difference === 1 ? "person" : "people"}`;
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export default function Game() {
  const [phase, setPhase] = useState<Phase>("category");
  const [mode, setMode] = useState<GameMode>("mixed");
  const [gameQuestions, setGameQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [position, setPosition] = useState(0.5);
  const [locked, setLocked] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [bestScores, setBestScores] = useState<BestScores>({
    population: 0,
    history: 0,
    mixed: 0,
  });
  const [shareStatus, setShareStatus] = useState("");
  const focusHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setBestScores(readBestScores()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (phase !== "category") focusHeadingRef.current?.focus();
  }, [phase, questionIndex]);

  const totalScore = useMemo(
    () => results.reduce((sum, result) => sum + result.points, 0),
    [results],
  );
  const question = gameQuestions[questionIndex];
  const guess = question ? positionToValue(question, position) : 0;
  const currentResult = results[questionIndex];

  function startGame(selectedMode: GameMode) {
    setMode(selectedMode);
    setGameQuestions(selectQuestions(selectedMode));
    setQuestionIndex(0);
    setPosition(0.5);
    setLocked(false);
    setResults([]);
    setShareStatus("");
    setPhase("playing");
  }

  function lockGuess() {
    if (!question || locked) return;
    setResults((current) => [
      ...current,
      { question, guess, points: scoreGuess(question, guess) },
    ]);
    setLocked(true);
  }

  function goToNextQuestion() {
    if (!locked) return;
    if (questionIndex === gameQuestions.length - 1) {
      const updated = {
        ...bestScores,
        [mode]: Math.max(bestScores[mode], totalScore),
      };
      setBestScores(updated);
      writeBestScores(updated);
      setPhase("results");
      return;
    }
    setQuestionIndex((current) => current + 1);
    setPosition(0.5);
    setLocked(false);
  }

  function handleSliderKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!question || locked) return;
    const yearSpan = question.max - question.min;
    const fine =
      question.scale === "linear" ? Math.max(1 / yearSpan, 0.0001) : 0.005;
    const large =
      question.scale === "linear" ? Math.max(10 / yearSpan, 0.02) : 0.05;
    let next: number | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = position - fine;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = position + fine;
    if (event.key === "PageDown") next = position - large;
    if (event.key === "PageUp") next = position + large;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = 1;
    if (next !== null) {
      event.preventDefault();
      setPosition(Math.min(1, Math.max(0, next)));
    }
  }

  async function shareResult() {
    const text = `I scored ${formatPoints(totalScore)}/10,000 in Give or Take — ${MODE_LABELS[mode]}. How close can you get?`;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Give or Take", text, url });
        setShareStatus("Result shared.");
        return;
      }
      await copyText(`${text} ${url}`);
      setShareStatus("Result copied to your clipboard.");
    } catch {
      try {
        await copyText(`${text} ${url}`);
        setShareStatus("Result copied to your clipboard.");
      } catch {
        setShareStatus("Sharing is unavailable on this device.");
      }
    }
  }

  return (
    <main className="site-shell">
      <header className="site-header">
        <button
          className="wordmark"
          type="button"
          onClick={() => setPhase("category")}
          aria-label="Give or Take home"
        >
          <span className="wordmark-mark" aria-hidden="true" />
          <span>Give or Take</span>
        </button>
        <div className="header-note">
          {phase === "playing" ? (
            <>
              <span>{MODE_LABELS[mode]}</span>
              <strong>{formatPoints(totalScore)} pts</strong>
            </>
          ) : (
            <span>No sign-in. No tracking.</span>
          )}
        </div>
      </header>

      {phase === "category" && (
        <section className="category-screen">
          <div className="hero-copy">
            <p className="eyebrow">A game of informed guesses</p>
            <h1>How close can you get?</h1>
            <p className="hero-lede">
              Ten questions. One slider. Put your instinct somewhere on the line.
            </p>
          </div>
          <div className="mode-grid" aria-label="Choose a category">
            {MODES.map((detail) => (
              <button
                className="mode-card"
                type="button"
                key={detail.mode}
                onClick={() => startGame(detail.mode)}
              >
                <span className="mode-number">{detail.number}</span>
                <span className="mode-title-row">
                  <strong>{detail.title}</strong>
                  <span aria-hidden="true">↗</span>
                </span>
                <span className="mode-description">{detail.description}</span>
                <span className="mode-note">{detail.note}</span>
                {bestScores[detail.mode] > 0 && (
                  <span className="mode-best">
                    Best {formatPoints(bestScores[detail.mode])}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="category-footer">
            <span>60+ locally stored, sourced questions</span>
            <span>Best scores stay on this device</span>
          </div>
        </section>
      )}

      {phase === "playing" && question && (
        <section className="game-screen">
          <div className="progress-row">
            <span>
              Question {String(questionIndex + 1).padStart(2, "0")} /{" "}
              {String(gameQuestions.length).padStart(2, "0")}
            </span>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Game progress"
              aria-valuemin={1}
              aria-valuemax={gameQuestions.length}
              aria-valuenow={questionIndex + 1}
            >
              <span
                style={{
                  width: `${((questionIndex + 1) / gameQuestions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <article className="question-card">
            <div className="question-meta">
              <span>{subtypeLabel(question)}</span>
              <span>
                {question.scale === "log" ? "Logarithmic scale" : "Linear timeline"}
              </span>
            </div>
            <h1 ref={focusHeadingRef} tabIndex={-1}>
              {question.prompt}
            </h1>

            <div
              className={`estimate-panel${locked ? " is-locked" : ""}`}
              style={
                {
                  "--guess-position": `${position * 100}%`,
                  "--answer-position": `${valueToPosition(question, question.answer) * 100}%`,
                } as CSSProperties
              }
            >
              <p className="estimate-label">
                {locked ? "Your locked guess" : "Your estimate"}
              </p>
              <output className="estimate-value" htmlFor="estimate-slider">
                {formatQuestionValue(question, guess)}
                <span>{unitSuffix(question)}</span>
              </output>
              <div className="slider-wrap">
                <input
                  id="estimate-slider"
                  className="estimate-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.0001"
                  value={position}
                  disabled={locked}
                  aria-label="Your estimate"
                  aria-valuetext={`${formatQuestionValue(question, guess)}${unitSuffix(question)}`}
                  onChange={(event) =>
                    setPosition(Number.parseFloat(event.target.value))
                  }
                  onKeyDown={handleSliderKeyDown}
                />
                {locked && (
                  <span className="answer-marker" aria-hidden="true">
                    <span />
                  </span>
                )}
              </div>
              <div className="range-labels" aria-hidden="true">
                <span>{formatQuestionValue(question, question.min)}</span>
                <span>{formatQuestionValue(question, question.max)}</span>
              </div>
              {!locked && (
                <p className="keyboard-help">
                  Drag, tap, or use arrow keys. Page Up/Down moves faster;
                  Home/End jumps to the limits.
                </p>
              )}
            </div>

            {!locked ? (
              <button className="primary-button" type="button" onClick={lockGuess}>
                Lock in guess
              </button>
            ) : (
              <div className="reveal" aria-live="polite">
                <div className="reveal-score">
                  <div>
                    <span>Correct answer</span>
                    <strong>
                      {formatQuestionValue(question, question.answer)}
                      {unitSuffix(question)}
                    </strong>
                  </div>
                  <div>
                    <span>You were off by</span>
                    <strong>{differenceLabel(question, currentResult.guess)}</strong>
                  </div>
                  <div className="points-earned">
                    <span>Points</span>
                    <strong>+{formatPoints(currentResult.points)}</strong>
                  </div>
                </div>
                <p className="reveal-fact">{question.explanation}</p>
                <a
                  className="source-link"
                  href={question.source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source: {question.source.title}
                  <span aria-hidden="true">↗</span>
                </a>
                <button
                  className="primary-button"
                  type="button"
                  onClick={goToNextQuestion}
                >
                  {questionIndex === gameQuestions.length - 1
                    ? "See results"
                    : "Next question"}
                </button>
              </div>
            )}
          </article>
        </section>
      )}

      {phase === "results" && (
        <section className="results-screen">
          <div className="results-hero">
            <div>
              <p className="eyebrow">{MODE_LABELS[mode]} · Game complete</p>
              <h1 ref={focusHeadingRef} tabIndex={-1}>
                Final score
              </h1>
            </div>
            <div className="final-score">
              <strong>{formatPoints(totalScore)}</strong>
              <span>/ 10,000</span>
            </div>
          </div>
          <div className="result-summary">
            <p>
              {totalScore === bestScores[mode] && totalScore > 0
                ? "That’s your best score in this category."
                : `Your best ${MODE_LABELS[mode].toLowerCase()} score is ${formatPoints(bestScores[mode])}.`}
            </p>
            <div className="result-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => startGame(mode)}
              >
                Play again
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setPhase("category")}
              >
                Change category
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={shareResult}
              >
                Share result
              </button>
            </div>
            <p className="share-status" role="status">
              {shareStatus}
            </p>
          </div>
          <div className="breakdown">
            <div className="section-heading">
              <h2>Question by question</h2>
              <span>{results.length} rounds</span>
            </div>
            <ol className="result-list">
              {results.map((result, index) => (
                <li key={result.question.id}>
                  <span className="result-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="result-question">
                    <strong>{result.question.prompt}</strong>
                    <span>
                      Your guess {formatQuestionValue(result.question, result.guess)}
                      {unitSuffix(result.question)} · Answer{" "}
                      {formatQuestionValue(result.question, result.question.answer)}
                      {unitSuffix(result.question)}
                    </span>
                  </div>
                  <strong className="result-points">
                    {formatPoints(result.points)}
                  </strong>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <span>Give or Take</span>
        <span>Facts have sources. Guesses are all yours.</span>
      </footer>
    </main>
  );
}
