import { type FormEvent, useState } from "react";
import { displayNameError } from "../lib/leaderboard";
import type {
  ClassicLeaderboardRow,
  DailyLeaderboardRow,
  LeaderboardRow,
  PlayerProfile,
} from "../lib/leaderboard";
import type { GameMode } from "../lib/types";

function formatPoints(points: number) {
  return new Intl.NumberFormat("en-GB").format(points);
}

function formatBoardDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function LeaderboardPanel({
  rows,
  loading,
  error,
  profile,
  modeLabels,
  onOpenPlayer,
}: {
  rows: readonly ClassicLeaderboardRow[];
  loading: boolean;
  error: string | null;
  profile: PlayerProfile | null;
  modeLabels: Record<GameMode, string>;
  onOpenPlayer: (playerId: string) => void;
}) {
  if (loading) {
    return (
      <p className="board-empty" role="status">
        Loading the board…
      </p>
    );
  }

  if (error) {
    return (
      <p className="board-empty is-error" role="status">
        {error}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="board-empty" role="status">
        No Classic scores here yet.
      </p>
    );
  }

  return (
    <div className="board-table">
      <div className="board-list-head" aria-hidden="true">
        <span>#</span>
        <span>Player</span>
        <span>Category</span>
        <span>Best</span>
        <span>Correct</span>
        <span>Accuracy</span>
        <span>Date</span>
      </div>
      <ol className="board-list">
        {rows.map((row) => {
          const isYou = row.playerId === profile?.id;
          return (
            <li
              key={`${row.playerId}-${row.category}`}
              className={[
                isYou ? "is-you" : "",
                row.rank <= 3 ? `is-podium is-rank-${row.rank}` : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="button"
              tabIndex={0}
              aria-label={`View ${row.displayName}'s profile`}
              onClick={() => onOpenPlayer(row.playerId)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onOpenPlayer(row.playerId);
              }}
            >
              <span className="board-rank">{row.rank}</span>
              <span className="board-name">
                <strong>{row.displayName}</strong>
                {isYou && <span className="board-you">You</span>}
              </span>
              <span className="board-category" data-label="Category">
                {modeLabels[row.category]}
              </span>
              <span className="board-best" data-label="Best score">
                <strong className="board-score">
                  {formatPoints(row.bestScore)}
                </strong>
              </span>
              <span className="board-detail-set">
                <span className="board-correct" data-label="Correct">
                  {row.correctAnswers}
                </span>
                <span className="board-accuracy" data-label="Accuracy">
                  {row.accuracy.toFixed(1)}%
                </span>
                <span className="board-date" data-label="Date">
                  {formatBoardDate(row.bestDate)}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function SurvivalLeaderboardPanel({
  rows,
  loading,
  error,
  profile,
  onOpenPlayer,
}: {
  rows: readonly LeaderboardRow[];
  loading: boolean;
  error: string | null;
  profile: PlayerProfile | null;
  onOpenPlayer: (playerId: string) => void;
}) {
  if (loading) {
    return (
      <p className="board-empty" role="status">
        Loading the board…
      </p>
    );
  }

  if (error) {
    return (
      <p className="board-empty is-error" role="status">
        {error}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="board-empty" role="status">
        No Survival runs yet. Start a run and you will be first.
      </p>
    );
  }

  return (
    <div className="board-table board-table-survival">
      <div className="board-list-head" aria-hidden="true">
        <span>#</span>
        <span>Player</span>
        <span>Attempts</span>
        <span>Best</span>
      </div>
      <ol className="board-list">
        {rows.map((row) => {
          const isYou = row.playerId === profile?.id;
          return (
            <li
              key={row.playerId}
              className={[
                "board-survival-row",
                isYou ? "is-you" : "",
                row.rank <= 3 ? `is-podium is-rank-${row.rank}` : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="button"
              tabIndex={0}
              aria-label={`View ${row.displayName}'s profile`}
              onClick={() => onOpenPlayer(row.playerId)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onOpenPlayer(row.playerId);
              }}
            >
              <span className="board-rank">{row.rank}</span>
              <span className="board-name">
                <strong>{row.displayName}</strong>
                {isYou && <span className="board-you">You</span>}
              </span>
              <span className="board-rounds">{row.roundsPlayed} attempts</span>
              <span className="board-best">
                <strong className="board-score">
                  {formatPoints(row.bestScore)}
                </strong>
                <span className="board-unit">in a row</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Time of day only; the board is already scoped to a single date. */
function formatFinishTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/**
 * One day's puzzle. Everyone answered the same five questions, so the score
 * needs no context — but finishing time does, because it breaks ties.
 */
export function DailyLeaderboardPanel({
  rows,
  loading,
  error,
  profile,
  onOpenPlayer,
}: {
  rows: readonly DailyLeaderboardRow[];
  loading: boolean;
  error: string | null;
  profile: PlayerProfile | null;
  onOpenPlayer: (playerId: string) => void;
}) {
  if (loading) {
    return (
      <p className="board-empty" role="status">
        Loading the board…
      </p>
    );
  }

  if (error) {
    return (
      <p className="board-empty is-error" role="status">
        {error}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="board-empty" role="status">
        Nobody has finished today's Daily yet. Play it and you will be first.
      </p>
    );
  }

  return (
    <div className="board-table board-table-survival">
      <div className="board-list-head" aria-hidden="true">
        <span>#</span>
        <span>Player</span>
        <span>Finished</span>
        <span>Score</span>
      </div>
      <ol className="board-list">
        {rows.map((row) => {
          const isYou = row.playerId === profile?.id;
          return (
            <li
              key={row.playerId}
              className={[
                "board-survival-row",
                isYou ? "is-you" : "",
                row.rank <= 3 ? `is-podium is-rank-${row.rank}` : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="button"
              tabIndex={0}
              aria-label={`View ${row.displayName}'s profile`}
              onClick={() => onOpenPlayer(row.playerId)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onOpenPlayer(row.playerId);
              }}
            >
              <span className="board-rank">{row.rank}</span>
              <span className="board-name">
                <strong>{row.displayName}</strong>
                {isYou && <span className="board-you">You</span>}
              </span>
              <span className="board-rounds">
                {formatFinishTime(row.completedAt)}
              </span>
              <span className="board-best">
                <strong className="board-score">
                  {formatPoints(row.bestScore)}
                </strong>
                <span className="board-unit">of 5,000</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Claims a display name. No email and no password: the account is anonymous
 * until the player decides otherwise, so the only thing asked for is a name.
 */
export function JoinLeaderboardForm({
  onJoin,
}: {
  onJoin: (name: string) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const invalid = displayNameError(name);
    if (invalid) {
      setError(invalid);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onJoin(name);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save that name.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="join-form" onSubmit={handleSubmit}>
      <label htmlFor="display-name">Pick a name for the leaderboard</label>
      <div className="join-row">
        <input
          id="display-name"
          className="join-input"
          type="text"
          value={name}
          maxLength={24}
          autoComplete="off"
          placeholder="e.g. Cartographer"
          onChange={(event) => setName(event.target.value)}
          disabled={busy}
        />
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save my score"}
        </button>
      </div>
      <p className="join-note">
        No email, no password. Your scores stay with this browser unless you
        link an account later.
      </p>
      {error && (
        <p className="join-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
