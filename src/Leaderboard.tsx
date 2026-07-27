import { type FormEvent, useState } from "react";
import { displayNameError } from "../lib/leaderboard";
import type { LeaderboardRow, PlayerProfile } from "../lib/leaderboard";

function formatPoints(points: number) {
  return new Intl.NumberFormat("en-GB").format(points);
}

export function LeaderboardPanel({
  rows,
  loading,
  error,
  profile,
  unit = "points",
  openLabel,
}: {
  rows: readonly LeaderboardRow[];
  loading: boolean;
  error: string | null;
  profile: PlayerProfile | null;
  /** What the number means: points on a classic board, questions on survival. */
  unit?: string;
  /** Optional open place below the live rows. */
  openLabel?: string;
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
        No scores yet. Play a round and you will be first.
      </p>
    );
  }

  return (
    <div className="board-table">
      <div className="board-list-head" aria-hidden="true">
        <span>#</span>
        <span>Player</span>
        <span>Form</span>
        <span>Rounds</span>
        <span>Best</span>
      </div>
      <ol className="board-list">
        {rows.map((row) => {
          const isYou = row.playerId === profile?.id;
          return (
            <li
              key={row.playerId}
              className={[
                isYou ? "is-you" : "",
                row.rank <= 3 ? `is-podium is-rank-${row.rank}` : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="board-rank">{row.rank}</span>
              <span className="board-name">
                <strong>{row.displayName}</strong>
                {isYou && <span className="board-you">You</span>}
              </span>
              <span
                className="board-form-slot"
                aria-label="Recent form will appear here"
              >
                <span aria-hidden="true">—</span>
              </span>
              <span className="board-rounds">{row.roundsPlayed}</span>
              <span className="board-best">
                <strong className="board-score">
                  {formatPoints(row.bestScore)}
                </strong>
                <span className="board-unit">{unit}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {openLabel && (
        <div className="board-open-row">
          <span className="board-rank">{rows.length + 1}</span>
          <span>{openLabel}</span>
          <span aria-hidden="true">—</span>
        </div>
      )}
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
