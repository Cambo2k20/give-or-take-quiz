import { useState } from "react";
import type { BoardScope, LeaderboardRow, PlayerProfile } from "../lib/leaderboard";
import { rowAbove } from "../lib/leaderboard";
import { DAILY_QUESTIONS_PER_SET } from "../lib/daily";
import type { GameMode } from "../lib/types";
import { LeaderboardPanel } from "./Leaderboard";
import { readableDate } from "./Daily";
import { formatPoints } from "./questionText";

/** Where the player stands on each board, for the picker. */
export type Standings = {
  categories: Partial<Record<GameMode, number>>;
  daily: number | null;
  survival: number | null;
};

function ordinal(rank: number): string {
  const tens = rank % 100;
  if (tens >= 11 && tens <= 13) return `${rank}th`;
  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}

function scopeIsSurvival(scope: BoardScope) {
  return scope.kind === "survival";
}

type BoardScreenProps = {
  scope: BoardScope;
  onScopeChange: (scope: BoardScope) => void;
  modes: ReadonlyArray<{ mode: GameMode; title: string }>;
  modeLabels: Record<GameMode, string>;
  rows: readonly LeaderboardRow[];
  loading: boolean;
  error: string | null;
  profile: PlayerProfile | null;
  standings: Standings | null;
  todaysDailyDate: string | null;
  onPlay: () => void;
  onBack: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
};

/**
 * One board at a time, chosen along two axes: format first (how you played),
 * then scope within it (which subject, or which day). Keeping them separate is
 * what stops the old flat row of ten tabs from becoming a row of thirteen.
 */
export function BoardScreen({
  scope,
  onScopeChange,
  modes,
  modeLabels,
  rows,
  loading,
  error,
  profile,
  standings,
  todaysDailyDate,
  onPlay,
  onBack,
  headingRef,
}: BoardScreenProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const survival = scopeIsSurvival(scope);

  const scopeLabel =
    scope.kind === "survival"
      ? "All subjects"
      : scope.kind === "daily"
        ? `Daily · ${readableDate(scope.date)}`
        : modeLabels[scope.mode];

  const blurb = survival
    ? "Longest run, all nine subjects in the draw."
    : scope.kind === "daily"
      ? `Best score per player, ${DAILY_QUESTIONS_PER_SET} questions.`
      : "Best score per player, ten questions.";

  const footer = survival
    ? "Runs are ranked by questions survived, not points — a different number, so it gets a different board."
    : scope.kind === "daily"
      ? "Everyone plays the same five questions until midnight."
      : scope.kind === "category" && scope.mode === "mixed"
        ? "Ten questions, one drawn from each subject."
        : "Ten questions drawn from this subject.";

  const you = profile
    ? rows.find((row) => row.playerId === profile.id) ?? null
    : null;
  const above = profile ? rowAbove(rows, profile.id) : null;
  const below = you
    ? rows.find((row) => row.rank > you.rank) ?? null
    : null;

  function gapLine(): string {
    if (!you) return "";
    if (!above) return survival ? "Nobody has gone further." : "Nobody has scored higher.";
    const gap = above.bestScore - you.bestScore;
    if (survival) {
      return gap === 1
        ? `one more to catch ${ordinal(above.rank)}`
        : `${formatPoints(gap)} more to catch ${ordinal(above.rank)}`;
    }
    return `${formatPoints(gap)} off ${ordinal(above.rank)} place`;
  }

  const standingDetail = gapLine();
  const standingDelta =
    you && below
      ? survival
        ? `${formatPoints(you.bestScore - below.bestScore)} ahead`
        : `${formatPoints(you.bestScore - below.bestScore)} point lead`
      : above && you
        ? survival
          ? `${formatPoints(above.bestScore - you.bestScore)} to move up`
          : `${formatPoints(above.bestScore - you.bestScore)} points to move up`
        : null;

  return (
    <section className="board-screen">
      <div className="board-titlebar">
        <div>
          <h1 ref={headingRef} tabIndex={-1}>
            Leaderboard
          </h1>
          <p className="board-blurb">{blurb}</p>
        </div>

        {/* Format is the primary axis: how you played, not what about. */}
        <div className="board-formats" role="group" aria-label="Choose a format">
          <button
            type="button"
            className={`board-format${survival ? "" : " is-current"}`}
            aria-pressed={!survival}
            onClick={() =>
              onScopeChange(
                todaysDailyDate
                  ? { kind: "daily", date: todaysDailyDate }
                  : { kind: "category", mode: "mixed" },
              )
            }
          >
            Classic
          </button>
          <button
            type="button"
            className={`board-format${survival ? " is-current" : ""}`}
            aria-pressed={survival}
            onClick={() => onScopeChange({ kind: "survival" })}
          >
            Survival
          </button>
        </div>
      </div>

      <div className="board-scope">
        {survival ? (
          // One survival board today. A subject picker appears here the day
          // runs carry a subject, rather than a control that toggles nothing.
          <span className="board-scope-static">All subjects</span>
        ) : (
          <button
            type="button"
            className="board-scope-button"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((open) => !open)}
          >
            {scopeLabel}
            <span aria-hidden="true">⌄</span>
          </button>
        )}
        {!survival && todaysDailyDate && (
          <button
            type="button"
            className="board-scope-chip"
            onClick={() => {
              setPickerOpen(false);
              onScopeChange({ kind: "daily", date: todaysDailyDate });
            }}
          >
            Today
          </button>
        )}
      </div>

      {pickerOpen && !survival && (
        <div className="board-picker">
          <div className="board-picker-head">
            <strong>Which board?</strong>
            <span>{scopeLabel}</span>
          </div>
          <ul className="board-picker-list">
            {todaysDailyDate && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen(false);
                    onScopeChange({ kind: "daily", date: todaysDailyDate });
                  }}
                >
                  <span>Daily</span>
                  <span className="board-picker-rank">
                    {standings?.daily ? ordinal(standings.daily) : "—"}
                  </span>
                </button>
              </li>
            )}
            {modes.map((detail) => (
              <li key={detail.mode}>
                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen(false);
                    onScopeChange({ kind: "category", mode: detail.mode });
                  }}
                >
                  <span>{detail.title}</span>
                  <span className="board-picker-rank">
                    {standings?.categories[detail.mode]
                      ? ordinal(standings.categories[detail.mode] as number)
                      : "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {you && (
        <div className="board-standing">
          <span className="board-standing-sheen" aria-hidden="true" />
          <div className="board-standing-score">
            <span className="board-standing-label">Your standing</span>
            <p className="board-standing-number">
              <strong>{formatPoints(you.bestScore)}</strong>
              <span>{survival ? "in a row" : "points"}</span>
            </p>
            <p className="board-standing-copy">{standingDetail}</p>
          </div>
          <div className="board-standing-progress">
            {standingDelta && (
              <>
                <div className="board-standing-progress-label">
                  <span>{above ? "Next place" : "Lead over next place"}</span>
                  <strong>{standingDelta}</strong>
                </div>
                <div className="board-standing-bar" aria-hidden="true">
                  <span />
                </div>
              </>
            )}
            <div className="board-standing-chips">
              <span>{you.roundsPlayed} rounds</span>
              <span>{scopeLabel}</span>
            </div>
          </div>
          <div className="board-standing-rank">
            <strong>{ordinal(you.rank)}</strong>
          </div>
        </div>
      )}

      <LeaderboardPanel
        rows={rows}
        loading={loading}
        error={error}
        profile={profile}
        unit={survival ? "in a row" : "points"}
        openLabel={
          scope.kind === "daily"
            ? "Open until midnight"
            : "The next place is open"
        }
      />

      <p className="board-footnote">{footer}</p>

      <div className="result-actions">
        <button className="primary-button" type="button" onClick={onPlay}>
          {survival
            ? "Start a run"
            : scope.kind === "daily"
              ? "Play this daily"
              : `Play ${modeLabels[scope.mode]}`}
        </button>
        <button className="secondary-button" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
