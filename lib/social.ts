import { questions } from "./questions";
import { isQuestionCategory } from "./categories";
import {
  DEFAULT_PROFILE_AVATAR,
  isProfileAvatarKey,
  type ProfileAvatarKey,
  type RoundGuess,
} from "./leaderboard";
import { supabase } from "./supabase";
import type { GameMode, Question } from "./types";

export type FriendProfile = {
  id: string;
  displayName: string;
  avatarKey: ProfileAvatarKey;
};

export type Friendship = {
  friendshipId: string;
  player: FriendProfile;
  friendsSince: string;
  record: HeadToHeadRecord;
};

export type FriendRequest = {
  id: string;
  player: FriendProfile;
  createdAt: string;
};

export type FriendSearchResult = FriendProfile & {
  relationship: "none" | "friend" | "incoming" | "outgoing";
};

export type BlockedPlayer = FriendProfile & {
  blockedAt: string;
};

export type ChallengeFormat = "classic" | "survival";
export type ChallengeState =
  | "draft"
  | "pending"
  | "completed"
  | "declined"
  | "cancelled"
  | "expired";
export type ChallengeRole = "challenger" | "recipient";
export type MatchOutcome = "win" | "loss" | "draw";

export type ChallengeSummary = {
  id: string;
  format: ChallengeFormat;
  classicMode: GameMode | null;
  state: ChallengeState;
  role: ChallengeRole;
  opponent: FriendProfile;
  myResult: number | null;
  opponentResult: number | null;
  activatedAt: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type HeadToHeadRecord = {
  played: number;
  wins: number;
  losses: number;
  draws: number;
  currentWinStreak: number;
  bestWinStreak: number;
  lastPlayedAt: string | null;
};

export type MatchHistoryEntry = {
  id: string;
  format: ChallengeFormat;
  classicMode: GameMode | null;
  myResult: number;
  opponentResult: number;
  outcome: MatchOutcome;
  completedAt: string;
};

export type FriendMatchHistory = {
  friend: FriendProfile;
  record: HeadToHeadRecord;
  matches: MatchHistoryEntry[];
};

export type SocialDashboard = {
  unreadCount: number;
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  friends: Friendship[];
  activeChallenges: ChallengeSummary[];
  recentResults: ChallengeSummary[];
  blockedPlayers: BlockedPlayer[];
};

export type SubmittedChallenge = {
  challengeId: string;
  roundId: string;
  result: number;
  state: "pending" | "completed";
  challenge: ChallengeSummary;
};

type JsonObject = Record<string, unknown>;

const EMPTY_RECORD: HeadToHeadRecord = {
  played: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
  lastPlayedAt: null,
};

export const EMPTY_SOCIAL_DASHBOARD: SocialDashboard = {
  unreadCount: 0,
  incomingRequests: [],
  outgoingRequests: [],
  friends: [],
  activeChallenges: [],
  recentResults: [],
  blockedPlayers: [],
};

function client() {
  if (!supabase) throw new Error("Friends are not configured.");
  return supabase;
}

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function number(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : number(value);
}

function profile(value: unknown): FriendProfile {
  const row = object(value);
  return {
    id: text(row.id),
    displayName: text(row.display_name, "Unknown player"),
    avatarKey: isProfileAvatarKey(row.avatar_key)
      ? row.avatar_key
      : DEFAULT_PROFILE_AVATAR,
  };
}

function headToHead(value: unknown): HeadToHeadRecord {
  const row = object(value);
  return {
    played: number(row.played),
    wins: number(row.wins),
    losses: number(row.losses),
    draws: number(row.draws),
    currentWinStreak: number(row.current_win_streak),
    bestWinStreak: number(row.best_win_streak),
    lastPlayedAt: nullableText(row.last_played_at),
  };
}

function challenge(value: unknown): ChallengeSummary {
  const row = object(value);
  const classicMode =
    row.classic_mode === "mixed" || isQuestionCategory(row.classic_mode)
      ? row.classic_mode
      : null;
  return {
    id: text(row.id),
    format: row.format === "survival" ? "survival" : "classic",
    classicMode,
    state: text(row.state, "draft") as ChallengeState,
    role: row.role === "recipient" ? "recipient" : "challenger",
    opponent: profile(row.opponent),
    myResult: nullableNumber(row.my_result),
    opponentResult: nullableNumber(row.opponent_result),
    activatedAt: nullableText(row.activated_at),
    expiresAt: nullableText(row.expires_at),
    completedAt: nullableText(row.completed_at),
    createdAt: text(row.created_at),
  };
}

function friendRequest(value: unknown): FriendRequest {
  const row = object(value);
  return {
    id: text(row.id),
    player: profile(row.player),
    createdAt: text(row.created_at),
  };
}

function friendship(value: unknown): Friendship {
  const row = object(value);
  return {
    friendshipId: text(row.friendship_id),
    player: profile(row.player),
    friendsSince: text(row.friends_since),
    record: headToHead(row.record),
  };
}

function blockedPlayer(value: unknown): BlockedPlayer {
  const row = object(value);
  return {
    ...profile(row),
    blockedAt: text(row.blocked_at),
  };
}

async function call<T>(
  name: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await client().rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export function mapSocialDashboard(value: unknown): SocialDashboard {
  const row = object(value);
  return {
    unreadCount: number(row.unread_count),
    incomingRequests: array(row.incoming_requests).map(friendRequest),
    outgoingRequests: array(row.outgoing_requests).map(friendRequest),
    friends: array(row.friends).map(friendship),
    activeChallenges: array(row.active_challenges).map(challenge),
    recentResults: array(row.recent_results).map(challenge),
    blockedPlayers: array(row.blocked_players).map(blockedPlayer),
  };
}

export async function fetchSocialDashboard(): Promise<SocialDashboard> {
  return mapSocialDashboard(await call<unknown>("get_social_dashboard"));
}

export async function searchPlayerExact(
  displayName: string,
): Promise<FriendSearchResult | null> {
  const value = await call<unknown>("search_players_exact", {
    p_display_name: displayName.trim(),
  });
  if (!value) return null;
  const row = object(value);
  return {
    ...profile(row),
    relationship: text(row.relationship, "none") as FriendSearchResult["relationship"],
  };
}

export async function sendFriendRequest(displayName: string): Promise<void> {
  await call("send_friend_request", { p_display_name: displayName.trim() });
}

export async function respondFriendRequest(
  friendshipId: string,
  accept: boolean,
): Promise<void> {
  await call("respond_friend_request", {
    p_friendship_id: friendshipId,
    p_accept: accept,
  });
}

export async function removeFriend(friendId: string): Promise<void> {
  await call("remove_friend", { p_friend_id: friendId });
}

export async function blockPlayer(playerId: string): Promise<void> {
  await call("block_player", { p_player_id: playerId });
}

export async function unblockPlayer(playerId: string): Promise<void> {
  await call("unblock_player", { p_player_id: playerId });
}

export async function markSocialSeen(): Promise<void> {
  await call("mark_social_seen");
}

export async function createGameChallenge(
  friendId: string,
  format: ChallengeFormat,
  classicMode: GameMode | null,
): Promise<string> {
  const value = await call<unknown>("create_game_challenge", {
    p_friend_id: friendId,
    p_format: format,
    p_classic_mode: format === "classic" ? classicMode : null,
  });
  if (typeof value !== "string" || !value) {
    throw new Error("The challenge was not created.");
  }
  return value;
}

export async function fetchGameChallenge(
  challengeId: string,
): Promise<ChallengeSummary> {
  return challenge(await call<unknown>("get_game_challenge", {
    p_challenge_id: challengeId,
  }));
}

export async function fetchGameChallengeDeck(
  challengeId: string,
): Promise<Question[]> {
  const ids = await call<unknown>("get_game_challenge_deck", {
    p_challenge_id: challengeId,
  });
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    throw new Error("The challenge deck is unavailable.");
  }

  const byId = new Map(questions.map((item) => [item.id, item]));
  const deck = ids.map((id) => byId.get(id as string));
  if (deck.some((item) => !item)) {
    throw new Error("This challenge uses newer questions. Refresh the app.");
  }
  return deck as Question[];
}

export async function submitGameChallenge(
  challengeId: string,
  guesses: readonly RoundGuess[],
): Promise<SubmittedChallenge> {
  const row = object(
    await call<unknown>("submit_game_challenge", {
      p_challenge_id: challengeId,
      p_guesses: guesses,
    }),
  );
  const challengeIdResult = text(row.challenge_id);
  const roundId = text(row.round_id);
  if (!challengeIdResult || !roundId) {
    throw new Error("The challenge result was not recorded.");
  }
  return {
    challengeId: challengeIdResult,
    roundId,
    result: number(row.result),
    state: row.state === "completed" ? "completed" : "pending",
    challenge: challenge(row.challenge),
  };
}

export async function cancelGameChallenge(challengeId: string): Promise<void> {
  await call("cancel_game_challenge", { p_challenge_id: challengeId });
}

export async function declineGameChallenge(challengeId: string): Promise<void> {
  await call("decline_game_challenge", { p_challenge_id: challengeId });
}

export async function fetchFriendMatchHistory(
  friendId: string,
): Promise<FriendMatchHistory> {
  const row = object(
    await call<unknown>("get_friend_match_history", {
      p_friend_id: friendId,
      p_limit: 20,
    }),
  );
  return {
    friend: profile(row.friend),
    record: headToHead(row.record),
    matches: array(row.matches).map((value) => {
      const match = object(value);
      return {
        id: text(match.id),
        format: match.format === "survival" ? "survival" : "classic",
        classicMode:
          typeof match.classic_mode === "string"
            ? (match.classic_mode as GameMode)
            : null,
        myResult: number(match.my_result),
        opponentResult: number(match.opponent_result),
        outcome: text(match.outcome, "draw") as MatchOutcome,
        completedAt: text(match.completed_at),
      };
    }),
  };
}

export function challengeOutcome(
  challenge: Pick<ChallengeSummary, "state" | "myResult" | "opponentResult">,
): MatchOutcome | null {
  if (
    challenge.state !== "completed" ||
    challenge.myResult === null ||
    challenge.opponentResult === null
  ) {
    return null;
  }
  if (challenge.myResult > challenge.opponentResult) return "win";
  if (challenge.myResult < challenge.opponentResult) return "loss";
  return "draw";
}

export { EMPTY_RECORD };
