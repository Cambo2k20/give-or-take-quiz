import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  DEFAULT_PROFILE_AVATAR,
  isProfileAvatarKey,
  VOLCANO_PROFILE_AVATAR,
  type BuiltInProfileAvatarKey,
  type ProfileAvatarKey,
} from "../lib/leaderboard";
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
import aphroditeAvatarUrl from "./assets/avatars/aphrodite.jpg";
import auroraLongshipAvatarUrl from "./assets/avatars/aurora-longship.jpg";
import mayanTempleAvatarUrl from "./assets/avatars/emerald-temple.jpg";
import eventHorizonAvatarUrl from "./assets/avatars/event-horizon.webp";
import hermesAvatarUrl from "./assets/avatars/hermes.jpg";
import stormRocketAvatarUrl from "./assets/avatars/storm-rocket.jpg";
import mjolnirAvatarUrl from "./assets/avatars/thunder-hammer.jpg";
import valkyrieHelmAvatarUrl from "./assets/avatars/valkyrie-helm.jpg";
import volcanoAvatarUrl from "./assets/avatars/volcano.png";
import { MascotPose } from "./mascot/MascotPose";
import { ProfileDisplayNameForm } from "./Leaderboard";
import { QaStatusBadge } from "./QaStatus";
import { formatPoints } from "./questionText";
import { RankBadgeArtwork } from "./RankBadgeArtwork";
import type { Theme } from "./theme";
import { ThemeArtwork } from "./themes/ThemeArtwork";

export const BUILT_IN_AVATAR_OPTIONS = [
  {
    key: DEFAULT_PROFILE_AVATAR,
    name: "Event Horizon",
    detail: "Default avatar",
    url: eventHorizonAvatarUrl,
  },
  {
    key: VOLCANO_PROFILE_AVATAR,
    name: "Volcano",
    detail: "Built-in avatar",
    url: volcanoAvatarUrl,
  },
  {
    key: "hermes",
    name: "Hermes",
    detail: "Messenger of the skies",
    url: hermesAvatarUrl,
  },
  {
    key: "aphrodite",
    name: "Aphrodite",
    detail: "Born from the sea",
    url: aphroditeAvatarUrl,
  },
  {
    key: "storm-rocket",
    name: "Storm Rocket",
    detail: "Launch through the lightning",
    url: stormRocketAvatarUrl,
  },
  {
    key: "aurora-longship",
    name: "Aurora Longship",
    detail: "Sail beneath the northern lights",
    url: auroraLongshipAvatarUrl,
  },
  {
    key: "mayan-temple",
    name: "Mayan Temple",
    detail: "Ancient beacon among the stars",
    url: mayanTempleAvatarUrl,
  },
  {
    key: "valkyrie-helm",
    name: "Valkyrie Helm",
    detail: "Armour of the star guard",
    url: valkyrieHelmAvatarUrl,
  },
  {
    key: "mjolnir",
    name: "Mjolnir",
    detail: "Forged in the storm",
    url: mjolnirAvatarUrl,
  },
] satisfies ReadonlyArray<{
  key: BuiltInProfileAvatarKey;
  name: string;
  detail: string;
  url: string;
}>;

function builtInAvatarUrl(avatarKey: ProfileAvatarKey): string | null {
  return (
    BUILT_IN_AVATAR_OPTIONS.find((option) => option.key === avatarKey)?.url ??
    null
  );
}

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
  avatarKey: ProfileAvatarKey;
  email: string | null;
  emailConfirmed: boolean;
  themeMode: Theme;
  equippedId: BackgroundThemeId | null;
  onEquip: (themeId: BackgroundThemeId) => void;
  onSelectAvatar: (avatarKey: ProfileAvatarKey) => Promise<void>;
  onChangeDisplayName: (name: string) => Promise<unknown>;
  onOpenRanks: (category?: QuestionCategory) => void;
  onOpenAchievements: () => void;
  onOpenUnlocks: () => void;
  onOpenFriends?: () => void;
  onCustomisePublicProfile: () => void;
  mascotInGames: boolean;
  onMascotInGamesChange: (enabled: boolean) => void;
  friendCount?: number;
  activeChallengeCount?: number;
  socialUnreadCount?: number;
  isQa?: boolean;
  simulationPanel?: ReactNode;
  onSignOut: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
};

export function MascotGamePreference({
  enabled,
  onChange,
  companion = false,
  sectionRef,
  highlighted = false,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  companion?: boolean;
  sectionRef?: RefObject<HTMLElement | null>;
  highlighted?: boolean;
}) {
  const titleId = companion
    ? "profile-mascot-companion-title"
    : "profile-mascot-preference-title";

  return (
    <section
      ref={sectionRef}
      className={`profile-mascot-preference${
        companion ? " is-companion" : ""
      }${highlighted ? " is-highlighted" : ""}`}
      aria-labelledby={titleId}
      tabIndex={companion ? -1 : undefined}
    >
      <div className="profile-mascot-copy">
        {companion && (
          <MascotPose
            pose="sleeping"
            decorative
            animated
            className="profile-mascot-companion-art"
          />
        )}
        <div>
          {companion ? (
            <>
              <p className="eyebrow">Your slider sidekick</p>
              <h2 id={titleId}>Mascot Companion</h2>
              <p>
                Choose whether the mascot joins your Classic, Daily and Survival
                sliders. This preference is saved on this device.
              </p>
            </>
          ) : (
            <>
              <strong id={titleId}>Mascot in games</strong>
              <span>Bring him onto Classic, Daily and Survival sliders.</span>
            </>
          )}
        </div>
      </div>
      <button
        className="profile-mascot-toggle"
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Show mascot in real games"
        onClick={() => onChange(!enabled)}
      >
        <span aria-hidden="true" />
        {enabled ? "On" : "Off"}
      </button>
    </section>
  );
}

/**
 * The signed-in profile is a dashboard rather than a menu. Subjects, earned
 * achievements and background unlocks all stay visible, while the longer
 * collection screens remain available through the section actions.
 */
export function ProfileDashboard({
  progress,
  labels,
  displayName,
  avatarKey,
  email,
  emailConfirmed,
  themeMode,
  equippedId,
  onEquip,
  onSelectAvatar,
  onChangeDisplayName,
  onOpenRanks,
  onOpenAchievements,
  onOpenUnlocks,
  onOpenFriends,
  onCustomisePublicProfile,
  mascotInGames,
  onMascotInGamesChange,
  friendCount,
  activeChallengeCount,
  socialUnreadCount,
  isQa = false,
  simulationPanel,
  onSignOut,
  headingRef,
}: ProfileDashboardProps) {
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [nameEditorOpen, setNameEditorOpen] = useState(false);
  const [mascotSectionHighlighted, setMascotSectionHighlighted] =
    useState(false);
  const mascotSectionRef = useRef<HTMLElement>(null);
  const mascotHighlightTimerRef = useRef<number | null>(null);
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
  const badgeAvatarOptions = progress.badges.flatMap((badge) =>
    badge.earned && isProfileAvatarKey(badge.badgeKey)
      ? [
          {
            key: badge.badgeKey,
            name: badge.title,
            detail: `${labels[badge.category].title} · Rank ${badge.rankFloor}`,
          },
        ]
      : [],
  );
  const avatarOptions: Array<{
    key: ProfileAvatarKey;
    name: string;
    detail: string;
  }> = [
    ...BUILT_IN_AVATAR_OPTIONS,
    ...badgeAvatarOptions,
  ];
  const currentAvatar =
    avatarOptions.find((option) => option.key === avatarKey) ?? avatarOptions[0];

  useEffect(
    () => () => {
      if (mascotHighlightTimerRef.current !== null) {
        window.clearTimeout(mascotHighlightTimerRef.current);
      }
    },
    [],
  );

  function visitMascotSection() {
    const section = mascotSectionRef.current;
    if (!section) return;

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    section.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
    section.focus({ preventScroll: true });
    setMascotSectionHighlighted(true);

    if (mascotHighlightTimerRef.current !== null) {
      window.clearTimeout(mascotHighlightTimerRef.current);
    }
    mascotHighlightTimerRef.current = window.setTimeout(() => {
      setMascotSectionHighlighted(false);
      mascotHighlightTimerRef.current = null;
    }, 1600);
  }

  async function selectAvatar(nextAvatar: ProfileAvatarKey) {
    if (nextAvatar === avatarKey || avatarSaving) return;
    setAvatarSaving(true);
    setAvatarMessage("");
    try {
      await onSelectAvatar(nextAvatar);
      setAvatarMessage("Avatar updated.");
    } catch (error) {
      setAvatarMessage(
        error instanceof Error ? error.message : "Could not update your avatar.",
      );
    } finally {
      setAvatarSaving(false);
    }
  }

  return (
    <div className="profile-dashboard">
      <section className="profile-hero" aria-labelledby="profile-name">
        <span className="profile-hero-sheen" aria-hidden="true" />
        <div className="profile-identity">
          <button
            className="profile-avatar"
            type="button"
            onClick={() => {
              setAvatarPickerOpen((open) => !open);
              setAvatarMessage("");
            }}
            aria-label={`Change avatar, currently ${currentAvatar.name}`}
            aria-expanded={avatarPickerOpen}
            aria-controls="profile-avatar-picker"
          >
            <ProfileAvatarArtwork
              avatarKey={avatarKey}
              className="profile-avatar-image"
            />
          </button>
          <div>
            <div className="profile-name-row">
              <h1 id="profile-name" ref={headingRef} tabIndex={-1}>
                {displayName}
              </h1>
              {isQa && <QaStatusBadge />}
              <button
                className="profile-name-edit"
                type="button"
                onClick={() => setNameEditorOpen((open) => !open)}
              >
                Change display name
              </button>
            </div>
            <p>
              {isQa && highest
                ? `${highest.title} · simulated rank ${highest.rank}`
                : highest
                ? `${highest.title} · highest rank in ${labels[highest.category].title}`
                : "Newcomer"}
            </p>
          </div>
        </div>
        <div className="profile-total">
          <span>{isQa ? "Simulated XP" : "Total XP"}</span>
          <strong>{formatPoints(progress.totalXp)}</strong>
        </div>
        <div className="profile-facts">
          <span>
            {progress.categories.length} subject ladders
            {isQa ? " · simulated" : ""}
          </span>
          <span>
            {earned.length} of {progress.achievements.length} achievements
          </span>
          <span>{emailConfirmed ? "Email confirmed" : "Email not confirmed"}</span>
          <button
            className="profile-hero-shortcut"
            type="button"
            onClick={visitMascotSection}
          >
            <MascotPose
              pose="peeking"
              decorative
              viewBox="14 40 96 88"
              className="profile-mascot-shortcut-art"
            />
            Visit mascot <span aria-hidden="true">↓</span>
          </button>
        </div>
      </section>

      {simulationPanel}

      {nameEditorOpen && (
        <section className="profile-section profile-display-name-card">
          <ProfileDisplayNameForm
            currentName={displayName}
            onSave={async (name) => {
              await onChangeDisplayName(name);
              setNameEditorOpen(false);
            }}
            onCancel={() => setNameEditorOpen(false)}
          />
        </section>
      )}

      {avatarPickerOpen && (
        <section
          className="profile-avatar-picker"
          id="profile-avatar-picker"
          aria-labelledby="profile-avatar-picker-title"
        >
          <div className="profile-avatar-picker-head">
            <div>
              <p className="eyebrow">Profile icon</p>
              <h2 id="profile-avatar-picker-title">Choose your avatar</h2>
            </div>
            <button
              type="button"
              className="profile-avatar-picker-close"
              onClick={() => setAvatarPickerOpen(false)}
            >
              Close
            </button>
          </div>
          <p className="profile-avatar-picker-lede">
            {isQa
              ? "Use built-in artwork or any badge allowed by your simulated rank."
              : "Use the default artwork or any subject badge you have earned."}
          </p>
          <div className="profile-avatar-options">
            {avatarOptions.map((option) => {
              const selected = option.key === avatarKey;
              return (
                <button
                  key={option.key}
                  type="button"
                  className={`profile-avatar-option${
                    selected ? " is-selected" : ""
                  }`}
                  onClick={() => void selectAvatar(option.key)}
                  aria-pressed={selected}
                  disabled={avatarSaving}
                >
                  <span className="profile-avatar-option-artwork">
                    <ProfileAvatarArtwork avatarKey={option.key} />
                  </span>
                  <span className="profile-avatar-option-copy">
                    <strong>{option.name}</strong>
                    <span>{option.detail}</span>
                  </span>
                  <span className="profile-avatar-option-state">
                    {selected ? "Selected" : "Choose"}
                  </span>
                </button>
              );
            })}
          </div>
          <p
            className={`profile-avatar-message${
              avatarMessage && !avatarMessage.endsWith("updated.")
                ? " is-error"
                : ""
            }`}
            role="status"
          >
            {avatarSaving ? "Saving avatar…" : avatarMessage}
          </p>
        </section>
      )}

      <div className="profile-social-row">
        <section className="profile-section profile-public-card">
          <div>
            <p className="eyebrow">Seen from the leaderboard</p>
            <h2>Public profile</h2>
            <p>
              {isQa
                ? "Feature simulated titles, achievements and unlocked banners. Your public QA marker remains visible."
                : "Feature an earned title, pin achievements and choose an unlocked banner without changing your own game background."}
            </p>
          </div>
          <button
            className="profile-section-action"
            type="button"
            onClick={onCustomisePublicProfile}
          >
            Customise public profile
          </button>
        </section>

        {!isQa && onOpenFriends && (
        <section className="profile-section profile-friends-card">
          <div>
            <p className="eyebrow">Play together, in your own time</p>
            <h2>Friends</h2>
            <p>
              Private Classic and Survival challenges, plus your record against
              every player you have faced.
            </p>
          </div>
          <div className="profile-friends-summary" aria-label="Friends summary">
            <span>
              <strong>{friendCount ?? 0}</strong> friends
            </span>
            <span>
              <strong>{activeChallengeCount ?? 0}</strong> active
            </span>
          </div>
          <button
            className="profile-section-action"
            type="button"
            onClick={onOpenFriends}
          >
            Open Friends
            {(socialUnreadCount ?? 0) > 0 && (
              <span
                className="social-badge"
                aria-label={`${socialUnreadCount ?? 0} unread friend updates`}
              >
                {(socialUnreadCount ?? 0) > 9 ? "9+" : socialUnreadCount}
              </span>
            )}
          </button>
        </section>
        )}
      </div>

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
                  className={
                    entry.questionsAnswered === 0 && !isQa ? "is-unplayed" : ""
                  }
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
                      {isQa
                        ? `Simulated rank ${entry.rank} · ${formatPoints(entry.xp)} XP`
                        : entry.questionsAnswered === 0
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
                    <span>
                      {item.description}{item.simulated ? " · Simulated" : ""}
                    </span>
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

      <MascotGamePreference
        enabled={mascotInGames}
        onChange={onMascotInGamesChange}
        companion
        sectionRef={mascotSectionRef}
        highlighted={mascotSectionHighlighted}
      />
    </div>
  );
}

export function QaProfileDashboard({
  displayName,
  avatarKey,
  email,
  emailConfirmed,
  onSelectAvatar,
  onChangeDisplayName,
  onViewPublicProfile,
  mascotInGames,
  onMascotInGamesChange,
  onSignOut,
  headingRef,
}: {
  displayName: string;
  avatarKey: ProfileAvatarKey;
  email: string | null;
  emailConfirmed: boolean;
  onSelectAvatar: (avatarKey: ProfileAvatarKey) => Promise<void>;
  onChangeDisplayName: (name: string) => Promise<unknown>;
  onViewPublicProfile: () => void;
  mascotInGames: boolean;
  onMascotInGamesChange: (enabled: boolean) => void;
  onSignOut: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [nameEditorOpen, setNameEditorOpen] = useState(false);
  const currentAvatar =
    BUILT_IN_AVATAR_OPTIONS.find((option) => option.key === avatarKey) ??
    BUILT_IN_AVATAR_OPTIONS[0];

  async function selectAvatar(nextAvatar: BuiltInProfileAvatarKey) {
    if (nextAvatar === avatarKey || avatarSaving) return;
    setAvatarSaving(true);
    setAvatarMessage("");
    try {
      await onSelectAvatar(nextAvatar);
      setAvatarMessage("Avatar updated.");
    } catch (error) {
      setAvatarMessage(
        error instanceof Error ? error.message : "Could not update your avatar.",
      );
    } finally {
      setAvatarSaving(false);
    }
  }

  return (
    <div className="profile-dashboard qa-profile-dashboard">
      <section className="profile-hero qa-profile-hero" aria-labelledby="profile-name">
        <span className="profile-hero-sheen" aria-hidden="true" />
        <div className="profile-identity">
          <button
            className="profile-avatar"
            type="button"
            onClick={() => {
              setAvatarPickerOpen((open) => !open);
              setAvatarMessage("");
            }}
            aria-label={`Change avatar, currently ${currentAvatar.name}`}
            aria-expanded={avatarPickerOpen}
            aria-controls="qa-profile-avatar-picker"
          >
            <ProfileAvatarArtwork
              avatarKey={avatarKey}
              className="profile-avatar-image"
            />
          </button>
          <div>
            <div className="profile-name-row">
              <h1 id="profile-name" ref={headingRef} tabIndex={-1}>
                {displayName}
              </h1>
              <QaStatusBadge />
            </div>
            <p>QA account · Scoreless play</p>
          </div>
        </div>
        <div className="profile-facts qa-profile-facts">
          <span>Account identity active</span>
          <span>Competitive results disabled</span>
          <span>{emailConfirmed ? "Email confirmed" : "Email not confirmed"}</span>
        </div>
      </section>

      {avatarPickerOpen && (
        <section
          className="profile-avatar-picker"
          id="qa-profile-avatar-picker"
          aria-labelledby="qa-profile-avatar-picker-title"
        >
          <div className="profile-avatar-picker-head">
            <div>
              <p className="eyebrow">Profile icon</p>
              <h2 id="qa-profile-avatar-picker-title">Choose your avatar</h2>
            </div>
            <button
              type="button"
              className="profile-avatar-picker-close"
              onClick={() => setAvatarPickerOpen(false)}
            >
              Close
            </button>
          </div>
          <p className="profile-avatar-picker-lede">
            Built-in artwork is available now. Rank badges arrive with simulated
            QA progression in Phase 3.
          </p>
          <div className="profile-avatar-options">
            {BUILT_IN_AVATAR_OPTIONS.map((option) => {
              const selected = option.key === avatarKey;
              return (
                <button
                  key={option.key}
                  type="button"
                  className={`profile-avatar-option${
                    selected ? " is-selected" : ""
                  }`}
                  onClick={() => void selectAvatar(option.key)}
                  aria-pressed={selected}
                  disabled={avatarSaving}
                >
                  <span className="profile-avatar-option-artwork">
                    <ProfileAvatarArtwork avatarKey={option.key} />
                  </span>
                  <span className="profile-avatar-option-copy">
                    <strong>{option.name}</strong>
                    <span>{option.detail}</span>
                  </span>
                  <span className="profile-avatar-option-state">
                    {selected ? "Selected" : "Choose"}
                  </span>
                </button>
              );
            })}
          </div>
          <p
            className={`profile-avatar-message${
              avatarMessage && !avatarMessage.endsWith("updated.")
                ? " is-error"
                : ""
            }`}
            role="status"
          >
            {avatarSaving ? "Saving avatar…" : avatarMessage}
          </p>
        </section>
      )}

      <div className="qa-profile-actions">
        <section className="profile-section">
          <p className="eyebrow">Account identity</p>
          <h2>Display name</h2>
          <p>
            Your QA status is assigned separately and cannot be changed through
            your name.
          </p>
          <button
            className="profile-section-action"
            type="button"
            onClick={() => setNameEditorOpen((open) => !open)}
          >
            Change display name
          </button>
          {nameEditorOpen && (
            <ProfileDisplayNameForm
              currentName={displayName}
              onSave={async (name) => {
                await onChangeDisplayName(name);
                setNameEditorOpen(false);
              }}
              onCancel={() => setNameEditorOpen(false)}
            />
          )}
        </section>

        <section className="profile-section">
          <p className="eyebrow">Public identity</p>
          <h2>Public profile</h2>
          <p>
            Your name, avatar and permanent QA marker are public. Competitive
            ranks and challenge actions remain disabled.
          </p>
          <button
            className="profile-section-action"
            type="button"
            onClick={onViewPublicProfile}
          >
            View public profile
          </button>
        </section>
      </div>

      <section className="profile-account-strip" aria-label="Account details">
        <dl>
          <div>
            <dt>Signed in as</dt>
            <dd>{email ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Display name</dt>
            <dd>{displayName}</dd>
          </div>
          <div>
            <dt>Account type</dt>
            <dd className="qa-account-type"><QaStatusBadge /> Scoreless</dd>
          </div>
        </dl>
        <button type="button" onClick={onSignOut}>Sign out</button>
      </section>

      <MascotGamePreference
        enabled={mascotInGames}
        onChange={onMascotInGamesChange}
        companion
      />
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
  headingRef: RefObject<HTMLHeadingElement | null>;
};

export function ProfileAvatarArtwork({
  avatarKey,
  className,
}: {
  avatarKey: ProfileAvatarKey;
  className?: string;
}) {
  const avatarUrl = builtInAvatarUrl(avatarKey);
  if (avatarUrl) {
    return (
      <img
        className={className}
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    );
  }

  return <RankBadgeArtwork badgeKey={avatarKey} className={className} eager />;
}

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
  headingRef,
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
        <span className="rank-overview-sheen" aria-hidden="true" />
        <div className="rank-overview-toolbar">
          <h1
            className="rank-overview-title"
            ref={headingRef}
            tabIndex={-1}
          >
            Ranks
          </h1>
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
          <div className="rank-total-compact">
            <span>{progress.isSimulated ? "Simulated XP" : "Total XP"}</span>
            <strong>{formatPoints(progress.totalXp)}</strong>
          </div>
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
                {progress.isSimulated
                  ? "Simulated progression"
                  : `${formatPoints(remaining)} XP to rank ${selected.rank + 1}`}
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
              <dd>
                {progress.isSimulated
                  ? "Not simulated"
                  : formatPoints(selected.questionsAnswered)}
              </dd>
            </div>
            <div>
              <dt>Perfect answers</dt>
              <dd>
                {progress.isSimulated
                  ? "Not simulated"
                  : formatPoints(selected.perfectAnswers)}
              </dd>
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
              ? `${earnedCount} of 6 ${progress.isSimulated ? "simulated" : "earned"}`
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
          <p className="progress-eyebrow">
            {progress.isSimulated ? "Simulated" : "Earned"}
          </p>
          <strong className="progress-total">
            {earned} <span className="progress-of">of {progress.achievements.length}</span>
          </strong>
        </div>
        <p className="progress-summary-note">
          {progress.isSimulated
            ? "Presentation-only achievement eligibility. No rounds, streaks or competitive progress are created."
            : "Every one of these counts rounds you have already played, so they catch up the moment you sign in."}
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
            <p className="achievement-detail">
              {item.description}{item.simulated ? " · Simulated" : ""}
            </p>
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
          {progress.isSimulated
            ? "Background eligibility follows simulated subject ranks. Tap one to apply it everywhere; tap it again to remove it."
            : "Backgrounds earned through subject ranks. Tap one you've unlocked to apply it everywhere; tap it again to remove it."}
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

/**
 * The score screen's persistent progression card. Unlike ProgressRibbon it
 * shows the current subject ladder even when the round did not unlock a
 * reward, then folds any exact server-confirmed movement into the same card.
 */
export function ResultProgressCard({
  category,
  progress,
  change,
  labels,
  children,
}: {
  category: QuestionCategory | null;
  progress: PlayerProgress | null;
  change: ProgressChange | null;
  labels: Record<QuestionCategory, { title: string }>;
  children?: ReactNode;
}) {
  const rank = category
    ? progress?.categories.find((entry) => entry.category === category) ?? null
    : null;
  const currentBadge =
    category && progress?.badgeCatalogueAvailable
      ? progress.badges.find(
          (badge) => badge.category === category && badge.current,
        ) ?? null
      : null;
  const nextBadge =
    category && rank && progress?.badgeCatalogueAvailable
      ? progress.badges
          .filter(
            (badge) =>
              badge.category === category && badge.rankFloor > rank.rank,
          )
          .sort((left, right) => left.rankFloor - right.rankFloor)[0] ?? null
      : null;
  const gainedForCategory = category
    ? change?.xpGained.find((entry) => entry.category === category)?.xp ?? 0
    : 0;
  const totalXpGained =
    change?.xpGained.reduce((sum, entry) => sum + entry.xp, 0) ?? 0;
  const announcedBadgeRanks = new Set(
    (change?.badgesUnlocked ?? []).map(
      (badge) => `${badge.category}:${badge.rankFloor}`,
    ),
  );
  const remainingRankUps = (change?.rankUps ?? []).filter(
    (up) => !announcedBadgeRanks.has(`${up.category}:${up.rank}`),
  );
  const hasRewards = Boolean(
    change &&
      (change.badgesUnlocked.length > 0 ||
        remainingRankUps.length > 0 ||
        change.unlocked.length > 0 ||
        (!rank && totalXpGained > 0)),
  );

  if (!rank && !hasRewards && !children) return null;

  const remaining = rank ? Math.max(0, rank.nextRankXp - rank.xp) : 0;

  return (
    <section className="result-progress-card" aria-label="Round progress">
      {rank && category && (
        <div className="result-rank-row">
          <RankBadgeArtwork
            badgeKey={currentBadge?.badgeKey}
            className="result-current-badge"
            eager
          />
          <div className="result-rank-main">
            <div className="result-rank-heading">
              <strong>
                {labels[category].title} · Rank {rank.rank}
              </strong>
              <span>
                {formatPoints(rank.xp)} / {formatPoints(rank.nextRankXp)} XP
              </span>
            </div>
            <div
              className="result-rank-track"
              role="progressbar"
              aria-label={`${labels[category].title} rank progress`}
              aria-valuemin={rank.rankFloorXp}
              aria-valuemax={rank.nextRankXp}
              aria-valuenow={rank.xp}
            >
              <span style={{ width: `${rank.fraction * 100}%` }} />
            </div>
            <p>
              {formatPoints(remaining)} XP to rank {rank.rank + 1}
              {gainedForCategory > 0 && (
                <>
                  {" "}·{" "}
                  <strong>+{formatPoints(gainedForCategory)} XP this round</strong>
                </>
              )}
            </p>
          </div>
          {nextBadge && (
            <div className="result-next-badge">
              <RankBadgeArtwork badgeKey={nextBadge.badgeKey} eager />
              <span>
                Next badge
                <strong>Rank {nextBadge.rankFloor}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {hasRewards && change && (
        <div className="result-rewards" role="status">
          {!rank && totalXpGained > 0 && (
            <p>
              <span className="achievement-pip" aria-hidden="true" />
              <strong>+{formatPoints(totalXpGained)} XP</strong> across{" "}
              {change.xpGained.length}{" "}
              {change.xpGained.length === 1 ? "subject" : "subjects"}
            </p>
          )}
          {change.badgesUnlocked.map((badge) => (
            <div className="result-reward-badge" key={badge.badgeKey}>
              <RankBadgeArtwork badgeKey={badge.badgeKey} eager />
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
              <span className="achievement-pip" aria-hidden="true" />
              Rank up ·{" "}
              <strong>
                {labels[up.category].title} · Rank {up.rank}
              </strong>
            </p>
          ))}
          {change.unlocked.map((item) => (
            <p key={item.id}>
              <span
                className={`achievement-pip tier-${item.tier}`}
                aria-hidden="true"
              />
              Achievement unlocked · <strong>{item.name}</strong>
              <span className="result-reward-detail">{item.description}</span>
            </p>
          ))}
        </div>
      )}

      {children && <div className="result-progress-board">{children}</div>}
    </section>
  );
}
