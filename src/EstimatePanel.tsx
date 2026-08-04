import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import {
  formatQuestionValue,
  positionToValue,
  valueToPosition,
} from "../lib/game";
import type { Question } from "../lib/types";
import { unitSuffix } from "./questionText";

/**
 * Where a keyboard step lands, or null for a key the slider does not handle.
 * Linear scales step in the question's own units so a timeline moves a year at
 * a time; logarithmic ones step by a fixed fraction of the rail instead.
 */
function positionForKey(
  question: Question,
  position: number,
  key: string,
): number | null {
  const span = question.max - question.min;
  const fine = question.scale === "linear" ? Math.max(1 / span, 0.0001) : 0.005;
  const large = question.scale === "linear" ? Math.max(10 / span, 0.02) : 0.05;

  if (key === "ArrowLeft" || key === "ArrowDown") return position - fine;
  if (key === "ArrowRight" || key === "ArrowUp") return position + fine;
  if (key === "PageDown") return position - large;
  if (key === "PageUp") return position + large;
  if (key === "Home") return 0;
  if (key === "End") return 1;
  return null;
}

type EstimatePanelProps = {
  question: Question;
  position: number;
  onPositionChange: (position: number) => void;
  locked: boolean;
  /** First reveal frame, holding the marker on the guess before it travels. */
  revealing: boolean;
  tierId?: string;
  /** Unique per rendered panel, so the value stays labelled by its own slider. */
  sliderId: string;
  /**
   * Survival's window, as a half-width in rail space. Draws goalposts either
   * side of the thumb: the answer has to land between them.
   *
   * Deliberately posts rather than a filled band — a band sits behind the
   * thumb, which covers most of it and hides the very tightening that is
   * supposed to create the tension. Omit for every other mode.
   */
  windowHalfWidth?: number;
  /**
   * Rendered inside `.slider-wrap`, behind the rail. Used by the home warm-up
   * to stand the mascot behind the track; panels without one are unchanged.
   */
  sliderOverlay?: ReactNode;
};

/**
 * The estimate readout and slider, shared by the game and the home-page demo so
 * both move, animate and read out identically.
 */
export function EstimatePanel({
  question,
  position,
  onPositionChange,
  locked,
  revealing,
  tierId,
  sliderId,
  windowHalfWidth,
  sliderOverlay,
}: EstimatePanelProps) {
  const guess = positionToValue(question, position);
  const answerPosition = valueToPosition(question, question.answer);
  const bandLeft = Math.min(position, answerPosition);
  const bandWidth = Math.abs(answerPosition - position);
  // Clamped to the rail so a post never floats off the end of the track.
  const postLeft =
    windowHalfWidth === undefined
      ? 0
      : Math.max(0, position - windowHalfWidth);
  const postRight =
    windowHalfWidth === undefined
      ? 0
      : Math.min(1, position + windowHalfWidth);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (locked) return;
    const next = positionForKey(question, position, event.key);
    if (next === null) return;
    event.preventDefault();
    onPositionChange(Math.min(1, Math.max(0, next)));
  }

  return (
    <div
      className={`estimate-panel${sliderOverlay ? " has-mascot" : ""}${revealing ? " is-revealing" : ""}${tierId ? ` tier-${tierId}` : ""}`}
      style={
        {
          "--guess-position": `${position * 100}%`,
          "--answer-position": `${answerPosition * 100}%`,
          "--band-left": `${bandLeft * 100}%`,
          "--band-width": `${bandWidth * 100}%`,
          "--post-left": `${postLeft * 100}%`,
          "--post-right": `${postRight * 100}%`,
          "--post-span": `${(postRight - postLeft) * 100}%`,
        } as CSSProperties
      }
    >
      <output className="estimate-value" htmlFor={sliderId}>
        {formatQuestionValue(question, guess)}
      </output>
      <span className="estimate-label">
        {locked ? "Your locked guess" : "Your estimate"}
      </span>

      <div className="slider-wrap">
        {sliderOverlay}
        <span className="slider-rail" aria-hidden="true">
          <span className="slider-fill" />
        </span>
        {windowHalfWidth !== undefined && (
          <span className="survival-window" aria-hidden="true">
            <span className="survival-post is-left" />
            <span className="survival-post is-right" />
          </span>
        )}
        {locked && <span className="miss-band" aria-hidden="true" />}
        {locked && <span className="answer-dot" aria-hidden="true" />}
        <input
          id={sliderId}
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
            onPositionChange(Number.parseFloat(event.target.value))
          }
          onKeyDown={handleKeyDown}
        />
        <div className="range-labels" aria-hidden="true">
          <span>{formatQuestionValue(question, question.min)}</span>
          <span>{formatQuestionValue(question, question.max)}</span>
        </div>
      </div>
      {!locked && (
        <p className="keyboard-help">
          Drag, tap, or use arrow keys. Page Up/Down moves faster; Home/End jumps
          to the limits.
        </p>
      )}
    </div>
  );
}
