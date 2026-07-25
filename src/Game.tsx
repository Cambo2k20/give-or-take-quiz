import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type BestScores,
  accuracyTier,
  formatQuestionValue,
  positionToValue,
  readBestScores,
  scoreGuess,
  selectQuestions,
  valueToPosition,
  writeBestScores,
} from "../lib/game";
import type { GameMode, Question } from "../lib/types";
import { type Theme, applyTheme, readTheme } from "./theme";

type Phase = "category" | "playing" | "results";
type RoundResult = { question: Question; guess: number; points: number };

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.5l3.5 2" strokeLinecap="round" />
  </svg>
);

const ShuffleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M4 7h3.5l9 10H20M4 17h3.5l9-10H20" strokeLinecap="round" />
    <path d="M17 4l3 3-3 3M17 14l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MODES: Array<{
  mode: GameMode;
  title: string;
  description: string;
  note: string;
  icon: ReactNode;
}> = [
  {
    mode: "population",
    title: "Population",
    description: "Countries and cities, from compact capitals to billions.",
    note: "10 questions · log scale",
    icon: <GlobeIcon />,
  },
  {
    mode: "history",
    title: "History",
    description: "Place inventions, turning points and empires on the timeline.",
    note: "10 questions · timeline",
    icon: <ClockIcon />,
  },
  {
    mode: "mixed",
    title: "Mixed",
    description: "Five population questions and five moments from history.",
    note: "10 questions · a bit of both",
    icon: <ShuffleIcon />,
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

function verdictDetail(question: Question, guess: number) {
  if (guess === question.answer) return "Exactly right.";
  const direction =
    question.unit === "year"
      ? guess < question.answer
        ? "too early"
        : "too late"
      : guess < question.answer
        ? "under"
        : "over";
  return `You were ${differenceLabel(question, guess)} ${direction}.`;
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Counts up to `target` once `enabled`, so the points land rather than appear. */
function useCountUp(target: number, enabled: boolean) {
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
  const [revealing, setRevealing] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  // Read straight from the browser during the first render. The app is fully
  // client-rendered, so there is no server pass to mismatch against.
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [bestScores, setBestScores] = useState<BestScores>(readBestScores);
  const [shareStatus, setShareStatus] = useState("");
  const focusHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (phase !== "category") focusHeadingRef.current?.focus();
  }, [phase, questionIndex]);

  // Hold the pre-reveal frame long enough for the marker transition to run.
  useEffect(() => {
    if (!revealing) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setRevealing(false));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [revealing]);

  const totalScore = useMemo(
    () => results.reduce((sum, result) => sum + result.points, 0),
    [results],
  );
  const question = gameQuestions[questionIndex];
  const guess = question ? positionToValue(question, position) : 0;
  const currentResult = results[questionIndex];
  const tier = currentResult ? accuracyTier(currentResult.points) : null;
  const countedPoints = useCountUp(
    currentResult?.points ?? 0,
    Boolean(currentResult),
  );

  const answerPosition = question
    ? valueToPosition(question, question.answer)
    : 0;
  const bandLeft = Math.min(position, answerPosition);
  const bandWidth = Math.abs(answerPosition - position);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  function startGame(selectedMode: GameMode) {
    setMode(selectedMode);
    setGameQuestions(selectQuestions(selectedMode));
    setQuestionIndex(0);
    setPosition(0.5);
    setLocked(false);
    setRevealing(false);
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
    setRevealing(true);
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
    setRevealing(false);
  }

  function handleSliderKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!question || locked) return;
    const yearSpan = question.max - question.min;
    const fine =
      question.scale === "linear" ? Math.max(1 / yearSpan, 0.0001) : 0.005;
    const large =
      question.scale === "linear" ? Math.max(10 / yearSpan, 0.02) : 0.05;
    let next: number | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown")
      next = position - fine;
    if (event.key === "ArrowRight" || event.key === "ArrowUp")
      next = position + fine;
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
        <div className="header-side">
          {phase === "playing" && (
            <p className="score-chip">
              {MODE_LABELS[mode]} · <strong>{formatPoints(totalScore)}</strong>
            </p>
          )}
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="4.5" />
                <path
                  d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path
                  d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
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
                <span className="mode-icon">{detail.icon}</span>
                <strong>{detail.title}</strong>
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
            <span>60 sourced questions, bundled with the app</span>
            <span>Best scores stay on this device</span>
          </div>
        </section>
      )}

      {phase === "playing" && question && (
        <section className="game-screen">
          <div
            className="progress-dots"
            role="progressbar"
            aria-label="Game progress"
            aria-valuemin={1}
            aria-valuemax={gameQuestions.length}
            aria-valuenow={questionIndex + 1}
          >
            {gameQuestions.map((item, index) => (
              <span
                key={item.id}
                className={
                  index === questionIndex
                    ? "is-current"
                    : index < questionIndex
                      ? "is-done"
                      : undefined
                }
              />
            ))}
          </div>

          <article className="question-card">
            <span className="question-tag">{subtypeLabel(question)}</span>
            <h1 ref={focusHeadingRef} tabIndex={-1}>
              {question.prompt}
            </h1>

            <div
              className={`estimate-panel${revealing ? " is-revealing" : ""}${tier ? ` tier-${tier.id}` : ""}`}
              style={
                {
                  "--guess-position": `${position * 100}%`,
                  "--answer-position": `${answerPosition * 100}%`,
                  "--band-left": `${bandLeft * 100}%`,
                  "--band-width": `${bandWidth * 100}%`,
                } as CSSProperties
              }
            >
              <output className="estimate-value" htmlFor="estimate-slider">
                {formatQuestionValue(question, guess)}
              </output>
              <span className="estimate-label">
                {locked ? "Your locked guess" : "Your estimate"}
              </span>

              <div className="slider-wrap">
                <span className="slider-rail" aria-hidden="true" />
                <span className="slider-fill" aria-hidden="true" />
                {locked && <span className="miss-band" aria-hidden="true" />}
                {locked && <span className="answer-dot" aria-hidden="true" />}
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
              <div className={`reveal tier-${tier?.id ?? "far"}`} aria-live="polite">
                <div className="verdict">
                  <h2>{tier?.headline}</h2>
                  <p>{verdictDetail(question, currentResult.guess)}</p>
                </div>
                <div className="stat-tiles">
                  <div className="stat-tile">
                    <span>Answer</span>
                    <strong>{formatQuestionValue(question, question.answer)}</strong>
                  </div>
                  <div className="stat-tile">
                    <span>Your guess</span>
                    <strong>
                      {formatQuestionValue(question, currentResult.guess)}
                    </strong>
                  </div>
                  <div className="stat-tile is-points">
                    <span>Points</span>
                    <strong>+{formatPoints(countedPoints)}</strong>
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
            <p className="eyebrow">{MODE_LABELS[mode]} · Game complete</p>
            <h1 ref={focusHeadingRef} tabIndex={-1}>
              Final score
            </h1>
            <div className="final-score">
              <strong>{formatPoints(totalScore)}</strong>
              <span>/ 10,000</span>
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
          </div>

          <div className="breakdown">
            <div className="section-heading">
              <h2>Question by question</h2>
              <span>{results.length} rounds</span>
            </div>
            <ol className="result-list">
              {results.map((result) => (
                <li
                  key={result.question.id}
                  className={`tier-${accuracyTier(result.points).id}`}
                >
                  <div className="result-question">
                    <strong>{result.question.prompt}</strong>
                    <span>
                      Your guess{" "}
                      {formatQuestionValue(result.question, result.guess)}
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
        <strong>Give or Take</strong>
        <span>Facts have sources. Guesses are all yours.</span>
      </footer>
    </main>
  );
}
