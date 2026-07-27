import {
  DAILY_MAX_SCORE,
  type DailyProgress,
} from "../lib/daily";
import { formatPoints } from "./questionText";

/** Midday keeps the label on the intended day whatever the local offset does. */
export function readableDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));
}

export function compactReadableDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
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
        // The official score is the one worth showing, if there is one — it
        // is what the day is actually recorded as. A practice-only date still
        // reads as unplayed here, matching what the archive is for.
        const score = progress.dates[date]?.officialScore ?? undefined;
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
