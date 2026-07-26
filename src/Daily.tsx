import {
  DAILY_MAX_SCORE,
  DAILY_QUESTIONS_PER_SET,
  type DailyProgress,
} from "../lib/daily";
import type { DailySet } from "../lib/types";
import { formatPoints } from "./questionText";

const FlameIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path
      d="M12 3c.4 2.6-1 3.9-2.4 5.2C8 9.7 6.6 11 6.6 13.6a5.4 5.4 0 0 0 10.8 0c0-2-.8-3.4-1.8-4.6-.4 1-1.1 1.6-2 1.9.5-2.9-.6-6-1.6-7.9Z"
      strokeLinejoin="round"
    />
  </svg>
);

/** Midday keeps the label on the intended day whatever the local offset does. */
export function readableDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));
}

function StreakBadge({ streak }: { streak: number }) {
  return (
    <span className={`streak-badge${streak > 0 ? " is-lit" : ""}`}>
      <FlameIcon />
      {streak > 0 ? (
        <>
          <strong>{streak}</strong> day{streak === 1 ? "" : "s"}
        </>
      ) : (
        "No streak yet"
      )}
    </span>
  );
}

type DailyCardProps = {
  set: DailySet;
  streak: number;
  playedToday: boolean;
  score: number | null;
  archiveCount: number;
  onPlay: () => void;
  onOpenArchive: () => void;
};

/**
 * The home-page daily. Everyone gets the same ten questions on a given day,
 * which is what makes the score worth comparing.
 */
export function DailyCard({
  set,
  streak,
  playedToday,
  score,
  archiveCount,
  onPlay,
  onOpenArchive,
}: DailyCardProps) {
  return (
    <div className="daily-card">
      <div className="daily-head">
        <div>
          <p className="daily-eyebrow">Daily challenge</p>
          <h2 className="daily-title">{readableDate(set.date)}</h2>
        </div>
        <StreakBadge streak={streak} />
      </div>

      <p className="daily-lede">
        {playedToday
          ? `You scored ${formatPoints(score ?? 0)} out of ${formatPoints(DAILY_MAX_SCORE)} today.`
          : `${DAILY_QUESTIONS_PER_SET} questions, the same for everyone, until midnight.`}
      </p>

      <div className="daily-actions">
        <button className="primary-button" type="button" onClick={onPlay}>
          {playedToday ? "Play today again" : "Play today's daily"}
        </button>
        {archiveCount > 0 && (
          <button
            className="secondary-button"
            type="button"
            onClick={onOpenArchive}
          >
            Past dailies ({archiveCount})
          </button>
        )}
      </div>

      {playedToday && (
        <p className="daily-footnote">
          Replaying will not extend your streak, but a better score still
          counts.
        </p>
      )}
    </div>
  );
}

type DailyArchiveProps = {
  dates: readonly string[];
  progress: DailyProgress;
  onPlay: (date: string) => void;
};

export function DailyArchive({ dates, progress, onPlay }: DailyArchiveProps) {
  if (dates.length === 0) {
    return <p className="board-empty">No dailies have been published yet.</p>;
  }

  return (
    <ol className="daily-archive">
      {dates.map((date) => {
        const score = progress.scores[date];
        return (
          <li key={date}>
            <div className="daily-archive-date">
              <strong>{readableDate(date)}</strong>
              <span>
                {score === undefined
                  ? "Not played"
                  : `${formatPoints(score)} / ${formatPoints(DAILY_MAX_SCORE)}`}
              </span>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onPlay(date)}
            >
              {score === undefined ? "Play" : "Replay"}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
