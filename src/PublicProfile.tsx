import {
  useMemo,
  useState,
  type RefObject,
  type ReactNode,
} from "react";
import type { PlayerProgress } from "../lib/progress";
import type {
  ProfileShowcaseDraft,
  PublicAchievement,
  PublicPlayerProfile,
} from "../lib/publicProfile";
import type { FriendMatchHistory } from "../lib/social";
import { BACKGROUND_THEMES, type BackgroundThemeId } from "../lib/themes";
import type { QuestionCategory } from "../lib/types";
import { ProfileAvatarArtwork } from "./Progress";
import { RankBadgeArtwork } from "./RankBadgeArtwork";
import { QaStatusBadge } from "./QaStatus";
import { formatPoints } from "./questionText";
import type { Theme } from "./theme";
import { ThemeArtwork } from "./themes/ThemeArtwork";

type CategoryLabels = Record<
  QuestionCategory,
  { title: string; icon: ReactNode }
>;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function categoryTitle(
  category: QuestionCategory | "mixed",
  labels: CategoryLabels,
) {
  return category === "mixed" ? "Mixed" : labels[category].title;
}

function featuredAchievements(profile: PublicPlayerProfile) {
  const byId = new Map(
    profile.earnedAchievements.map((achievement) => [achievement.id, achievement]),
  );
  const pinned = profile.showcase.pinnedAchievementIds
    .map((id) => byId.get(id))
    .filter((item): item is PublicAchievement => Boolean(item));
  const pinnedIds = new Set(pinned.map((item) => item.id));
  return [
    ...pinned,
    ...profile.earnedAchievements.filter((item) => !pinnedIds.has(item.id)),
  ].slice(0, 6);
}

function ProfileHero({
  profile,
  labels,
  themeMode,
  previewThemeId,
  previewBadgeKey,
  headingRef,
}: {
  profile: PublicPlayerProfile;
  labels: CategoryLabels;
  themeMode: Theme;
  previewThemeId?: BackgroundThemeId | null;
  previewBadgeKey?: string | null;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const themeId =
    previewThemeId === undefined
      ? profile.showcase.profileThemeId
      : previewThemeId;
  const badgeKey =
    previewBadgeKey === undefined
      ? profile.showcase.featuredBadgeKey
      : previewBadgeKey ?? profile.showcase.featuredBadgeKey;
  const badge = profile.earnedBadges.find((item) => item.badgeKey === badgeKey);
  const fallbackRank = [...profile.categoryRanks].sort(
    (left, right) => right.rank - left.rank || right.xp - left.xp,
  )[0];
  const title = badge?.title ?? fallbackRank?.title ?? "Newcomer";
  const category = badge?.category ?? fallbackRank?.category;

  return (
    <section
      className={`public-profile-hero${themeId ? " has-profile-theme" : ""}`}
      data-profile-theme={themeId ?? undefined}
    >
      {themeId && (
        <span className="public-profile-theme-art" aria-hidden="true">
          <ThemeArtwork
            themeId={themeId}
            mode={themeMode}
            variant="preview"
          />
        </span>
      )}
      <span className="public-profile-hero-sheen" aria-hidden="true" />
      <span className="public-profile-avatar">
        <ProfileAvatarArtwork avatarKey={profile.player.avatarKey} />
      </span>
      <div className="public-profile-identity">
        <p className="eyebrow">{profile.isQa ? "QA profile" : "Player profile"}</p>
        <div className="public-profile-name-row">
          <h1 ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
            {profile.player.displayName}
          </h1>
          {profile.isQa && <QaStatusBadge />}
        </div>
        <p>
          {title}
          {category ? ` · ${labels[category].title}` : ""}
        </p>
      </div>
      <div className="public-profile-xp">
        <span>{profile.isQa ? "Simulated XP" : "Total XP"}</span>
        <strong>{formatPoints(profile.totalXp)}</strong>
      </div>
      {badgeKey && (
        <span className="public-profile-featured-badge" aria-label={title}>
          <RankBadgeArtwork badgeKey={badgeKey} eager />
        </span>
      )}
    </section>
  );
}

function ProfileActions({
  profile,
  busy,
  socialCompetitionBlocked,
  onAddFriend,
  onOpenFriends,
  onChallenge,
  onManage,
  onSignIn,
  onShare,
}: {
  profile: PublicPlayerProfile;
  busy: boolean;
  socialCompetitionBlocked: boolean;
  onAddFriend: () => void;
  onOpenFriends: () => void;
  onChallenge: () => void;
  onManage: () => void;
  onSignIn: () => void;
  onShare: () => void;
}) {
  const relationship = profile.relationship;
  if (profile.isQa || socialCompetitionBlocked) {
    return (
      <div className="public-profile-actions">
        <button className="secondary-button" type="button" onClick={onShare}>
          Share profile
        </button>
      </div>
    );
  }
  return (
    <div className="public-profile-actions">
      {relationship === "self" && (
        <button className="primary-button" type="button" onClick={onManage}>
          Customise public profile
        </button>
      )}
      {relationship === "signed_out" && (
        <button className="primary-button" type="button" onClick={onSignIn}>
          Sign in to add friend
        </button>
      )}
      {relationship === "none" && (
        <button
          className="primary-button"
          type="button"
          disabled={busy}
          onClick={onAddFriend}
        >
          {busy ? "Sending…" : "Add Friend"}
        </button>
      )}
      {relationship === "outgoing" && (
        <button className="secondary-button" type="button" disabled>
          Request pending
        </button>
      )}
      {relationship === "incoming" && (
        <button className="primary-button" type="button" onClick={onOpenFriends}>
          Respond in Friends
        </button>
      )}
      {relationship === "friend" && (
        <button className="primary-button" type="button" onClick={onChallenge}>
          Challenge
        </button>
      )}
      <button className="secondary-button" type="button" onClick={onShare}>
        Share profile
      </button>
    </div>
  );
}

export function PublicProfileScreen({
  profile,
  labels,
  themeMode,
  loading,
  unavailable,
  error,
  actionBusy,
  actionMessage,
  socialCompetitionBlocked,
  matchHistory,
  matchHistoryLoading,
  onAddFriend,
  onOpenFriends,
  onChallenge,
  onManage,
  onSignIn,
  onShare,
  onBack,
  headingRef,
}: {
  profile: PublicPlayerProfile | null;
  labels: CategoryLabels;
  themeMode: Theme;
  loading: boolean;
  unavailable: boolean;
  error: string;
  actionBusy: boolean;
  actionMessage: string;
  socialCompetitionBlocked: boolean;
  matchHistory: FriendMatchHistory | null;
  matchHistoryLoading: boolean;
  onAddFriend: () => void;
  onOpenFriends: () => void;
  onChallenge: () => void;
  onManage: () => void;
  onSignIn: () => void;
  onShare: () => void;
  onBack: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  if (loading) {
    return <p className="board-empty" role="status">Loading player profile…</p>;
  }

  if (unavailable || (!profile && !error)) {
    return (
      <section className="public-profile-screen public-profile-unavailable">
        <div className="results-hero">
          <p className="eyebrow">Player profile</p>
          <h1 ref={headingRef} tabIndex={-1}>Unavailable</h1>
          <p>This player profile is unavailable.</p>
        </div>
        <button className="secondary-button" type="button" onClick={onBack}>
          Back to leaderboard
        </button>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="public-profile-screen public-profile-unavailable">
        <p className="board-empty is-error" role="alert">{error}</p>
        <button className="secondary-button" type="button" onClick={onBack}>
          Back to leaderboard
        </button>
      </section>
    );
  }

  const featured = featuredAchievements(profile);
  const achievements = showAllAchievements
    ? profile.earnedAchievements
    : featured;

  return (
    <section className="public-profile-screen">
      <ProfileHero
        profile={profile}
        labels={labels}
        themeMode={themeMode}
        headingRef={headingRef}
      />

      <ProfileActions
        profile={profile}
        busy={actionBusy}
        socialCompetitionBlocked={socialCompetitionBlocked}
        onAddFriend={onAddFriend}
        onOpenFriends={onOpenFriends}
        onChallenge={onChallenge}
        onManage={onManage}
        onSignIn={onSignIn}
        onShare={onShare}
      />
      {profile.isQa && (
        <p className="public-profile-status qa-public-profile-note" role="status">
          QA account · Progress, badges and achievements shown here are simulated.
          Results are not ranked and social competition is disabled.
        </p>
      )}
      {(actionMessage || error) && (
        <p className="public-profile-status" role="status">
          {actionMessage || error}
        </p>
      )}

      <section className="public-profile-section" aria-labelledby="public-ranks-title">
        <div className="public-profile-section-heading">
          <div>
            <p className="eyebrow">Progress</p>
            <h2 id="public-ranks-title">Subject ranks</h2>
          </div>
          <span>
            {profile.earnedBadges.length} {profile.isQa ? "simulated" : "earned"}
          </span>
        </div>
        <ul className="public-profile-ranks">
          {profile.categoryRanks.map((rank) => {
            const badge = [...profile.earnedBadges]
              .reverse()
              .find((item) => item.category === rank.category);
            return (
              <li key={rank.category}>
                <span className="public-profile-rank-icon">
                  {badge ? (
                    <RankBadgeArtwork badgeKey={badge.badgeKey} eager />
                  ) : (
                    labels[rank.category].icon
                  )}
                </span>
                <span>
                  <strong>{labels[rank.category].title}</strong>
                  <small>
                    {rank.title}{rank.simulated ? " · Simulated" : ""}
                  </small>
                </span>
                <b>{rank.rank}</b>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="public-profile-section" aria-labelledby="public-achievements-title">
        <div className="public-profile-section-heading">
          <div>
            <p className="eyebrow">Showcase</p>
            <h2 id="public-achievements-title">Achievements</h2>
          </div>
          <span>
            {profile.earnedAchievements.length}{" "}
            {profile.isQa ? "simulated" : "earned"}
          </span>
        </div>
        {achievements.length ? (
          <ul className="public-profile-achievements">
            {achievements.map((achievement) => (
              <li key={achievement.id} className={`tier-${achievement.tier}`}>
                <span className="public-achievement-medal" aria-hidden="true" />
                <span>
                  <strong>{achievement.name}</strong>
                  <small>
                    {achievement.description}
                    {achievement.simulated ? " · Simulated" : ""}
                  </small>
                </span>
                {profile.showcase.pinnedAchievementIds.includes(achievement.id) && (
                  <span className="public-achievement-pinned">Pinned</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="public-profile-empty">No achievements earned yet.</p>
        )}
        {profile.earnedAchievements.length > 6 && (
          <button
            className="profile-section-action"
            type="button"
            onClick={() => setShowAllAchievements((current) => !current)}
          >
            {showAllAchievements ? "Show featured" : "See all earned"}
          </button>
        )}
      </section>

      {!profile.isQa && (
      <section className="public-profile-section" aria-labelledby="public-bests-title">
        <div className="public-profile-section-heading">
          <div>
            <p className="eyebrow">Career</p>
            <h2 id="public-bests-title">Personal bests</h2>
          </div>
        </div>
        <div className="public-profile-format-bests">
          <article>
            <span>Survival best</span>
            <strong>{formatPoints(profile.survival.bestRun)}</strong>
            <small>{profile.survival.attempts} attempts</small>
          </article>
          <article>
            <span>Daily best</span>
            <strong>{formatPoints(profile.daily.bestScore)}</strong>
            <small>{profile.daily.played} played</small>
          </article>
          <article>
            <span>Daily streak</span>
            <strong>{profile.daily.longestStreak}</strong>
            <small>longest run</small>
          </article>
        </div>
        {profile.classicBests.length ? (
          <ul className="public-profile-classic-bests">
            {profile.classicBests.map((best) => (
              <li key={best.category}>
                <span>
                  <strong>{categoryTitle(best.category, labels)}</strong>
                  <small>{best.correctAnswers} correct · {best.accuracy.toFixed(1)}%</small>
                </span>
                <span>
                  <b>{formatPoints(best.bestScore)}</b>
                  <small>{formatDate(best.bestDate)}</small>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="public-profile-empty">No Classic scores yet.</p>
        )}
      </section>
      )}

      {!profile.isQa &&
        !socialCompetitionBlocked &&
        profile.relationship === "friend" && (
        <section className="public-profile-section" aria-labelledby="head-to-head-title">
          <div className="public-profile-section-heading">
            <div>
              <p className="eyebrow">Private to you both</p>
              <h2 id="head-to-head-title">Head to head</h2>
            </div>
          </div>
          {matchHistoryLoading ? (
            <p className="public-profile-empty">Loading match history…</p>
          ) : matchHistory ? (
            <>
              <div className="public-profile-record">
                <span><strong>{matchHistory.record.wins}</strong> Wins</span>
                <span><strong>{matchHistory.record.losses}</strong> Losses</span>
                <span><strong>{matchHistory.record.draws}</strong> Draws</span>
                <span><strong>{matchHistory.record.currentWinStreak}</strong> Current streak</span>
                <span><strong>{matchHistory.record.bestWinStreak}</strong> Best streak</span>
              </div>
              <ul className="public-profile-matches">
                {matchHistory.matches.slice(0, 5).map((match) => (
                  <li key={match.id} className={`is-${match.outcome}`}>
                    <strong>{match.outcome === "win" ? "Won" : match.outcome === "loss" ? "Lost" : "Draw"}</strong>
                    <span>
                      {match.format === "survival"
                        ? "Survival"
                        : match.classicMode
                          ? categoryTitle(match.classicMode, labels)
                          : "Classic"}
                    </span>
                    <span>{formatPoints(match.myResult)}–{formatPoints(match.opponentResult)}</span>
                    <small>{formatDate(match.completedAt)}</small>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="public-profile-empty">No completed matches together yet.</p>
          )}
        </section>
      )}

      <div className="result-actions public-profile-bottom-actions">
        <button className="secondary-button" type="button" onClick={onBack}>
          Back to leaderboard
        </button>
      </div>
    </section>
  );
}

export function PublicProfileEditor({
  profile,
  progress,
  labels,
  themeMode,
  saving,
  message,
  onSave,
  onBack,
  headingRef,
}: {
  profile: PublicPlayerProfile;
  progress: PlayerProgress;
  labels: CategoryLabels;
  themeMode: Theme;
  saving: boolean;
  message: string;
  onSave: (draft: ProfileShowcaseDraft) => Promise<void>;
  onBack: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const [draft, setDraft] = useState<ProfileShowcaseDraft>({
    featuredBadgeKey: profile.showcase.customFeaturedBadgeKey,
    pinnedAchievementIds: profile.showcase.pinnedAchievementIds,
    profileThemeId: profile.showcase.customProfileThemeId,
  });
  const earnedAchievements = progress.achievements.filter((item) => item.earned);
  const rankByCategory = new Map(
    progress.categories.map((rank) => [rank.category, rank.rank]),
  );
  const availableThemes = BACKGROUND_THEMES.filter(
    (item) => (rankByCategory.get(item.gate.category) ?? 1) >= item.gate.rank,
  );
  const previewProfile = useMemo(
    () => ({
      ...profile,
      showcase: {
        ...profile.showcase,
        pinnedAchievementIds: draft.pinnedAchievementIds,
      },
    }),
    [draft.pinnedAchievementIds, profile],
  );

  function toggleAchievement(id: string) {
    setDraft((current) => {
      const selected = current.pinnedAchievementIds.includes(id);
      if (selected) {
        return {
          ...current,
          pinnedAchievementIds: current.pinnedAchievementIds.filter(
            (item) => item !== id,
          ),
        };
      }
      if (current.pinnedAchievementIds.length >= 3) return current;
      return {
        ...current,
        pinnedAchievementIds: [...current.pinnedAchievementIds, id],
      };
    });
  }

  return (
    <section className="public-profile-editor">
      <div className="public-profile-editor-heading">
        <p className="eyebrow">Your public identity</p>
        <h1 ref={headingRef} tabIndex={-1}>Customise profile</h1>
        <p>Preview changes here. Nothing is public until you save.</p>
      </div>

      <div className="public-profile-editor-layout">
        <div className="public-profile-preview" aria-label="Profile preview">
          <span className="public-profile-preview-label">Live preview</span>
          <ProfileHero
            profile={previewProfile}
            labels={labels}
            themeMode={themeMode}
            previewThemeId={draft.profileThemeId}
            previewBadgeKey={draft.featuredBadgeKey}
          />
        </div>

        <div className="public-profile-controls">
          <fieldset>
            <legend>Profile banner</legend>
            <label className="public-profile-choice">
              <input
                type="radio"
                name="profile-theme"
                checked={draft.profileThemeId === null}
                onChange={() => setDraft((current) => ({ ...current, profileThemeId: null }))}
              />
              <span>Automatic gradient</span>
            </label>
            {availableThemes.map((item) => (
              <label className="public-profile-choice" key={item.id}>
                <input
                  type="radio"
                  name="profile-theme"
                  checked={draft.profileThemeId === item.id}
                  onChange={() => setDraft((current) => ({ ...current, profileThemeId: item.id }))}
                />
                <span>{item.name}</span>
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Featured title and badge</legend>
            <label className="public-profile-select-label">
              <span>Featured badge</span>
              <select
                value={draft.featuredBadgeKey ?? ""}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  featuredBadgeKey: event.target.value || null,
                }))}
              >
                <option value="">Automatic highest rank</option>
                {profile.earnedBadges.map((badge) => (
                  <option key={badge.badgeKey} value={badge.badgeKey}>
                    {labels[badge.category].title} · Rank {badge.rankFloor} · {badge.title}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <fieldset>
            <legend>Pinned achievements</legend>
            <p className="public-profile-pin-count">
              {draft.pinnedAchievementIds.length} of 3 selected
            </p>
            <div className="public-profile-pin-grid">
              {earnedAchievements.map((achievement) => {
                const selected = draft.pinnedAchievementIds.includes(achievement.id);
                const disabled = !selected && draft.pinnedAchievementIds.length >= 3;
                return (
                  <label
                    className={`public-profile-pin${selected ? " is-selected" : ""}`}
                    key={achievement.id}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleAchievement(achievement.id)}
                    />
                    <span>
                      <strong>{achievement.name}</strong>
                      <small>{achievement.description}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      </div>

      <div className="result-actions public-profile-editor-actions">
        <button className="secondary-button" type="button" onClick={onBack} disabled={saving}>
          Cancel
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={saving}
          onClick={() => void onSave({
            featuredBadgeKey: null,
            pinnedAchievementIds: [],
            profileThemeId: null,
          })}
        >
          Reset to Automatic
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={saving}
          onClick={() => void onSave(draft)}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
      <p className="public-profile-status" role="status">{message}</p>
    </section>
  );
}

export function PublicProfileEditorState({
  loading,
  error,
  onBack,
  headingRef,
}: {
  loading: boolean;
  error: string;
  onBack: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <section
      className="public-profile-editor public-profile-editor-state"
      aria-busy={loading}
    >
      <div className="public-profile-editor-state-card">
        <p className="eyebrow">Your public identity</p>
        <h1 ref={headingRef} tabIndex={-1}>
          Customise profile
        </h1>
        {loading ? (
          <p role="status">
            Loading your earned titles, achievements and profile themes…
          </p>
        ) : (
          <p className="is-error" role="alert">
            {error || "Your public profile could not be opened. Please try again."}
          </p>
        )}
      </div>
      <div className="result-actions public-profile-editor-state-actions">
        <button className="secondary-button" type="button" onClick={onBack}>
          Go back
        </button>
      </div>
    </section>
  );
}
