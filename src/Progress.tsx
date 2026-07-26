import type { ReactNode } from "react";
import {
  DEFAULT_RANK_TITLE,
  type Achievement,
  type PlayerProgress,
  type ProgressChange,
} from "../lib/progress";
import {
  BACKGROUND_THEMES,
  type BackgroundTheme,
  isThemeTemporarilyUnlocked,
  isThemeUnlocked,
} from "../lib/themes";
import type { QuestionCategory } from "../lib/types";
import { formatPoints } from "./questionText";

/**
 * A theme's artwork, live and animated, scoped to a small card rather than
 * the full viewport. Every theme is background-only by contract (see
 * lib/themes.ts), so this is the entire visual — there is no matching
 * ink/surface variant to author alongside it.
 */
function ThemePreview({ locked }: { locked: boolean }) {
  return (
    <div
      className={`theme-preview${locked ? " is-locked" : ""}`}
      aria-hidden="true"
    >
      <span className="theme-preview-glow" />
      <span className="theme-preview-stars" />
      <span className="theme-preview-stars theme-preview-stars-b" />
      <span className="theme-preview-shooting-star" />
      <span className="theme-preview-vignette" />
      <span className="theme-preview-orbit" />
      {locked && (
        <span className="theme-preview-lock">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </div>
  );
}

function ThemeCard({
  theme,
  progress,
  categoryLabel,
  equipped,
  onEquip,
}: {
  theme: BackgroundTheme;
  progress: PlayerProgress;
  categoryLabel: string;
  equipped: boolean;
  /** Absent for a locked theme: there is nothing a click could do yet. */
  onEquip?: (themeId: string) => void;
}) {
  const unlocked = isThemeUnlocked(progress, theme);
  const temporarilyUnlocked = isThemeTemporarilyUnlocked(theme);
  const current =
    progress.categories.find((entry) => entry.category === theme.gate.category)
      ?.rank ?? 1;

  const body = (
    <>
      <ThemePreview locked={!unlocked} />
      <div className="theme-card-body">
        <div className="achievement-head">
          <strong>{theme.name}</strong>
          {equipped && (
            <span className="theme-card-equipped">Applied</span>
          )}
          {unlocked && !equipped && (
            <span className="achievement-tick" aria-label="Unlocked">
              ✓
            </span>
          )}
        </div>
        <p className="achievement-detail">{theme.description}</p>
        <p className="achievement-progress">
          {temporarilyUnlocked
            ? `Unlocked for local testing · ${categoryLabel} rank ${theme.gate.rank} in production`
            : unlocked
            ? `Unlocked · ${categoryLabel} rank ${theme.gate.rank} · ${theme.gate.title}`
            : `${categoryLabel} rank ${current} / ${theme.gate.rank} for ${theme.gate.title}`}
        </p>
      </div>
    </>
  );

  // Only an unlocked theme is a real control: a locked one has nothing a
  // click could do, so it stays plain, non-interactive markup rather than a
  // button that would do nothing when pressed.
  if (!unlocked || !onEquip) {
    return (
      <li className="theme-card" aria-label={`${theme.name}, locked`}>
        {body}
      </li>
    );
  }

  return (
    <li className={`theme-card is-unlocked${equipped ? " is-equipped" : ""}`}>
      <button
        type="button"
        className="theme-card-button"
        aria-pressed={equipped}
        onClick={() => onEquip(theme.id)}
      >
        {body}
        <span className="theme-card-hint" aria-hidden="true">
          {equipped ? "Tap to remove" : "Tap to apply"}
        </span>
      </button>
    </li>
  );
}

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
 * Unlockable background themes.
 *
 * Each theme is only ever a background — see lib/themes.ts for why that
 * means it can never clash with the UI it sits behind. Unlocking is derived
 * from rank; the equipped id is a separate local preference so an unlocked
 * card can apply or remove its artwork without changing progression.
 */
export function UnlocksPanel({
  progress,
  labels,
  equippedId,
  onEquip,
}: {
  progress: PlayerProgress;
  labels: Record<QuestionCategory, { title: string }>;
  /** The theme id currently applied everywhere, or null for none. */
  equippedId: string | null;
  onEquip: (themeId: string) => void;
}) {
  const unlockedCount = BACKGROUND_THEMES.filter((theme) =>
    isThemeUnlocked(progress, theme),
  ).length;

  return (
    <div className="progress-panel">
      <div className="progress-summary">
        <div>
          <p className="progress-eyebrow">Unlocks</p>
          <strong className="progress-total">
            {unlockedCount}{" "}
            <span className="progress-of">of {BACKGROUND_THEMES.length}</span>
          </strong>
        </div>
        <p className="progress-summary-note">
          Backgrounds earned through subject ranks. Tap one you've unlocked to
          apply it everywhere; tap it again to remove it.
        </p>
      </div>

      <ul className="theme-list">
        {BACKGROUND_THEMES.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            progress={progress}
            categoryLabel={labels[theme.gate.category].title}
            equipped={equippedId === theme.id}
            onEquip={isThemeUnlocked(progress, theme) ? onEquip : undefined}
          />
        ))}
      </ul>
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
