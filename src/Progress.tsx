import type { ReactNode } from "react";
import {
  DEFAULT_RANK_TITLE,
  type Achievement,
  type PlayerProgress,
  type ProgressChange,
} from "../lib/progress";
import type { QuestionCategory } from "../lib/types";
import { formatPoints } from "./questionText";

/** True once a subject has earned a title of its own. */
export function hasEarnedTitle(title: string | null | undefined): boolean {
  return Boolean(title) && title !== DEFAULT_RANK_TITLE;
}

type RankPanelProps = {
  progress: PlayerProgress;
  /** Subject labels and icons, borrowed from the mode chooser so the two agree. */
  labels: Record<QuestionCategory, { title: string; icon: ReactNode }>;
};

/** The eight subject ladders, on their own screen. */
export function RankPanel({ progress, labels }: RankPanelProps) {
  return (
    <div className="progress-panel">
      <div className="progress-summary">
        <div>
          <p className="progress-eyebrow">Total XP</p>
          <strong className="progress-total">
            {formatPoints(progress.totalXp)}
          </strong>
        </div>
        <p className="progress-summary-note">
          Every question you answer earns XP for its own subject, whichever
          mode asked it.
        </p>
      </div>

      <ul className="rank-grid">
        {progress.categories.map((entry) => (
          <li key={entry.category} className="rank-card">
            <div className="rank-card-head">
              <span className="mode-icon">{labels[entry.category].icon}</span>
              <div className="rank-card-name">
                <strong>{labels[entry.category].title}</strong>
                <span className="rank-card-title">{entry.title}</span>
              </div>
              <span className="rank-card-number">
                <span>Rank</span>
                <strong>{entry.rank}</strong>
              </span>
            </div>

            <div
              className="rank-bar"
              role="progressbar"
              aria-label={`${labels[entry.category].title} progress to rank ${entry.rank + 1}`}
              aria-valuemin={entry.rankFloorXp}
              aria-valuemax={entry.nextRankXp}
              aria-valuenow={entry.xp}
            >
              <span style={{ width: `${entry.fraction * 100}%` }} />
            </div>

            <p className="rank-card-foot">
              {formatPoints(entry.xp)} XP ·{" "}
              {formatPoints(Math.max(0, entry.nextRankXp - entry.xp))} to rank{" "}
              {entry.rank + 1}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Everything collectable, earned or not, on its own screen. */
export function AchievementPanel({ progress }: { progress: PlayerProgress }) {
  const earned = progress.achievements.filter((item) => item.earned).length;

  return (
    <div className="progress-panel">
      <div className="progress-summary">
        <div>
          <p className="progress-eyebrow">Earned</p>
          <strong className="progress-total">
            {earned} <span className="progress-of">of {progress.achievements.length}</span>
          </strong>
        </div>
        <p className="progress-summary-note">
          Every one of these counts rounds you have already played, so they
          catch up the moment you sign in.
        </p>
      </div>

      <ul className="achievement-grid">
        {progress.achievements.map((item) => (
          <li
            key={item.id}
            className={`achievement tier-${item.tier}${item.earned ? " is-earned" : ""}`}
          >
            <div className="achievement-head">
              <strong>{item.name}</strong>
              {item.earned && (
                <span className="achievement-tick" aria-label="Earned">
                  ✓
                </span>
              )}
            </div>
            <p className="achievement-detail">{item.description}</p>
            {!item.earned && (
              <p className="achievement-progress">
                {formatPoints(item.progress)} / {formatPoints(item.threshold)}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Unlockable themes.
 *
 * Deliberately a placeholder rather than a fake gallery: the palettes are not
 * written yet, and inventing swatches here would put a promise on screen that
 * the app cannot keep. What it *can* honestly show is the progress already
 * being made toward whatever the gates end up being.
 */
export function UnlocksPanel({ progress }: { progress: PlayerProgress }) {
  const titled = progress.categories.filter((entry) =>
    hasEarnedTitle(entry.title),
  );

  return (
    <div className="progress-panel">
      <div className="progress-summary">
        <div>
          <p className="progress-eyebrow">Unlocks</p>
          <strong className="progress-total">
            0 <span className="progress-of">so far</span>
          </strong>
        </div>
        <p className="progress-summary-note">
          Themes are coming. They will be earned through subject ranks and
          achievements, so nothing you play now is wasted.
        </p>
      </div>

      <div className="unlocks-empty">
        <p>
          <strong>Nothing to unlock yet.</strong> The first themes arrive in a
          future update and will be tied to the ladders you are already
          climbing.
        </p>
        {titled.length > 0 && (
          <p className="unlocks-progress">
            You already hold {titled.length} subject{" "}
            {titled.length === 1 ? "title" : "titles"} that will count toward
            them.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * What the round just moved, shown on the results and death screens. Silent
 * when nothing changed, so it never becomes furniture.
 */
export function ProgressRibbon({
  change,
  labels,
}: {
  change: ProgressChange | null;
  labels: Record<QuestionCategory, { title: string }>;
}) {
  if (!change) return null;
  const { rankUps, unlocked } = change;
  if (rankUps.length === 0 && unlocked.length === 0) return null;

  return (
    <div className="progress-ribbon" role="status">
      {rankUps.map((up) => (
        <p key={up.category}>
          <strong>{labels[up.category].title} rank {up.rank}</strong>
          {hasEarnedTitle(up.title) ? ` · ${up.title}` : ""}
        </p>
      ))}
      {unlocked.map((item: Achievement) => (
        <p key={item.id}>
          <span className={`achievement-pip tier-${item.tier}`} aria-hidden="true" />
          Achievement unlocked · <strong>{item.name}</strong>
        </p>
      ))}
    </div>
  );
}
