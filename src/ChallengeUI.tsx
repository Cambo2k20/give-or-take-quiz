import type { ChallengeSummary } from "../lib/social";
import type { GameMode } from "../lib/types";
import { formatPoints } from "./questionText";

export type ChallengeSubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "failed"; message: string }
  | { status: "sent"; challenge: ChallengeSummary };

function challengeName(
  challenge: ChallengeSummary,
  labels: Record<GameMode, string>,
) {
  return challenge.format === "survival"
    ? "Survival"
    : `${labels[challenge.classicMode ?? "mixed"]} Classic`;
}

function resultText(challenge: ChallengeSummary, value: number | null) {
  if (value === null) return "not played";
  return challenge.format === "survival"
    ? `${formatPoints(value)} survived`
    : `${formatPoints(value)} points`;
}

function deadline(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ChallengePlayBanner({
  challenge,
  labels,
}: {
  challenge: ChallengeSummary;
  labels: Record<GameMode, string>;
}) {
  return (
    <div className="challenge-play-banner" role="status">
      <span className="challenge-play-mark" aria-hidden="true">↔</span>
      <span>
        <strong>Challenge vs {challenge.opponent.displayName}</strong>
        <small>{challengeName(challenge, labels)} · same ordered deck</small>
      </span>
    </div>
  );
}

export function ChallengeResultCallout({
  state,
  onRetry,
  onShare,
  onBack,
  onRematch,
  shareStatus,
}: {
  state: ChallengeSubmitState;
  onRetry: () => void;
  onShare: () => void;
  onBack: () => void;
  onRematch: () => void;
  shareStatus: string;
}) {
  if (state.status === "idle" || state.status === "sending") {
    return (
      <div className="challenge-result-callout" role="status">
        <p className="eyebrow">Challenge</p>
        <h2>Checking your result…</h2>
        <p>The server is validating the deck and scoring every answer.</p>
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div className="challenge-result-callout is-error" role="alert">
        <p className="eyebrow">Not submitted</p>
        <h2>Your attempt is still on this screen.</h2>
        <p>{state.message}</p>
        <div className="result-actions">
          <button className="primary-button" type="button" onClick={onRetry}>Try again</button>
          <button className="secondary-button" type="button" onClick={onBack}>Back to Friends</button>
        </div>
      </div>
    );
  }

  const { challenge } = state;
  if (challenge.state === "pending") {
    return (
      <div className="challenge-result-callout" role="status">
        <p className="eyebrow">Challenge sent</p>
        <h2>{challenge.opponent.displayName} is up next.</h2>
        <p>
          Their invite expires {deadline(challenge.expiresAt)}. Your score stays
          hidden until they finish.
        </p>
        <div className="result-actions">
          <button className="primary-button" type="button" onClick={onShare}>Share challenge</button>
          <button className="secondary-button" type="button" onClick={onBack}>Back to Friends</button>
        </div>
        <p className="share-status">{shareStatus}</p>
      </div>
    );
  }

  const mine = challenge.myResult ?? 0;
  const theirs = challenge.opponentResult ?? 0;
  const outcome = mine > theirs ? "You won" : mine < theirs ? "You lost" : "Draw";

  return (
    <div className={`challenge-result-callout outcome-${outcome === "You won" ? "win" : outcome === "You lost" ? "loss" : "draw"}`} role="status">
      <p className="eyebrow">Challenge complete</p>
      <h2>{outcome}.</h2>
      <div className="challenge-final-scores">
        <span><strong>{resultText(challenge, challenge.myResult)}</strong><small>You</small></span>
        <span><strong>{resultText(challenge, challenge.opponentResult)}</strong><small>{challenge.opponent.displayName}</small></span>
      </div>
      <div className="result-actions">
        <button className="primary-button" type="button" onClick={onRematch}>Rematch</button>
        <button className="secondary-button" type="button" onClick={onBack}>Back to Friends</button>
      </div>
    </div>
  );
}
