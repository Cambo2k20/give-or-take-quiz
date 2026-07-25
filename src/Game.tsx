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
import { signOut } from "../lib/auth";
import type { GameMode, Question } from "../lib/types";
import {
  AuthPanel,
  ConfirmEmailNotice,
  NewPasswordForm,
} from "./AuthPanel";
import { JoinLeaderboardForm, LeaderboardPanel } from "./Leaderboard";
import { type Theme, applyTheme, readTheme } from "./theme";
import { useAuth } from "./useAuth";
import { useLeaderboard } from "./useLeaderboard";

type Phase = "category" | "playing" | "results" | "leaderboard" | "account";
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

const RocketIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path
      d="M12 2c3 2.2 4.8 5.7 4.8 9.6L12 16l-4.8-4.4C7.2 7.7 9 4.2 12 2Z"
      strokeLinejoin="round"
    />
    <path d="M7.2 11.6 4 14l1.6 3.4M16.8 11.6 20 14l-1.6 3.4" strokeLinejoin="round" />
    <circle cx="12" cy="9" r="1.8" />
  </svg>
);

const StackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 3l9 5-9 5-9-5 9-5Z" strokeLinejoin="round" />
    <path d="M3 13l9 5 9-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
    <path d="M16 5.6a3.2 3.2 0 0 1 0 6M17.5 14.6a5.5 5.5 0 0 1 3 4.9" strokeLinecap="round" />
  </svg>
);

const PawIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <ellipse cx="8" cy="7.5" rx="1.9" ry="2.5" />
    <ellipse cx="16" cy="7.5" rx="1.9" ry="2.5" />
    <ellipse cx="4.6" cy="12.6" rx="1.7" ry="2.2" />
    <ellipse cx="19.4" cy="12.6" rx="1.7" ry="2.2" />
    <path d="M12 12.5c2.8 0 5 2.2 5 4.6 0 1.7-1.4 2.9-3.1 2.9h-3.8c-1.7 0-3.1-1.2-3.1-2.9 0-2.4 2.2-4.6 5-4.6Z" strokeLinejoin="round" />
  </svg>
);

const FilmIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="M7 5v14M17 5v14M2.5 12h19M2.5 8.5h4.5M2.5 15.5h4.5M17 8.5h4.5M17 15.5h4.5" strokeLinecap="round" />
  </svg>
);

const BoltIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round" />
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
    description: "How many people live in a country, a city, or online.",
    note: "10 questions · 35 in the bank",
    icon: <PeopleIcon />,
  },
  {
    mode: "history",
    title: "History",
    description: "Place turning points on the timeline, and price the past.",
    note: "10 questions · 42 in the bank",
    icon: <ClockIcon />,
  },
  {
    mode: "geography",
    title: "Geography",
    description: "Oceans, deserts, mountains and the shape of the land.",
    note: "10 questions · 24 in the bank",
    icon: <GlobeIcon />,
  },
  {
    mode: "science",
    title: "Science",
    description: "Physics, chemistry and the workings of the human body.",
    note: "10 questions · 14 in the bank",
    icon: <BoltIcon />,
  },
  {
    mode: "animals",
    title: "Animals",
    description: "What they weigh, how fast they run, how long they carry.",
    note: "10 questions · 10 in the bank",
    icon: <PawIcon />,
  },
  {
    mode: "space",
    title: "Space",
    description: "Orbits, planets and the machines we have sent up there.",
    note: "10 questions · 15 in the bank",
    icon: <RocketIcon />,
  },
  {
    mode: "technology",
    title: "Technology",
    description: "The tallest, heaviest and fastest things we have built.",
    note: "10 questions · 11 in the bank",
    icon: <StackIcon />,
  },
  {
    mode: "movies",
    title: "Movies",
    description: "When films landed, and what they took at the box office.",
    note: "10 questions · 10 in the bank",
    icon: <FilmIcon />,
  },
  {
    mode: "mixed",
    title: "Mixed",
    description: "A draw from every category at once.",
    note: "10 questions · a bit of everything",
    icon: <ShuffleIcon />,
  },
];

const MODE_LABELS: Record<GameMode, string> = {
  population: "Population",
  history: "History",
  geography: "Geography",
  science: "Science",
  animals: "Animals",
  space: "Space",
  technology: "Technology",
  movies: "Movies",
  mixed: "Mixed",
};

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

function formatPoints(points: number) {
  return new Intl.NumberFormat("en-GB").format(points);
}

function subtypeLabel(question: Question) {
  return SUBTYPE_LABELS[question.subtype];
}

function unitSuffix(question: Question) {
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

function verdictDetail(question: Question, guess: number) {
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
  const auth = useAuth();
  const leaderboard = useLeaderboard(auth.user?.id ?? null);
  // One publish per finished round, whatever React does with effects.
  const publishedRef = useRef(false);

  // Following a reset link drops the player back on the app with a recovery
  // session, so the account screen takes over until the new password is set.
  // Derived rather than pushed into state, so it cannot fight with navigation.
  const activePhase: Phase = auth.recovering ? "account" : phase;

  useEffect(() => {
    if (activePhase !== "category") focusHeadingRef.current?.focus();
  }, [activePhase, questionIndex]);

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

  const { profile: player, publish, resetSubmit, loadBoard } = leaderboard;
  const canPublish = auth.canUseLeaderboard;

  // Publish the moment a round ends, but only for a player who already has a
  // name. Everyone else is offered the join form on the results screen.
  useEffect(() => {
    if (phase !== "results" || publishedRef.current) return;
    if (!player || !canPublish || results.length === 0) return;
    publishedRef.current = true;
    void publish(
      mode,
      results.map((result) => ({
        question_id: result.question.id,
        guess: result.guess,
      })),
    );
  }, [phase, mode, results, player, canPublish, publish]);

  async function joinAndPublish(name: string) {
    await leaderboard.join(name);
    publishedRef.current = true;
    await publish(
      mode,
      results.map((result) => ({
        question_id: result.question.id,
        guess: result.guess,
      })),
    );
  }

  function openLeaderboard() {
    setPhase("leaderboard");
    void loadBoard(mode);
  }

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
    publishedRef.current = false;
    resetSubmit();
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
          {activePhase === "playing" && (
            <p className="score-chip">
              {MODE_LABELS[mode]} · <strong>{formatPoints(totalScore)}</strong>
            </p>
          )}
          {leaderboard.enabled && activePhase !== "playing" && (
            <>
              <button
                className="board-button"
                type="button"
                onClick={openLeaderboard}
              >
                Leaderboard
              </button>
              {auth.status === "signed-in" ? (
                <button
                  className="board-button"
                  type="button"
                  onClick={() => setPhase("account")}
                >
                  {player?.displayName ?? auth.user?.email ?? "Account"}
                </button>
              ) : (
                <button
                  className="board-button"
                  type="button"
                  onClick={() => setPhase("account")}
                >
                  Sign in
                </button>
              )}
            </>
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

      {activePhase === "category" && (
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
            <span>150 sourced questions, bundled with the app</span>
            <span>Best scores stay on this device</span>
          </div>
        </section>
      )}

      {activePhase === "playing" && question && (
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

      {activePhase === "results" && (
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

          {leaderboard.enabled && leaderboard.ready && (
            <div className="board-callout">
              {auth.status === "signed-out" ? (
                <>
                  <p className="board-status">
                    Your score is saved on this device. Sign in to put it on the
                    leaderboard.
                  </p>
                  <AuthPanel compact />
                </>
              ) : !auth.canUseLeaderboard ? (
                <ConfirmEmailNotice email={auth.user?.email ?? null} />
              ) : !player ? (
                <JoinLeaderboardForm onJoin={joinAndPublish} />
              ) : (
                <div className="board-status" role="status">
                  {leaderboard.submit.status === "sending" &&
                    "Saving your score…"}
                  {leaderboard.submit.status === "sent" && (
                    <>
                      Saved as <strong>{player.displayName}</strong>. The server
                      scored this round{" "}
                      <strong>
                        {formatPoints(leaderboard.submit.totalScore)}
                      </strong>
                      .
                    </>
                  )}
                  {leaderboard.submit.status === "failed" && (
                    <span className="is-error">
                      {leaderboard.submit.message}
                    </span>
                  )}
                </div>
              )}
              <button
                className="secondary-button"
                type="button"
                onClick={openLeaderboard}
              >
                See the leaderboard
              </button>
            </div>
          )}

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

      {activePhase === "leaderboard" && (
        <section className="board-screen">
          <div className="results-hero">
            <p className="eyebrow">Best score per player</p>
            <h1 ref={focusHeadingRef} tabIndex={-1}>
              Leaderboard
            </h1>
          </div>

          <div className="board-modes" aria-label="Choose a category">
            {MODES.map((detail) => (
              <button
                key={detail.mode}
                type="button"
                className={`board-mode${detail.mode === mode ? " is-current" : ""}`}
                aria-pressed={detail.mode === mode}
                onClick={() => {
                  setMode(detail.mode);
                  void loadBoard(detail.mode);
                }}
              >
                {detail.title}
              </button>
            ))}
          </div>

          <LeaderboardPanel
            rows={leaderboard.board}
            loading={leaderboard.boardLoading}
            error={leaderboard.boardError}
            profile={player}
          />

          <div className="result-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => startGame(mode)}
            >
              Play {MODE_LABELS[mode]}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setPhase("category")}
            >
              Back
            </button>
          </div>
        </section>
      )}

      {activePhase === "account" && (
        <section className="account-screen">
          <div className="results-hero">
            <p className="eyebrow">
              {auth.status === "signed-in" ? "Your account" : "Optional"}
            </p>
            <h1 ref={focusHeadingRef} tabIndex={-1}>
              {auth.status === "signed-in" ? "Account" : "Sign in"}
            </h1>
            <p className="account-lede">
              You never need an account to play. Signing in only puts your
              scores on the leaderboard under a name of your choosing.
            </p>
          </div>

          {auth.recovering ? (
            <NewPasswordForm onDone={auth.endRecovery} />
          ) : auth.status === "signed-in" ? (
            <div className="account-detail">
              <dl className="account-facts">
                <div>
                  <dt>Signed in as</dt>
                  <dd>{auth.user?.email ?? "unknown"}</dd>
                </div>
                <div>
                  <dt>Leaderboard name</dt>
                  <dd>{player?.displayName ?? "Not chosen yet"}</dd>
                </div>
                <div>
                  <dt>Email confirmed</dt>
                  <dd>{auth.user?.emailConfirmed ? "Yes" : "Not yet"}</dd>
                </div>
              </dl>

              {!auth.canUseLeaderboard && (
                <ConfirmEmailNotice email={auth.user?.email ?? null} />
              )}

              {auth.canUseLeaderboard && !player && (
                <JoinLeaderboardForm onJoin={(name) => leaderboard.join(name)} />
              )}

              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  void signOut();
                  setPhase("category");
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <AuthPanel onSignedIn={() => setPhase("category")} />
          )}

          <div className="result-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setPhase("category")}
            >
              Back to the game
            </button>
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
