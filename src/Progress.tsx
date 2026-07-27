import type { ReactNode, RefObject } from "react";
import {
  DEFAULT_RANK_TITLE,
  type Achievement,
  type PlayerProgress,
  type ProgressChange,
  type RankBadge,
} from "../lib/progress";
import {
  BACKGROUND_THEMES,
  type BackgroundTheme,
  type BackgroundThemeId,
  isThemeSupportedInMode,
  isThemeTemporarilyUnlocked,
  isThemeUnlocked,
  supportedModesForTheme,
} from "../lib/themes";
import type { QuestionCategory } from "../lib/types";
import { formatPoints } from "./questionText";
import { RankBadgeArtwork } from "./RankBadgeArtwork";
import type { Theme } from "./theme";
import { ThemeArtwork } from "./themes/ThemeArtwork";

function ThemeCard({
  theme,
  progress,
  categoryLabel,
  mode,
  equipped,
  onEquip,
  compact = false,
}: {
  theme: BackgroundTheme;
  progress: PlayerProgress;
  categoryLabel: string;
  mode: Theme;
  equipped: boolean;
  /** Absent for a locked theme: there is nothing a click could do yet. */
  onEquip?: (themeId: BackgroundThemeId) => void;
  compact?: boolean;
}) {
  const unlocked = isThemeUnlocked(progress, theme);
  const temporarilyUnlocked = isThemeTemporarilyUnlocked(theme);
  const supportedModes = supportedModesForTheme(theme);
  const supportedMode =
    supportedModes.length === 1 ? supportedModes[0] : null;
  const supportedModeLabel = supportedMode
    ? `${supportedMode[0].toUpperCase()}${supportedMode.slice(1)} mode`
    : null;
  const active = isThemeSupportedInMode(theme, mode);
  const appliedLabel =
    equipped && !active && supportedModeLabel
      ? `Applied in ${supportedModeLabel.toLowerCase()}`
      : "Applied";
  const current =
    progress.categories.find((entry) => entry.category === theme.gate.category)
      ?.rank ?? 1;
  const gateTitle = progress.badges.find(
    (badge) =>
      badge.category === theme.gate.category &&
      badge.rankFloor === theme.gate.rank,
  )?.title;

  const body = (
    <>
      <ThemeArtwork
        themeId={theme.id}
        mode={mode}
        variant="preview"
        locked={!unlocked}
      />
      <div className="theme-card-body">
        <div className="achievement-head">
          <strong>{theme.name}</strong>
          {equipped && (
            <span className="theme-card-equipped">{appliedLabel}</span>
          )}
          {!equipped && supportedModeLabel && (
            <span className="theme-card-mode">{supportedModeLabel}</span>
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
            ? `Unlocked · ${categoryLabel} rank ${theme.gate.rank}${gateTitle ? ` · ${gateTitle}` : ""}`
            : `${categoryLabel} rank ${current} / ${theme.gate.rank}${gateTitle ? ` for ${gateTitle}` : ""}`}
        </p>
      </div>
    </>
  );

  // Only an unlocked theme is a real control: a locked one has nothing a
  // click could do, so it stays plain, non-interactive markup rather than a
  // button that would do nothing when pressed.
  if (!unlocked || !onEquip) {
    return (
      <li
        className={`theme-card${compact ? " is-compact" : ""}`}
        aria-label={`${theme.name}, locked`}
      >
        {body}
      </li>
    );
  }

  return (
    <li
      className={[
        "theme-card",
        "is-unlocked",
        equipped ? "is-equipped" : "",
        equipped && !active ? "is-inactive" : "",
        compact ? "is-compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="theme-card-button"
        aria-pressed={equipped}
        onClick={() => onEquip(theme.id)}
      >
        {body}
        <span className="theme-card-hint" aria-hidden="true">
          {equipped
            ? "Tap to remove"
            : !active && supportedModeLabel
              ? `Tap to apply in ${supportedModeLabel.toLowerCase()}`
              : "Tap to apply"}
        </span>
      </button>
    </li>
  );
}

type ProfileDashboardProps = {
  progress: PlayerProgress;
  labels: Record<
    QuestionCategory,
    { title: string; icon: ReactNode }
  >;
  displayName: string;
  email: string | null;
  emailConfirmed: boolean;
  themeMode: Theme;
  equippedId: BackgroundThemeId | null;
  onEquip: (themeId: BackgroundThemeId) => void;
  onOpenRanks: (category?: QuestionCategory) => void;
  onOpenAchievements: () => void;
  onOpenUnlocks: () => void;
  onSignOut: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
};

/**
 * The signed-in profile is a dashboard rather than a menu. Subjects, earned
 * achievements and background unlocks all stay visible, while the longer
 * collection screens remain available through the section actions.
 */
export function ProfileDashboard({
  progress,
  labels,
  displayName,
  email,
  emailConfirmed,
  themeMode,
  equippedId,
  onEquip,
  onOpenRanks,
  onOpenAchievements,
  onOpenUnlocks,
  onSignOut,
  headingRef,
}: ProfileDashboardProps) {
  const highest = progress.categories.reduce(
    (best, entry) => (entry.rank > best.rank ? entry : best),
    progress.categories[0],
  );
  const earned = progress.achievements.filter((item) => item.earned);
  const featuredAchievements = [
    ...earned,
    ...progress.achievements.filter((item) => !item.earned),
  ].slice(0, 4);
  const unlockedCount = BACKGROUND_THEMES.filter((theme) =>
    isThemeUnlocked(progress, theme),
  ).length;
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="profile-dashboard">
      <section className="profile-hero" aria-labelledby="profile-name">
        <span className="profile-hero-sheen" aria-hidden="true" />
        <div className="profile-identity">
          <span className="profile-avatar" aria-hidden="true">
            {initial}
          </span>
          <div>
            <h1 id="profile-name" ref={headingRef} tabIndex={-1}>
              {displayName}
            </h1>
            <p>
              {highest
                ? `${highest.title} · highest rank in ${labels[highest.category].title}`
                : "Newcomer"}
            </p>
          </div>
        </div>
        <div className="profile-total">
          <span>Total XP</span>
          <strong>{formatPoints(progress.totalXp)}</strong>
        </div>
        <div className="profile-facts">
          <span>{progress.categories.length} subject ladders</span>
          <span>
            {earned.length} of {progress.achievements.length} achievements
          </span>
          <span>{emailConfirmed ? "Email confirmed" : "Email not confirmed"}</span>
        </div>
      </section>

      <div className="profile-dashboard-grid">
        <section className="profile-section profile-subjects">
          <div className="profile-section-title">
            <div>
              <h2>Subjects</h2>
              <span>{progress.categories.length} ladders</span>
            </div>
            <button type="button" onClick={() => onOpenRanks()}>
              Rank details
            </button>
          </div>
          <ul className="profile-rank-grid">
            {progress.categories.map((entry, index) => {
              const remaining = Math.max(0, entry.nextRankXp - entry.xp);
              const gatedTheme = BACKGROUND_THEMES.find(
                (theme) => theme.gate.category === entry.category,
              );
              return (
                <li
                  key={entry.category}
                  className={entry.questionsAnswered === 0 ? "is-unplayed" : ""}
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <button
                    type="button"
                    className="profile-rank-button"
                    onClick={() => onOpenRanks(entry.category)}
                    aria-label={`Open ${labels[entry.category].title} ranks, currently rank ${entry.rank}, ${entry.title}`}
                  >
                    <div className="profile-rank-head">
                      <strong>{labels[entry.category].title}</strong>
                      <span>{entry.rank}</span>
                    </div>
                    <span className="profile-rank-title">{entry.title}</span>
                    <div
                      className="profile-rank-bar"
                      role="progressbar"
                      aria-label={`${labels[entry.category].title} progress to rank ${entry.rank + 1}`}
                      aria-valuemin={entry.rankFloorXp}
                      aria-valuemax={entry.nextRankXp}
                      aria-valuenow={entry.xp}
                    >
                      <span style={{ width: `${entry.fraction * 100}%` }} />
                    </div>
                    <p>
                      {entry.questionsAnswered === 0
                        ? gatedTheme
                          ? `Never played · unlocks ${gatedTheme.name} at rank ${gatedTheme.gate.rank}`
                          : "Never played"
                        : `${formatPoints(entry.xp)} XP · ${formatPoints(remaining)} to rank ${entry.rank + 1}`}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="profile-collection">
          <section className="profile-section">
            <div className="profile-section-title">
              <div>
                <h2>Achievements</h2>
                <span>
                  {earned.length} of {progress.achievements.length}
                </span>
              </div>
            </div>
            <ul className="profile-achievements">
              {featuredAchievements.map((item) => (
                <li
                  key={item.id}
                  className={[
                    `tier-${item.tier}`,
                    item.earned ? "is-earned" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span
                    className={`achievement-pip tier-${item.tier}`}
                    aria-hidden="true"
                  />
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.description}</span>
                  </div>
                  {item.earned ? (
                    <span className="achievement-tick" aria-label="Earned">
                      ✓
                    </span>
                  ) : (
                    <span className="profile-achievement-count">
                      {formatPoints(item.progress)} / {formatPoints(item.threshold)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <button
              className="profile-section-action"
              type="button"
              onClick={onOpenAchievements}
            >
              See all {progress.achievements.length}
            </button>
          </section>

          <section className="profile-section">
            <div className="profile-section-title">
              <div>
                <h2>Backgrounds</h2>
                <span>
                  {unlockedCount} of {BACKGROUND_THEMES.length}
                </span>
              </div>
            </div>
            <ul className="theme-list profile-theme-list">
              {BACKGROUND_THEMES.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  progress={progress}
                  categoryLabel={labels[theme.gate.category].title}
                  mode={themeMode}
                  equipped={equippedId === theme.id}
                  onEquip={
                    isThemeUnlocked(progress, theme) ? onEquip : undefined
                  }
                  compact
                />
              ))}
            </ul>
            <button
              className="profile-section-action"
              type="button"
              onClick={onOpenUnlocks}
            >
              Manage backgrounds
            </button>
          </section>
        </aside>
      </div>

      <section className="profile-account-strip" aria-label="Account details">
        <dl>
          <div>
            <dt>Signed in as</dt>
            <dd>{email ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Leaderboard name</dt>
            <dd>{displayName}</dd>
          </div>
          <div>
            <dt>Email confirmed</dt>
            <dd className={emailConfirmed ? "is-confirmed" : undefined}>
              {emailConfirmed ? "Yes" : "Not yet"}
            </dd>
          </div>
        </dl>
        <button type="button" onClick={onSignOut}>
          Sign out
        </button>
      </section>
    </div>
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
  selectedCategory: QuestionCategory;
  onSelectCategory: (category: QuestionCategory) => void;
};

function badgeStatus(badge: RankBadge): "Current" | "Earned" | "Locked" {
  if (badge.current) return "Current";
  return badge.earned ? "Earned" : "Locked";
}

/** One subject ladder and the six medallions that belong to it. */
export function RankPanel({
  progress,
  labels,
  selectedCategory,
  onSelectCategory,
}: RankPanelProps) {
  const selected =
    progress.categories.find((entry) => entry.category === selectedCategory) ??
    progress.categories[0];
  if (!selected) return null;

  const badges = progress.badges.filter(
    (badge) => badge.category === selected.category,
  );
  const currentBadge = badges.find((badge) => badge.current) ?? null;
  const earnedCount = badges.filter((badge) => badge.earned).length;
  const remaining = Math.max(0, selected.nextRankXp - selected.xp);

  return (
    <div className="progress-panel rank-collection-panel">
      <div className="rank-overview">
        <div className="rank-overview-toolbar">
          <div className="rank-total-compact">
            <span>Total XP</span>
            <strong>{formatPoints(progress.totalXp)}</strong>
          </div>
          <label className="rank-subject-select">
            <span>Choose a subject</span>
            <select
              value={selected.category}
              onChange={(event) =>
                onSelectCategory(event.target.value as QuestionCategory)
              }
            >
              {progress.categories.map((entry) => (
                <option key={entry.category} value={entry.category}>
                  {labels[entry.category].title} — Rank {entry.rank}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section
          className="rank-subject-hero"
          aria-labelledby="selected-rank-subject"
        >
          <div className="rank-subject-copy">
            <div className="rank-subject-heading">
              <span className="mode-icon">{labels[selected.category].icon}</span>
              <div>
                <p>{labels[selected.category].title}</p>
                <h2 id="selected-rank-subject">{selected.title}</h2>
              </div>
              <span className="rank-subject-number">
                <span>Rank</span>
                <strong>{selected.rank}</strong>
              </span>
            </div>

            <div
              className="rank-subject-bar"
              role="progressbar"
              aria-label={`${labels[selected.category].title} progress to rank ${selected.rank + 1}`}
              aria-valuemin={selected.rankFloorXp}
              aria-valuemax={selected.nextRankXp}
              aria-valuenow={selected.xp}
            >
              <span style={{ width: `${selected.fraction * 100}%` }} />
            </div>
            <p className="rank-subject-progress-copy">
              <strong>{formatPoints(selected.xp)} XP</strong>
              <span>
                {formatPoints(remaining)} XP to rank {selected.rank + 1}
              </span>
            </p>
          </div>

          <div className="rank-current-badge">
            <RankBadgeArtwork
              badgeKey={currentBadge?.badgeKey}
              eager
            />
            <span>
              {!progress.badgeCatalogueAvailable
                ? "Badges temporarily unavailable"
                : currentBadge
                  ? "Current badge"
                  : "First badge at rank 5"}
            </span>
          </div>

          <dl className="rank-subject-stats">
            <div>
              <dt>Subject XP</dt>
              <dd>{formatPoints(selected.xp)}</dd>
            </div>
            <div>
              <dt>Questions answered</dt>
              <dd>{formatPoints(selected.questionsAnswered)}</dd>
            </div>
            <div>
              <dt>Perfect answers</dt>
              <dd>{formatPoints(selected.perfectAnswers)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section
        className="badge-collection"
        aria-labelledby="badge-collection-heading"
      >
        <div className="badge-collection-heading">
          <div>
            <p className="progress-eyebrow">Rank titles</p>
            <h2 id="badge-collection-heading">
              {labels[selected.category].title} collection
            </h2>
          </div>
          <span>
            {progress.badgeCatalogueAvailable
              ? `${earnedCount} of 6 earned`
              : "Catalogue unavailable"}
          </span>
        </div>

        {progress.badgeCatalogueAvailable ? (
          <ul className="badge-collection-grid">
            {badges.map((badge) => {
              const status = badgeStatus(badge);
              const locked = !badge.earned;
              return (
                <li
                  key={badge.badgeKey}
                  className={[
                    "badge-collection-card",
                    badge.current ? "is-current" : "",
                    badge.earned ? "is-earned" : "is-locked",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={
                    locked
                      ? `Rank ${badge.rankFloor}, locked title`
                      : `Rank ${badge.rankFloor}, ${badge.title}, ${status.toLowerCase()}`
                  }
                >
                  <div className="badge-collection-artwork">
                    <RankBadgeArtwork
                      badgeKey={badge.badgeKey}
                    />
                    {locked && (
                      <span className="badge-lock-overlay" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                          <rect x="6" y="10" width="12" height="10" rx="2" />
                          <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <span className="badge-required-rank">
                    Rank {badge.rankFloor}
                  </span>
                  {locked ? (
                    <>
                      <strong
                        className="badge-collection-title is-blurred"
                        aria-hidden="true"
                      >
                        {badge.title}
                      </strong>
                      <span className="sr-only">Hidden title</span>
                    </>
                  ) : (
                    <strong className="badge-collection-title">
                      {badge.title}
                    </strong>
                  )}
                  <span className="badge-collection-status">
                    {badge.current ? "Current title" : status}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="badge-collection-empty" role="status">
            Your ranks and XP are still available. Badge artwork will return
            when the title catalogue can be loaded.
          </p>
        )}
      </section>
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
  themeMode,
  equippedId,
  onEquip,
}: {
  progress: PlayerProgress;
  labels: Record<QuestionCategory, { title: string }>;
  themeMode: Theme;
  /** The theme id currently applied everywhere, or null for none. */
  equippedId: BackgroundThemeId | null;
  onEquip: (themeId: BackgroundThemeId) => void;
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
            mode={themeMode}
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
  const { rankUps, unlocked, badgesUnlocked } = change;
  if (
    rankUps.length === 0 &&
    unlocked.length === 0 &&
    badgesUnlocked.length === 0
  ) {
    return null;
  }
  const announcedBadgeRanks = new Set(
    badgesUnlocked.map((badge) => `${badge.category}:${badge.rankFloor}`),
  );
  const remainingRankUps = rankUps.filter(
    (up) => !announcedBadgeRanks.has(`${up.category}:${up.rank}`),
  );

  return (
    <div className="progress-ribbon" role="status">
      {badgesUnlocked.map((badge) => (
        <div className="progress-ribbon-badge" key={badge.badgeKey}>
          <RankBadgeArtwork
            badgeKey={badge.badgeKey}
            eager
          />
          <p>
            Badge unlocked ·{" "}
            <strong>
              {labels[badge.category].title} · {badge.title} · Rank{" "}
              {badge.rankFloor}
            </strong>
          </p>
        </div>
      ))}
      {remainingRankUps.map((up) => (
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
