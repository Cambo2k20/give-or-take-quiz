import { useMemo, useState } from "react";
import type {
  ClassicLeaderboardRow,
  DailyLeaderboardRow,
  LeaderboardRow,
  PlayerProfile,
} from "../lib/leaderboard";
import { rowAbove } from "../lib/leaderboard";
import type { GameMode } from "../lib/types";
import {
  DailyLeaderboardPanel,
  LeaderboardPanel,
  SurvivalLeaderboardPanel,
} from "./Leaderboard";
import { formatPoints } from "./questionText";

type CategoryFilter = GameMode | "all";
export type LeaderboardFormat = "classic" | "daily" | "survival";

const FORMAT_ORDER: readonly LeaderboardFormat[] = [
  "classic",
  "daily",
  "survival",
];

/**
 * The words each board needs. Three formats measure three different things —
 * points in a category, points on one shared puzzle, questions survived — and
 * spelling that out here keeps it out of the markup.
 */
const COPY: Record<
  LeaderboardFormat,
  {
    label: string;
    blurb: string;
    unit: string;
    attemptNoun: string;
    nobodyAbove: string;
    footnote: string;
  }
> = {
  classic: {
    label: "Classic",
    blurb: "Highest Classic scores across every category.",
    unit: "points",
    attemptNoun: "rounds",
    nobodyAbove: "Nobody has scored higher.",
    footnote:
      "Each row is one player's best Classic round in that category. Correct counts near-perfect answers worth at least 980 points.",
  },
  daily: {
    label: "Daily",
    blurb: "Everyone answered the same five questions.",
    unit: "points",
    attemptNoun: "attempts",
    nobodyAbove: "Nobody has scored higher today.",
    footnote:
      "Your first attempt on the day is the one that counts. Replays and archive runs are practice: they never reach this board.",
  },
  survival: {
    label: "Survival",
    blurb: "Longest run, all nine subjects in the draw.",
    unit: "in a row",
    attemptNoun: "attempts",
    nobodyAbove: "Nobody has gone further.",
    footnote: "Runs are ranked by questions survived, not points.",
  },
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

function isClassicRow(row: LeaderboardRow): row is ClassicLeaderboardRow {
  const candidate = row as Partial<ClassicLeaderboardRow>;
  return (
    typeof candidate.category === "string" &&
    typeof candidate.correctAnswers === "number" &&
    typeof candidate.accuracy === "number" &&
    typeof candidate.bestDate === "string"
  );
}

function isDailyRow(row: LeaderboardRow): row is DailyLeaderboardRow {
  const candidate = row as Partial<DailyLeaderboardRow>;
  return (
    typeof candidate.puzzleDate === "string" &&
    typeof candidate.completedAt === "string"
  );
}

function readableDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));
}

type BoardScreenProps = {
  modes: ReadonlyArray<{ mode: GameMode; title: string }>;
  modeLabels: Record<GameMode, string>;
  rows: readonly LeaderboardRow[];
  loading: boolean;
  error: string | null;
  profile: PlayerProfile | null;
  format: LeaderboardFormat;
  /** Which day the Daily board is showing, as ISO `YYYY-MM-DD`. */
  dailyDate: string;
  onFormatChange: (format: LeaderboardFormat) => void;
  onPlay: (category: CategoryFilter) => void;
  onPlayDaily: () => void;
  onPlaySurvival: () => void;
  onReturnHome: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
};

/**
 * Classic has one useful board rather than a picker full of mostly empty
 * boards. Every row is a player's best round in one category; the select only
 * filters that already-loaded list. Daily and Survival each rank one number.
 */
export function BoardScreen({
  modes,
  modeLabels,
  rows,
  loading,
  error,
  profile,
  format,
  dailyDate,
  onFormatChange,
  onPlay,
  onPlayDaily,
  onPlaySurvival,
  onReturnHome,
  headingRef,
}: BoardScreenProps) {
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>("all");

  const classic = format === "classic";
  const daily = format === "daily";
  const copy = COPY[format];

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
  const standingRows: readonly LeaderboardRow[] = classic ? visibleRows : rows;
  const you = profile
    ? standingRows.find((row) => row.playerId === profile.id) ?? null
    : null;
  const above = profile ? rowAbove(standingRows, profile.id) : null;
  const below = you
    ? standingRows.find((row) => row.rank > you.rank) ?? null
    : null;

  const gapTo = (other: LeaderboardRow) =>
    formatPoints(Math.abs(other.bestScore - you!.bestScore));

  const standingDetail = !you
    ? ""
    : !above
      ? copy.nobodyAbove
      : format === "survival"
        ? `${gapTo(above)} more to catch ${ordinal(above.rank)}`
        : `${gapTo(above)} off ${ordinal(above.rank)} place`;

  const standingDelta =
    you && below
      ? format === "survival"
        ? `${gapTo(below)} ahead`
        : `${gapTo(below)} point lead`
      : above && you
        ? format === "survival"
          ? `${gapTo(above)} to move up`
          : `${gapTo(above)} points to move up`
        : null;

  return (
    <section className="board-screen">
      <div className="board-titlebar">
        <div>
          <h1 ref={headingRef} tabIndex={-1}>
            Leaderboard
          </h1>
          <p className="board-blurb">{copy.blurb}</p>
        </div>

        <div
          className="board-formats"
          role="group"
          aria-label="Leaderboard format"
        >
          {FORMAT_ORDER.map((option) => (
            <button
              key={option}
              type="button"
              className={`board-format${option === format ? " is-current" : ""}`}
              aria-pressed={option === format}
              onClick={() => onFormatChange(option)}
            >
              {COPY[option].label}
            </button>
          ))}
        </div>
      </div>

      <div className="board-scope">
        {classic ? (
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
        ) : (
          <span className="board-scope-static">
            {daily ? readableDate(dailyDate) : "All subjects"}
          </span>
        )}
      </div>

      {you && (
        <div className="board-standing">
          <span className="board-standing-sheen" aria-hidden="true" />
          <div className="board-standing-score">
            <span className="board-standing-label">Your standing</span>
            <p className="board-standing-number">
              <strong>{formatPoints(you.bestScore)}</strong>
              <span>{copy.unit}</span>
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
                {you.roundsPlayed} {copy.attemptNoun}
              </span>
              <span>
                {classic
                  ? categoryLabel
                  : daily
                    ? readableDate(dailyDate)
                    : "All subjects"}
              </span>
            </div>
          </div>
          <div className="board-standing-rank">
            <strong>{ordinal(you.rank)}</strong>
          </div>
        </div>
      )}

      {classic ? (
        <LeaderboardPanel
          rows={visibleRows}
          loading={loading}
          error={error}
          profile={profile}
          modeLabels={modeLabels}
        />
      ) : daily ? (
        <DailyLeaderboardPanel
          rows={rows.filter(isDailyRow)}
          loading={loading}
          error={error}
          profile={profile}
        />
      ) : (
        <SurvivalLeaderboardPanel
          rows={rows}
          loading={loading}
          error={error}
          profile={profile}
        />
      )}

      <p className="board-footnote">{copy.footnote}</p>

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
            daily
              ? onPlayDaily()
              : format === "survival"
                ? onPlaySurvival()
                : onPlay(categoryFilter)
          }
        >
          <span>
            {daily
              ? "Play today's Daily"
              : format === "survival"
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
