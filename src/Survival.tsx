import type { ReactNode } from "react";
import { formatQuestionValue } from "../lib/game";
import { questionsUntilTighten, type SurvivalVerdict } from "../lib/formats";
import type { Question } from "../lib/types";
import { EstimatePanel } from "./EstimatePanel";
import { formatPoints, subtypeLabel, verdictDetail } from "./questionText";

/**
 * How close the window is, in words. The posts on the rail are the real
 * display; this only says when they next move, because a percentage of rail
 * space is not a thing anyone can picture.
 */
function windowNote(questionNumber: number): string {
  const untilTighten = questionsUntilTighten(questionNumber);
  if (untilTighten === null) return "as tight as it gets";
  return untilTighten === 1
    ? "tightens next question"
    : `tightens in ${untilTighten} questions`;
}

type SurvivalRoundProps = {
  question: Question;
  /** 1-based position in the run. */
  questionNumber: number;
  survived: number;
  position: number;
  onPositionChange: (position: number) => void;
  windowHalfWidth: number;
  locked: boolean;
  revealing: boolean;
  verdict: SurvivalVerdict | null;
  guess: number;
  onLock: () => void;
  onContinue: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
};

export function SurvivalRound({
  question,
  questionNumber,
  survived,
  position,
  onPositionChange,
  windowHalfWidth,
  locked,
  revealing,
  verdict,
  guess,
  onLock,
  onContinue,
  headingRef,
}: SurvivalRoundProps) {
  const died = verdict !== null && !verdict.survived;

  return (
    <section className="game-screen">
      {/* A run has no known length, so a progress bar would be a lie. */}
      <div className="survival-strip">
        <span className="survival-count">Question {questionNumber}</span>
        <span className="survival-window-note">{windowNote(questionNumber)}</span>
      </div>

      <article className="question-card">
        <span className="question-tag">{subtypeLabel(question)}</span>
        <h1 ref={headingRef} tabIndex={-1}>
          {question.prompt}
        </h1>

        <EstimatePanel
          question={question}
          position={position}
          onPositionChange={onPositionChange}
          locked={locked}
          revealing={revealing}
          tierId={verdict ? (verdict.survived ? "close" : "far") : undefined}
          sliderId="survival-slider"
          windowHalfWidth={locked ? undefined : windowHalfWidth}
        />

        {!locked ? (
          <>
            <p className="survival-rule">
              Keep the answer between the posts and you live.
            </p>
            <button className="primary-button" type="button" onClick={onLock}>
              Lock in guess
            </button>
          </>
        ) : (
          <div
            className={`reveal tier-${verdict?.survived ? "close" : "far"}`}
            aria-live="polite"
          >
            <div className="verdict">
              <h2>{verdict?.survived ? "Still alive." : "That one got you."}</h2>
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
                <span>Survived</span>
                <strong>{formatPoints(survived)}</strong>
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
            <button className="primary-button" type="button" onClick={onContinue}>
              {died ? "See how far you got" : "Next question"}
            </button>
          </div>
        )}
      </article>
    </section>
  );
}

type SurvivalOverProps = {
  survived: number;
  best: number;
  /** The question that ended it, and what was guessed. */
  question: Question | null;
  guess: number;
  onRunAgain: () => void;
  onHome: () => void;
  onShare: () => void;
  shareStatus: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  /** Sign-in prompt, join form or save status — whatever applies. */
  boardCallout?: ReactNode;
  /** Rank-ups and achievements the run just earned, if any. */
  progressRibbon?: ReactNode;
};

export function SurvivalOver({
  survived,
  best,
  question,
  guess,
  onRunAgain,
  onHome,
  onShare,
  shareStatus,
  headingRef,
  boardCallout,
  progressRibbon,
}: SurvivalOverProps) {
  const isBest = survived >= best && survived > 0;

  return (
    <section className="results-screen">
      <div className="results-hero">
        <p className="eyebrow">Survival · run over</p>
        <h1 ref={headingRef} tabIndex={-1}>
          You lasted {formatPoints(survived)}{" "}
          {survived === 1 ? "question" : "questions"}
        </h1>

        {question && (
          <p className="survival-epitaph">
            Question {survived + 1} was {question.prompt} — the answer is{" "}
            {formatQuestionValue(question, question.answer)}, you said{" "}
            {formatQuestionValue(question, guess)}.
          </p>
        )}

        <div className="result-summary">
          <p>
            {isBest
              ? "That is your longest run yet."
              : `Your best run is ${formatPoints(best)}.`}
          </p>
          <div className="result-actions">
            <button className="primary-button" type="button" onClick={onRunAgain}>
              Run it back
            </button>
            <button className="secondary-button" type="button" onClick={onHome}>
              Back to the game
            </button>
            <button className="secondary-button" type="button" onClick={onShare}>
              Share result
            </button>
          </div>
          <p className="share-status" role="status">
            {shareStatus}
          </p>
        </div>
      </div>

      {progressRibbon}
      {boardCallout}
    </section>
  );
}
