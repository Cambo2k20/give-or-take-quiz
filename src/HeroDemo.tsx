import { useEffect, useState } from "react";
import {
  accuracyTier,
  formatQuestionValue,
  pickDemoQuestion,
  positionToValue,
  scoreGuess,
} from "../lib/game";
import { EstimatePanel } from "./EstimatePanel";
import {
  formatPoints,
  subtypeLabel,
  useCountUp,
  verdictDetail,
} from "./questionText";

/**
 * A single playable question in the hero, so the slider — the whole game — is
 * something you can try before choosing a category. Nothing here is banked: no
 * best score, no leaderboard, no question history.
 */
export function HeroDemo({ onPlay }: { onPlay: () => void }) {
  const [question, setQuestion] = useState(pickDemoQuestion);
  const [position, setPosition] = useState(0.5);
  const [locked, setLocked] = useState(false);
  const [revealing, setRevealing] = useState(false);

  const guess = positionToValue(question, position);
  const points = locked ? scoreGuess(question, guess) : 0;
  const tier = locked ? accuracyTier(points) : null;
  const countedPoints = useCountUp(points, locked);

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

  function checkGuess() {
    if (locked) return;
    setLocked(true);
    setRevealing(true);
  }

  function tryAnother() {
    setQuestion(pickDemoQuestion());
    setPosition(0.5);
    setLocked(false);
    setRevealing(false);
  }

  return (
    <div className="hero-demo">
      <div className="hero-demo-head">
        <span className="question-tag">{subtypeLabel(question)}</span>
        <span className="hero-demo-flag">Warm-up · not scored</span>
      </div>

      <h2 className="hero-demo-prompt">{question.prompt}</h2>

      <EstimatePanel
        question={question}
        position={position}
        onPositionChange={setPosition}
        locked={locked}
        revealing={revealing}
        tierId={tier?.id}
        sliderId="hero-demo-slider"
      />

      {!locked ? (
        <button className="primary-button" type="button" onClick={checkGuess}>
          Check my guess
        </button>
      ) : (
        <div className={`reveal tier-${tier?.id ?? "far"}`} aria-live="polite">
          <div className="verdict">
            <h3>{tier?.headline}</h3>
            <p>{verdictDetail(question, guess)}</p>
          </div>
          <div className="stat-tiles">
            <div className="stat-tile">
              <span>Answer</span>
              <strong>{formatQuestionValue(question, question.answer)}</strong>
            </div>
            <div className="stat-tile">
              <span>Your guess</span>
              <strong>{formatQuestionValue(question, guess)}</strong>
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
          <div className="hero-demo-actions">
            <button className="primary-button" type="button" onClick={onPlay}>
              Play a full round
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={tryAnother}
            >
              Try another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
