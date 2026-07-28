import { accuracyTier } from "../lib/game";
import { DAILY_MAX_SCORE, type DailyDateProgress } from "../lib/daily";
import type { DailySet } from "../lib/types";
import { readableDate } from "./Daily";
import { formatPoints } from "./questionText";

const FlameIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path
      d="M12 3c.4 2.6-1 3.9-2.4 5.2C8 9.7 6.6 11 6.6 13.6a5.4 5.4 0 0 0 10.8 0c0-2-.8-3.4-1.8-4.6-.4 1-1.1 1.6-2 1.9.5-2.9-.6-6-1.6-7.9Z"
      strokeLinejoin="round"
    />
  </svg>
);

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
  onPlay: () => void;
  onReplay: () => void;
  onOpenBoard: () => void;
  onShare: () => void;
  shareStatus: string;
};

export function DailyHero({
  set,
  streak,
  today,
  rank,
  boardEnabled,
  onPlay,
  onReplay,
  onOpenBoard,
  onShare,
  shareStatus,
}: DailyHeroProps) {
  const score = today?.officialScore ?? null;
  const played = score !== null;

  return (
    <section
      className={`daily-hero${played ? " is-played" : ""}`}
      aria-labelledby="daily-hero-heading"
    >
      <div className="daily-hero-head">
        <span className="daily-hero-flag">
          <span className="daily-hero-dot" aria-hidden="true" />
          Today's Daily
        </span>
        <time className="daily-hero-date" dateTime={set.date}>
          {readableDate(set.date)}
        </time>
      </div>

      {played ? (
        <>
          <h2 id="daily-hero-heading" className="daily-hero-heading">
            Today's score
          </h2>

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

          <div className="daily-hero-facts">
            <span className={`daily-hero-streak${streak > 0 ? " is-lit" : ""}`}>
              <FlameIcon />
              {streakLabel(streak)}
            </span>
            {rank !== null && (
              <span className="daily-hero-rank">Daily rank #{rank}</span>
            )}
          </div>

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
        <>
          <h2 id="daily-hero-heading" className="daily-hero-heading">
            {readableDate(set.date)}
          </h2>

          <p className="daily-hero-lede">
            {set.questions.length} questions · ~2 min · {subjectCount(set)}{" "}
            subjects
          </p>

          <span className={`daily-hero-streak${streak > 0 ? " is-lit" : ""}`}>
            <FlameIcon />
            {streakLabel(streak)}
          </span>

          <button className="primary-button" type="button" onClick={onPlay}>
            Play today's Daily
          </button>
        </>
      )}
    </section>
  );
}
