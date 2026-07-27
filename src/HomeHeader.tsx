import { DAILY_MAX_SCORE } from "../lib/daily";
import { BrandMark } from "./BrandMark";
import { compactReadableDate, readableDate } from "./Daily";
import { formatPoints } from "./questionText";
import type { Theme } from "./theme";

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

type HomeHeaderProps = {
  date: string;
  streak: number;
  playedToday: boolean;
  score: number | null;
  archiveCount: number;
  leaderboardEnabled: boolean;
  accountLabel: string;
  theme: Theme;
  onHome: () => void;
  onPlayDaily: () => void;
  onOpenArchive: () => void;
  onOpenLeaderboard: () => void;
  onOpenAccount: () => void;
  onToggleTheme: () => void;
};

function dailyActionLabel({
  date,
  playedToday,
  score,
}: Pick<HomeHeaderProps, "date" | "playedToday" | "score">) {
  const dateLabel = readableDate(date);
  if (!playedToday) return `Play today's daily, ${dateLabel}`;

  return `Replay today's daily, ${dateLabel}. Your score is ${formatPoints(
    score ?? 0,
  )} out of ${formatPoints(DAILY_MAX_SCORE)} points`;
}

export function HomeHeader({
  date,
  streak,
  playedToday,
  score,
  archiveCount,
  leaderboardEnabled,
  accountLabel,
  theme,
  onHome,
  onPlayDaily,
  onOpenArchive,
  onOpenLeaderboard,
  onOpenAccount,
  onToggleTheme,
}: HomeHeaderProps) {
  return (
    <header className="home-header">
      <div className="home-header-daily-controls">
        <button
          className="home-header-daily"
          type="button"
          onClick={onPlayDaily}
          aria-label={dailyActionLabel({ date, playedToday, score })}
        >
          <span className="home-header-daily-flag">
            <span className="home-header-daily-dot" aria-hidden="true" />
            Daily
          </span>
          <time dateTime={date}>{compactReadableDate(date)}</time>
          <span
            className={`home-header-streak${streak > 0 ? " is-lit" : ""}`}
          >
            <FlameIcon />
            {streak > 0
              ? `${streak} day${streak === 1 ? "" : "s"}`
              : "No streak"}
          </span>
        </button>

        {archiveCount > 0 && (
          <button
            className="home-header-past"
            type="button"
            onClick={onOpenArchive}
            aria-label="Past dailies"
          >
            Past
          </button>
        )}
      </div>

      <button
        className="wordmark home-header-wordmark"
        type="button"
        onClick={onHome}
        aria-label="Give or Take home"
      >
        <BrandMark />
        <span>Give or Take</span>
      </button>

      <div className="home-header-side">
        {leaderboardEnabled && (
          <>
            <button
              className="board-button home-header-board"
              type="button"
              onClick={onOpenLeaderboard}
              aria-label="Leaderboard"
            >
              <span className="home-header-board-full">Leaderboard</span>
              <span className="home-header-board-short" aria-hidden="true">
                Board
              </span>
            </button>
            <button
              className="board-button home-header-account"
              type="button"
              onClick={onOpenAccount}
              title={accountLabel}
            >
              <span>{accountLabel}</span>
            </button>
          </>
        )}

        <button
          className="theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label={
            theme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
        >
          {theme === "dark" ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4.5" />
              <path
                d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
