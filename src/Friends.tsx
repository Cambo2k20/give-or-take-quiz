import { useEffect, useMemo, useState, type RefObject } from "react";
import {
  challengeOutcome,
  type ChallengeFormat,
  type ChallengeSummary,
  type FriendMatchHistory,
  type FriendProfile,
  type Friendship,
  type MatchOutcome,
} from "../lib/social";
import type { GameMode } from "../lib/types";
import type { SocialController } from "./useSocial";
import { formatPoints } from "./questionText";
import { ProfileAvatarArtwork } from "./Progress";

const CLASSIC_MODES: readonly GameMode[] = [
  "population",
  "history",
  "geography",
  "science",
  "animals",
  "space",
  "technology",
  "movies",
  "mixed",
];

type FriendsScreenProps = {
  social: SocialController;
  modeLabels: Record<GameMode, string>;
  initialChallengeId: string | null;
  initialSetupFriend?: FriendProfile | null;
  externalError?: string;
  onPlayChallenge: (challenge: ChallengeSummary) => void;
  onBack: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
};

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDeadline(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatName(
  challenge: Pick<ChallengeSummary, "format" | "classicMode">,
  labels: Record<GameMode, string>,
) {
  if (challenge.format === "survival") return "Survival";
  return `${labels[challenge.classicMode ?? "mixed"]} Classic`;
}

function formatResult(format: ChallengeFormat, result: number | null): string {
  if (result === null) return "Not played";
  return format === "survival"
    ? `${formatPoints(result)} survived`
    : `${formatPoints(result)} points`;
}

function outcomeLabel(outcome: MatchOutcome | null): string {
  if (outcome === "win") return "Won";
  if (outcome === "loss") return "Lost";
  if (outcome === "draw") return "Draw";
  return "";
}

function PlayerIdentity({ player }: { player: FriendProfile }) {
  return (
    <span className="friend-identity">
      <span className="friend-avatar" aria-hidden="true">
        <ProfileAvatarArtwork avatarKey={player.avatarKey} />
      </span>
      <strong>{player.displayName}</strong>
    </span>
  );
}

function RecordLine({ friendship }: { friendship: Friendship }) {
  const { record } = friendship;
  return (
    <span className="friend-record-line">
      <span>{record.wins} W</span>
      <span>{record.losses} L</span>
      <span>{record.draws} D</span>
      {record.currentWinStreak > 0 && (
        <span className="friend-streak">
          {record.currentWinStreak} win streak
        </span>
      )}
    </span>
  );
}

function ChallengeCard({
  challenge,
  labels,
  onPlay,
  onCancel,
  onDecline,
  onHistory,
}: {
  challenge: ChallengeSummary;
  labels: Record<GameMode, string>;
  onPlay?: () => void;
  onCancel?: () => void;
  onDecline?: () => void;
  onHistory?: () => void;
}) {
  const outcome = challengeOutcome(challenge);
  const canPlay =
    (challenge.role === "challenger" && challenge.state === "draft") ||
    (challenge.role === "recipient" && challenge.state === "pending");
  return (
    <article className={`challenge-card state-${challenge.state}`}>
      <div className="challenge-card-head">
        <PlayerIdentity player={challenge.opponent} />
        <span className="challenge-format">
          {formatName(challenge, labels)}
        </span>
      </div>

      {challenge.state === "draft" && (
        <p>You chose the deck. Finish your round before the invite is sent.</p>
      )}
      {challenge.state === "pending" && challenge.role === "recipient" && (
        <p>
          Your opponent has finished. Their result stays hidden until you play.
        </p>
      )}
      {challenge.state === "pending" && challenge.role === "challenger" && (
        <p>
          Waiting for {challenge.opponent.displayName}. Expires{" "}
          {formatDeadline(challenge.expiresAt)}.
        </p>
      )}
      {challenge.state === "completed" && (
        <div className="challenge-result-summary">
          <strong className={`match-outcome outcome-${outcome}`}>
            {outcomeLabel(outcome)}
          </strong>
          <span>
            You {formatResult(challenge.format, challenge.myResult)} ·{" "}
            {challenge.opponent.displayName}{" "}
            {formatResult(challenge.format, challenge.opponentResult)}
          </span>
        </div>
      )}
      {challenge.state === "expired" && (
        <p>This invite expired before both players finished.</p>
      )}

      <div className="challenge-card-actions">
        {canPlay && onPlay && (
          <button className="primary-button social-button" type="button" onClick={onPlay}>
            {challenge.state === "draft" ? "Resume challenge" : "Play challenge"}
          </button>
        )}
        {challenge.role === "challenger" &&
          (challenge.state === "draft" || challenge.state === "pending") &&
          onCancel && (
            <button className="secondary-button social-button" type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
        {challenge.role === "recipient" &&
          challenge.state === "pending" &&
          onDecline && (
            <button className="secondary-button social-button" type="button" onClick={onDecline}>
              Decline
            </button>
          )}
        {onHistory && (
          <button className="secondary-button social-button" type="button" onClick={onHistory}>
            Head-to-head
          </button>
        )}
      </div>
    </article>
  );
}

export function FriendsScreen({
  social,
  modeLabels,
  initialChallengeId,
  initialSetupFriend = null,
  externalError = "",
  onPlayChallenge,
  onBack,
  headingRef,
}: FriendsScreenProps) {
  const [searchName, setSearchName] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Friendship | null>(null);
  const [setupFriend, setSetupFriend] = useState<FriendProfile | null>(
    initialSetupFriend,
  );
  const [setupFormat, setSetupFormat] = useState<ChallengeFormat>("classic");
  const [setupMode, setSetupMode] = useState<GameMode>("mixed");
  const [history, setHistory] = useState<FriendMatchHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [linkedChallenge, setLinkedChallenge] =
    useState<ChallengeSummary | null>(null);
  const [linkMessage, setLinkMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [acting, setActing] = useState(false);
  const { enterFriends, loadChallenge } = social;

  useEffect(() => {
    void enterFriends().catch(() => undefined);
  }, [enterFriends]);

  useEffect(() => {
    let cancelled = false;
    if (!initialChallengeId) {
      queueMicrotask(() => {
        if (cancelled) return;
        setLinkedChallenge(null);
        setLinkMessage("");
      });
      return () => {
        cancelled = true;
      };
    }
    queueMicrotask(() => {
      if (!cancelled) setLinkMessage("Opening challenge…");
    });
    loadChallenge(initialChallengeId)
      .then((value) => {
        if (cancelled) return;
        setLinkedChallenge(value);
        setLinkMessage("");
      })
      .catch(() => {
        if (cancelled) return;
        setLinkedChallenge(null);
        setLinkMessage("This challenge is unavailable.");
      });
    return () => {
      cancelled = true;
    };
  }, [initialChallengeId, loadChallenge]);

  const linkedIsAlreadyListed = useMemo(
    () =>
      Boolean(
        linkedChallenge &&
          social.dashboard.activeChallenges.some(
            (item) => item.id === linkedChallenge.id,
          ),
      ),
    [linkedChallenge, social.dashboard.activeChallenges],
  );

  async function act(operation: () => Promise<unknown>, message: string) {
    setActing(true);
    setActionMessage("");
    try {
      await operation();
      setActionMessage(message);
    } catch (caught) {
      setActionMessage(
        caught instanceof Error ? caught.message : "That action failed.",
      );
    } finally {
      setActing(false);
    }
  }

  async function openHistory(friend: FriendProfile) {
    setHistoryLoading(true);
    setHistory(null);
    setSelectedFriend(
      social.dashboard.friends.find((item) => item.player.id === friend.id) ??
        null,
    );
    try {
      setHistory(await social.loadMatchHistory(friend.id));
    } catch (caught) {
      setActionMessage(
        caught instanceof Error ? caught.message : "Could not load match history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function startChallenge() {
    if (!setupFriend || acting) return;
    setActing(true);
    setActionMessage("");
    try {
      const id = await social.createChallenge(
        setupFriend.id,
        setupFormat,
        setupFormat === "classic" ? setupMode : null,
      );
      const challenge = await social.loadChallenge(id);
      onPlayChallenge(challenge);
    } catch (caught) {
      setActionMessage(
        caught instanceof Error ? caught.message : "Could not start challenge.",
      );
      setActing(false);
    }
  }

  if (setupFriend) {
    return (
      <section className="friends-screen">
        <div className="results-hero friends-hero">
          <p className="eyebrow">Challenge</p>
          <h1 ref={headingRef} tabIndex={-1}>Challenge {setupFriend.displayName}</h1>
          <p>Both of you get the exact same questions in the same order.</p>
        </div>

        <section className="social-panel challenge-setup" aria-label="Challenge setup">
          <PlayerIdentity player={setupFriend} />
          <div className="board-formats social-format-control" role="group" aria-label="Challenge format">
            <button
              type="button"
              className={`board-format${setupFormat === "classic" ? " is-current" : ""}`}
              aria-pressed={setupFormat === "classic"}
              onClick={() => setSetupFormat("classic")}
            >
              Classic
            </button>
            <button
              type="button"
              className={`board-format${setupFormat === "survival" ? " is-current" : ""}`}
              aria-pressed={setupFormat === "survival"}
              onClick={() => setSetupFormat("survival")}
            >
              Survival
            </button>
          </div>

          {setupFormat === "classic" && (
            <label className="social-select-label">
              Subject
              <select value={setupMode} onChange={(event) => setSetupMode(event.target.value as GameMode)}>
                {CLASSIC_MODES.map((mode) => (
                  <option key={mode} value={mode}>{modeLabels[mode]}</option>
                ))}
              </select>
            </label>
          )}

          <p className="social-note">
            You play first. The seven-day invite appears for {setupFriend.displayName} only after you finish.
          </p>
          <div className="result-actions social-actions">
            <button className="secondary-button" type="button" onClick={() => setSetupFriend(null)}>
              Back
            </button>
            <button className="primary-button" type="button" disabled={acting} onClick={() => void startChallenge()}>
              {acting ? "Building deck…" : "Start challenge"}
            </button>
          </div>
          <p className="social-status" role="status">{actionMessage}</p>
        </section>
      </section>
    );
  }

  if (history || historyLoading) {
    const player = history?.friend ?? selectedFriend?.player;
    return (
      <section className="friends-screen">
        <div className="results-hero friends-hero">
          <p className="eyebrow">Head-to-head</p>
          <h1 ref={headingRef} tabIndex={-1}>{player?.displayName ?? "Match history"}</h1>
        </div>
        {historyLoading || !history ? (
          <p className="board-empty" role="status">Loading match history…</p>
        ) : (
          <>
            <section className="social-panel head-to-head-summary">
              <div><strong>{history.record.wins}</strong><span>Won</span></div>
              <div><strong>{history.record.losses}</strong><span>Lost</span></div>
              <div><strong>{history.record.draws}</strong><span>Drawn</span></div>
              <div><strong>{history.record.currentWinStreak}</strong><span>Current streak</span></div>
              <div><strong>{history.record.bestWinStreak}</strong><span>Best streak</span></div>
            </section>
            <section className="social-section">
              <div className="section-heading">
                <h2>Match history</h2>
                <span>{history.record.played} played</span>
              </div>
              {history.matches.length === 0 ? (
                <p className="social-empty">No completed matches yet.</p>
              ) : (
                <ol className="match-history-list">
                  {history.matches.map((match) => (
                    <li key={match.id} className={`outcome-${match.outcome}`}>
                      <strong>{outcomeLabel(match.outcome)}</strong>
                      <span>{formatName({ format: match.format, classicMode: match.classicMode }, modeLabels)}</span>
                      <span>{formatResult(match.format, match.myResult)} · {formatResult(match.format, match.opponentResult)}</span>
                      <time dateTime={match.completedAt}>{formatDate(match.completedAt)}</time>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
        <div className="result-actions social-actions">
          <button className="secondary-button" type="button" onClick={() => { setHistory(null); setSelectedFriend(null); }}>
            Back to Friends
          </button>
          {player && (
            <button className="primary-button" type="button" onClick={() => setSetupFriend(player)}>
              Challenge again
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="friends-screen">
      <div className="results-hero friends-hero">
        <p className="eyebrow">Private matches</p>
        <h1 ref={headingRef} tabIndex={-1}>Friends</h1>
        <p>Find players by their exact leaderboard name, then challenge them when you are both ready.</p>
      </div>

      {linkMessage && <p className="social-link-message" role="status">{linkMessage}</p>}
      {linkedChallenge && !linkedIsAlreadyListed && (
        <section className="social-section">
          <div className="section-heading"><h2>Linked challenge</h2></div>
          <ChallengeCard
            challenge={linkedChallenge}
            labels={modeLabels}
            onPlay={() => onPlayChallenge(linkedChallenge)}
            onCancel={() => void act(async () => {
              await social.cancelChallenge(linkedChallenge.id);
              setLinkedChallenge(null);
            }, "Challenge cancelled.")}
            onDecline={() => void act(async () => {
              await social.declineChallenge(linkedChallenge.id);
              setLinkedChallenge(null);
            }, "Challenge declined.")}
            onHistory={() => void openHistory(linkedChallenge.opponent)}
          />
        </section>
      )}

      <section className="social-panel friend-search-panel">
        <div className="section-heading">
          <h2>Add a friend</h2>
          <span>Exact name only</span>
        </div>
        <form
          className="friend-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (searchName.trim()) void social.search(searchName);
          }}
        >
          <label>
            Leaderboard display name
            <input value={searchName} onChange={(event) => setSearchName(event.target.value)} maxLength={24} autoComplete="off" />
          </label>
          <button className="primary-button social-button" type="submit" disabled={social.searching || !searchName.trim()}>
            {social.searching ? "Searching…" : "Find player"}
          </button>
        </form>
        {social.searchResult ? (
          <div className="friend-search-result">
            <PlayerIdentity player={social.searchResult} />
            {social.searchResult.relationship === "none" ? (
              <button className="secondary-button social-button" type="button" disabled={acting} onClick={() => void act(() => social.sendRequest(social.searchResult!.displayName), "Friend request sent.")}>
                Add friend
              </button>
            ) : (
              <span className="social-pill">{social.searchResult.relationship === "friend" ? "Already friends" : `${social.searchResult.relationship} request`}</span>
            )}
          </div>
        ) : searchName && !social.searching && (
          <p className="social-note">Search uses the full display name; partial matches are not shown.</p>
        )}
      </section>

      {social.dashboard.incomingRequests.length > 0 && (
        <section className="social-section">
          <div className="section-heading"><h2>Friend requests</h2><span>{social.dashboard.incomingRequests.length} incoming</span></div>
          <ul className="social-list">
            {social.dashboard.incomingRequests.map((request) => (
              <li key={request.id}>
                <PlayerIdentity player={request.player} />
                <div className="social-row-actions">
                  <button className="primary-button social-button" type="button" disabled={acting} onClick={() => void act(() => social.respondRequest(request.id, true), `${request.player.displayName} is now your friend.`)}>Accept</button>
                  <button className="secondary-button social-button" type="button" disabled={acting} onClick={() => void act(() => social.respondRequest(request.id, false), "Request declined.")}>Decline</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {social.dashboard.outgoingRequests.length > 0 && (
        <section className="social-section">
          <div className="section-heading"><h2>Sent requests</h2><span>{social.dashboard.outgoingRequests.length} waiting</span></div>
          <ul className="social-list compact">
            {social.dashboard.outgoingRequests.map((request) => (
              <li key={request.id}><PlayerIdentity player={request.player} /><span className="social-pill">Pending</span></li>
            ))}
          </ul>
        </section>
      )}

      {social.dashboard.activeChallenges.length > 0 && (
        <section className="social-section">
          <div className="section-heading"><h2>Active challenges</h2><span>{social.dashboard.activeChallenges.length}</span></div>
          <div className="challenge-list">
            {social.dashboard.activeChallenges.map((item) => (
              <ChallengeCard
                key={item.id}
                challenge={item}
                labels={modeLabels}
                onPlay={() => onPlayChallenge(item)}
                onCancel={() => void act(() => social.cancelChallenge(item.id), "Challenge cancelled.")}
                onDecline={() => void act(() => social.declineChallenge(item.id), "Challenge declined.")}
                onHistory={() => void openHistory(item.opponent)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="social-section">
        <div className="section-heading"><h2>Your friends</h2><span>{social.dashboard.friends.length} of 100</span></div>
        {!social.ready ? (
          <p className="social-empty" role="status">Loading friends…</p>
        ) : social.dashboard.friends.length === 0 ? (
          <p className="social-empty">No friends yet. Add someone by their exact leaderboard name.</p>
        ) : (
          <ul className="friend-list">
            {social.dashboard.friends.map((item) => (
              <li key={item.friendshipId}>
                <button className="friend-main" type="button" onClick={() => void openHistory(item.player)}>
                  <PlayerIdentity player={item.player} />
                  <RecordLine friendship={item} />
                </button>
                <div className="social-row-actions">
                  <button className="primary-button social-button" type="button" onClick={() => setSetupFriend(item.player)}>Challenge</button>
                  <button className="secondary-button social-button" type="button" onClick={() => void openHistory(item.player)}>History</button>
                  <button className="social-text-button" type="button" disabled={acting} onClick={() => {
                    if (window.confirm(`Remove ${item.player.displayName} from your friends?`)) void act(() => social.removeFriend(item.player.id), "Friend removed.");
                  }}>Remove</button>
                  <button className="social-text-button is-danger" type="button" disabled={acting} onClick={() => {
                    if (window.confirm(`Block ${item.player.displayName}? They will not be able to find or challenge you.`)) void act(() => social.blockPlayer(item.player.id), "Player blocked.");
                  }}>Block</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {social.dashboard.recentResults.length > 0 && (
        <section className="social-section">
          <div className="section-heading"><h2>Recent results</h2><span>Last 20</span></div>
          <div className="challenge-list compact">
            {social.dashboard.recentResults.map((item) => (
              <ChallengeCard key={item.id} challenge={item} labels={modeLabels} onHistory={() => void openHistory(item.opponent)} />
            ))}
          </div>
        </section>
      )}

      {social.dashboard.blockedPlayers.length > 0 && (
        <details className="social-panel blocked-players">
          <summary>Blocked players ({social.dashboard.blockedPlayers.length})</summary>
          <ul className="social-list compact">
            {social.dashboard.blockedPlayers.map((player) => (
              <li key={player.id}><PlayerIdentity player={player} /><button className="secondary-button social-button" type="button" onClick={() => void act(() => social.unblockPlayer(player.id), `${player.displayName} unblocked.`)}>Unblock</button></li>
            ))}
          </ul>
        </details>
      )}

      <p className={`social-status${externalError || social.error ? " is-error" : ""}`} role="status">
        {externalError || social.error || actionMessage}
      </p>
      <div className="result-actions social-actions">
        <button className="secondary-button" type="button" onClick={onBack}>Back to account</button>
      </div>
    </section>
  );
}
