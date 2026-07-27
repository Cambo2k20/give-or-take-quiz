import { useMemo, useState } from "react";
import type {
  ClassicLeaderboardRow,
  LeaderboardRow,
  PlayerProfile,
} from "../lib/leaderboard";
import { rowAbove } from "../lib/leaderboard";
import type { GameMode } from "../lib/types";
import {
  LeaderboardPanel,
  SurvivalLeaderboardPanel,
} from "./Leaderboard";
import { formatPoints } from "./questionText";

type CategoryFilter = GameMode | "all";
export type LeaderboardFormat = "classic" | "survival";

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

function isClassicRow(row: LeaderboardRow): row is ClassicLeaderboardRow {
  const candidate = row as Partial<ClassicLeaderboardRow>;
  return (
    typeof candidate.category === "string" &&
    typeof candidate.correctAnswers === "number" &&
    typeof candidate.accuracy === "number" &&
    typeof candidate.bestDate === "string"
  );
}

type BoardScreenProps = {
  modes: ReadonlyArray<{ mode: GameMode; title: string }>;
  modeLabels: Record<GameMode, string>;
  rows: readonly LeaderboardRow[];
  loading: boolean;
  error: string | null;
  profile: PlayerProfile | null;
  format: LeaderboardFormat;
  onFormatChange: (format: LeaderboardFormat) => void;
  onPlay: (category: CategoryFilter) => void;
  onPlaySurvival: () => void;
  onReturnHome: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
};

/**
 * Classic has one useful board rather than a picker full of mostly empty
 * boards. Every row is a player's best round in one category; the select only
 * filters that already-loaded list.
 */
export function BoardScreen({
  modes,
  modeLabels,
  rows,
  loading,
  error,
  profile,
  format,
  onFormatChange,
  onPlay,
  onPlaySurvival,
  onReturnHome,
  headingRef,
}: BoardScreenProps) {
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>("all");

  const visibleRows = useMemo(() => {
    const classicRows = rows
      .filter(isClassicRow)
      .filter(
        (row) =>
          categoryFilter === "all" || row.category === categoryFilter,
      )
      .sort(
        (left, right) =>
          right.bestScore - left.bestScore ||
          new Date(left.bestDate).getTime() -
            new Date(right.bestDate).getTime() ||
          left.playerId.localeCompare(right.playerId),
      );

    return classicRows.map((row, index) => ({ ...row, rank: index + 1 }));
  }, [categoryFilter, rows]);

  const categoryLabel =
    categoryFilter === "all"
      ? "All categories"
      : modeLabels[categoryFilter];
  const survival = format === "survival";
  const standingRows: readonly LeaderboardRow[] = survival
    ? rows
    : visibleRows;
  const you = profile
    ? standingRows.find((row) => row.playerId === profile.id) ?? null
    : null;
  const above = profile ? rowAbove(standingRows, profile.id) : null;
  const below = you
    ? standingRows.find((row) => row.rank > you.rank) ?? null
    : null;

  const standingDetail = !you
    ? ""
    : !above
      ? survival
        ? "Nobody has gone further."
        : "Nobody has scored higher."
      : survival
        ? `${formatPoints(above.bestScore - you.bestScore)} more to catch ${ordinal(above.rank)}`
        : `${formatPoints(above.bestScore - you.bestScore)} off ${ordinal(above.rank)} place`;
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
          <p className="board-blurb">
            {survival
              ? "Longest run, all nine subjects in the draw."
              : "Highest Classic scores across every category."}
          </p>
        </div>

        <div
          className="board-formats"
          role="group"
          aria-label="Leaderboard format"
        >
          <button
            type="button"
            className={`board-format${survival ? "" : " is-current"}`}
            aria-pressed={!survival}
            onClick={() => onFormatChange("classic")}
          >
            Classic
          </button>
          <button
            type="button"
            className={`board-format${survival ? " is-current" : ""}`}
            aria-pressed={survival}
            onClick={() => onFormatChange("survival")}
          >
            Survival
          </button>
        </div>
      </div>

      <div className="board-scope">
        {survival ? (
          <span className="board-scope-static">All subjects</span>
        ) : (
          <label className="board-category-filter">
            <span>Category</span>
            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value as CategoryFilter)
              }
            >
              <option value="all">All categories</option>
              {modes.map((detail) => (
                <option key={detail.mode} value={detail.mode}>
                  {detail.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

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
              <span>
                {you.roundsPlayed} {survival ? "attempts" : "rounds"}
              </span>
              <span>{survival ? "All subjects" : categoryLabel}</span>
            </div>
          </div>
          <div className="board-standing-rank">
            <strong>{ordinal(you.rank)}</strong>
          </div>
        </div>
      )}

      {survival ? (
        <SurvivalLeaderboardPanel
          rows={rows}
          loading={loading}
          error={error}
          profile={profile}
        />
      ) : (
        <LeaderboardPanel
          rows={visibleRows}
          loading={loading}
          error={error}
          profile={profile}
          modeLabels={modeLabels}
        />
      )}

      <p className="board-footnote">
        {survival
          ? "Runs are ranked by questions survived, not points."
          : "Each row is one player's best Classic round in that category. Correct counts near-perfect answers worth at least 980 points."}
      </p>

      <div className="result-actions board-result-actions">
        <button
          className="secondary-button board-action-button"
          type="button"
          onClick={onReturnHome}
        >
          <span>Return to Home</span>
        </button>
        <button
          className="primary-button board-action-button"
          type="button"
          onClick={() =>
            survival ? onPlaySurvival() : onPlay(categoryFilter)
          }
        >
          <span>
            {survival
              ? "Start a run"
              : categoryFilter === "all"
                ? "Choose a category"
                : `Play ${modeLabels[categoryFilter]}`}
          </span>
        </button>
      </div>
    </section>
  );
}
