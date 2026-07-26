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

type DailyStripProps = {
  set: DailySet;
  streak: number;
  playedToday: boolean;
  score: number | null;
  archiveCount: number;
  onPlay: () => void;
  onOpenArchive: () => void;
};

/**
 * The home-page daily, as a banner above everything else: today's puzzle is a
 * standing invitation rather than one card among many. Everyone gets the same
 * five questions on a given day, which is what makes the score worth comparing.
 *
 * Each button's visible word opens its accessible name rather than replacing
 * it, so "Play" and "Past" stay short in the strip without leaving a
 * screen reader to guess what they play or what is past.
 */
export function DailyStrip({
  set,
  streak,
  playedToday,
  score,
  archiveCount,
  onPlay,
  onOpenArchive,
}: DailyStripProps) {
  return (
    <div className="daily-strip-wrap">
      <div className="daily-strip">
        <span className="daily-strip-flag">
          <span className="daily-strip-dot" aria-hidden="true" />
          Daily
        </span>
        <span className="daily-strip-date">{readableDate(set.date)}</span>
        <span className="daily-strip-meta">
          {playedToday
            ? `${formatPoints(score ?? 0)} / ${formatPoints(DAILY_MAX_SCORE)}`
            : `${DAILY_QUESTIONS_PER_SET} questions`}
        </span>

        <button
          className="daily-strip-play"
          type="button"
          onClick={onPlay}
          aria-label={
            playedToday ? "Replay today's daily" : "Play today's daily"
          }
        >
          {playedToday ? "Replay" : "Play"}
        </button>
        {archiveCount > 0 && (
          <button
            className="daily-strip-past"
            type="button"
            onClick={onOpenArchive}
            aria-label="Past dailies"
          >
            Past
          </button>
        )}

        <StreakBadge streak={streak} />
      </div>

      {playedToday && (
        <p className="daily-strip-note">
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
