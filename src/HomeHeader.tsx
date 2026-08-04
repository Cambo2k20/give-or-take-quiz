import type { ReactNode } from "react";

import { BrandMark } from "./BrandMark";
import type { Theme } from "./theme";

const LeaderboardIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 20h16" />
    <rect x="5" y="12" width="4.6" height="6" rx="1.2" />
    <rect x="9.7" y="7" width="4.6" height="11" rx="1.2" />
    <rect x="14.4" y="14.5" width="4.6" height="3.5" rx="1.2" />
  </svg>
);

const ProfileIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="9" r="3.6" />
    <path d="M5 19.5c1.3-3.1 3.9-4.6 7-4.6s5.7 1.5 7 4.6" />
  </svg>
);

type HomeHeaderProps = {
  leaderboardEnabled: boolean;
  accountLabel: string;
  socialUnreadCount?: number;
  musicControls?: ReactNode;
  theme: Theme;
  onHome: () => void;
  onOpenLeaderboard: () => void;
  onOpenAccount: () => void;
  onToggleTheme: () => void;
};

export function HomeHeader({
  leaderboardEnabled,
  accountLabel,
  socialUnreadCount = 0,
  musicControls,
  theme,
  onHome,
  onOpenLeaderboard,
  onOpenAccount,
  onToggleTheme,
}: HomeHeaderProps) {
  return (
    <header className="home-header home-header-redesign">
      <div className="home-header-music">{musicControls}</div>

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
        <button
          className="board-button home-header-board"
          type="button"
          onClick={onOpenLeaderboard}
          aria-label="Leaderboard"
          title={
            leaderboardEnabled
              ? undefined
              : "Leaderboard data is unavailable in this local setup"
          }
        >
          <LeaderboardIcon />
          <span>Leaderboard</span>
        </button>
        <button
          className="board-button home-header-account"
          type="button"
          onClick={onOpenAccount}
          title={accountLabel}
          aria-label={
            accountLabel === "Sign in"
              ? "Profile, sign in"
              : `Profile, ${accountLabel}`
          }
        >
          <ProfileIcon />
          <span>Profile</span>
          {socialUnreadCount > 0 && (
            <span
              className="home-header-social-badge"
              aria-label={`${socialUnreadCount} unread friend updates`}
            >
              {socialUnreadCount > 9 ? "9+" : socialUnreadCount}
            </span>
          )}
        </button>
        <button
          className="theme-toggle home-header-theme-toggle"
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
