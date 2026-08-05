import type { CSSProperties } from "react";
import { accuracyTier } from "../lib/game";
import { DAILY_MAX_SCORE, type DailyDateProgress } from "../lib/daily";
import type { DailySet } from "../lib/types";
import dailyQuizIcon from "./assets/home/daily-quiz.png";
import dailyStreakIcon from "./assets/home/daily-streak.png";
import sunriseDecoration from "./assets/home/sunrise.png";
import { readableDate } from "./Daily";
import { formatPoints } from "./questionText";

const ArchiveIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 7.5v5l3 2" />
    <path d="M3.6 12a8.4 8.4 0 1 0 2.2-5.7" />
    <path d="M3.4 4.2v3.6H7" />
  </svg>
);

function iconMask(url: string) {
  return { "--home-icon-url": `url("${url}")` } as CSSProperties;
}

/** Distinct subjects in the set, in the order they are asked. */
function subjectCount(set: DailySet) {
  return new Set(set.questions.map((question) => question.category)).size;
}

function streakLabel(streak: number) {
  if (streak <= 0) return "No streak yet";
  return `${streak}-day streak`;
}

type DailyHeroProps = {
  set: DailySet;
  streak: number;
  today: DailyDateProgress | undefined;
  rank: number | null;
  /** Without a configured leaderboard there is no board to send anyone to. */
  boardEnabled: boolean;
  archiveCount?: number;
  onPlay: () => void;
  onReplay: () => void;
  onOpenBoard: () => void;
  onOpenArchive?: () => void;
  onShare: () => void;
  shareStatus: string;
};

export function DailyHero({
  set,
  streak,
  today,
  rank,
  boardEnabled,
  archiveCount = 0,
  onPlay,
  onReplay,
  onOpenBoard,
  onOpenArchive = () => {},
  onShare,
  shareStatus,
}: DailyHeroProps) {
  const score = today?.officialScore ?? null;
  const played = score !== null;

  return (
    <section
      className={`daily-hero home-daily-hero${played ? " is-played" : ""}`}
      aria-labelledby="daily-hero-heading"
    >
      <span
        className="home-daily-sunrise"
        style={iconMask(sunriseDecoration)}
        aria-hidden="true"
      />

      <div className="daily-hero-head">
        <span className={`daily-hero-streak${streak > 0 ? " is-lit" : ""}`}>
          <span
            className="home-daily-streak-icon"
            style={iconMask(dailyStreakIcon)}
            aria-hidden="true"
          />
          {streakLabel(streak)}
        </span>

        {archiveCount > 0 && (
          <button
            className="home-daily-archive"
            type="button"
            onClick={onOpenArchive}
            aria-label="Past dailies"
          >
            <ArchiveIcon />
            <span>Daily Archives</span>
          </button>
        )}
      </div>

      <div className="home-daily-intro">
        <span className="home-daily-icon-plate" aria-hidden="true">
          <span
            className="home-daily-quiz-icon"
            style={iconMask(dailyQuizIcon)}
          />
        </span>
        <time className="daily-hero-date" dateTime={set.date}>
          {readableDate(set.date)}
        </time>
        <h2 id="daily-hero-heading" className="daily-hero-heading">
          {played ? "Today's score" : "Today's Daily Quiz"}
        </h2>
        {!played && (
          <p className="daily-hero-lede">
            {set.questions.length} questions · ~2 min · {subjectCount(set)}{" "}
            subjects
          </p>
        )}
      </div>

      {played ? (
        <>
          <div className="daily-hero-score">
            <strong>{formatPoints(score)}</strong>
            <span>/ {formatPoints(DAILY_MAX_SCORE)}</span>
          </div>

          {today?.officialPoints && today.officialPoints.length > 0 && (
            <ol className="daily-hero-blocks" aria-label="Question by question">
              {today.officialPoints.map((points, index) => {
                const tier = accuracyTier(points);
                return (
                  <li
                    key={set.questions[index]?.id ?? index}
                    className={`daily-hero-block tier-${tier.id}`}
                  >
                    <span className="daily-hero-block-index">{index + 1}</span>
                    <strong>{formatPoints(points)}</strong>
                  </li>
                );
              })}
            </ol>
          )}

          {rank !== null && (
            <div className="daily-hero-facts">
              <span className="daily-hero-rank">Daily rank #{rank}</span>
            </div>
          )}

          <div
            className={`daily-hero-actions${boardEnabled ? "" : " is-single"}`}
          >
            {boardEnabled && (
              <button
                className="primary-button"
                type="button"
                onClick={onOpenBoard}
              >
                Today's board
              </button>
            )}
            <button
              className={boardEnabled ? "secondary-button" : "primary-button"}
              type="button"
              onClick={onShare}
            >
              Share result
            </button>
          </div>

          <button
            className="daily-hero-replay"
            type="button"
            onClick={onReplay}
          >
            Replay for practice
          </button>

          <p className="share-status" role="status">
            {shareStatus}
          </p>
        </>
      ) : (
        <button className="primary-button" type="button" onClick={onPlay}>
          Play today's Daily
        </button>
      )}
    </section>
  );
}
