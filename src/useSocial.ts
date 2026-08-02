import { useCallback, useEffect, useState } from "react";
import {
  EMPTY_SOCIAL_DASHBOARD,
  blockPlayer,
  cancelGameChallenge,
  createGameChallenge,
  declineGameChallenge,
  fetchFriendMatchHistory,
  fetchGameChallenge,
  fetchGameChallengeDeck,
  fetchSocialDashboard,
  markSocialSeen,
  removeFriend,
  respondFriendRequest,
  searchPlayerExact,
  sendFriendRequest,
  submitGameChallenge,
  unblockPlayer,
  type ChallengeFormat,
  type FriendSearchResult,
} from "../lib/social";
import type { RoundGuess } from "../lib/leaderboard";
import type { GameMode } from "../lib/types";

type LoadedSocial = {
  playerId: string;
  dashboard: typeof EMPTY_SOCIAL_DASHBOARD;
};

type LoadedSearch = {
  playerId: string;
  result: FriendSearchResult | null;
};

/**
 * Social data is refreshed only at deliberate product moments: authentication,
 * opening Friends, actions, submissions and challenge links. V1 deliberately
 * has neither polling nor Realtime subscriptions.
 */
export function useSocial(playerId: string | null) {
  const [loaded, setLoaded] = useState<LoadedSocial | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedSearch, setLoadedSearch] = useState<LoadedSearch | null>(null);
  const [searching, setSearching] = useState(false);

  const current = playerId && loaded?.playerId === playerId ? loaded : null;
  const dashboard = current?.dashboard ?? EMPTY_SOCIAL_DASHBOARD;
  const searchResult =
    playerId && loadedSearch?.playerId === playerId
      ? loadedSearch.result
      : null;
  const ready = !playerId || current !== null;

  const refresh = useCallback(async () => {
    if (!playerId) return EMPTY_SOCIAL_DASHBOARD;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchSocialDashboard();
      setLoaded({ playerId, dashboard: next });
      return next;
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Could not load friends.";
      setError(message);
      throw caught;
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void refresh().catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [playerId, refresh]);

  const enterFriends = useCallback(async () => {
    if (!playerId) return;
    await markSocialSeen();
    await refresh();
  }, [playerId, refresh]);

  const mutate = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T> => {
      setError(null);
      try {
        const result = await operation();
        await refresh();
        return result;
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "That action failed.";
        setError(message);
        throw caught;
      }
    },
    [refresh],
  );

  const search = useCallback(
    async (name: string) => {
      if (!playerId) return null;
      setSearching(true);
      setError(null);
      try {
        const result = await searchPlayerExact(name);
        setLoadedSearch({ playerId, result });
        return result;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Search failed.");
        throw caught;
      } finally {
        setSearching(false);
      }
    },
    [playerId],
  );

  return {
    ready,
    loading,
    error,
    dashboard,
    unreadCount: dashboard.unreadCount,
    searchResult,
    searching,
    clearSearch: () => {
      if (playerId) setLoadedSearch({ playerId, result: null });
    },
    refresh,
    enterFriends,
    search,
    sendRequest: (name: string) =>
      mutate(async () => {
        await sendFriendRequest(name);
        if (playerId) setLoadedSearch({ playerId, result: null });
      }),
    respondRequest: (friendshipId: string, accept: boolean) =>
      mutate(() => respondFriendRequest(friendshipId, accept)),
    removeFriend: (friendId: string) => mutate(() => removeFriend(friendId)),
    blockPlayer: (targetId: string) => mutate(() => blockPlayer(targetId)),
    unblockPlayer: (targetId: string) => mutate(() => unblockPlayer(targetId)),
    createChallenge: (
      friendId: string,
      format: ChallengeFormat,
      classicMode: GameMode | null,
    ) => mutate(() => createGameChallenge(friendId, format, classicMode)),
    loadChallenge: fetchGameChallenge,
    loadChallengeDeck: fetchGameChallengeDeck,
    submitChallenge: (
      challengeId: string,
      guesses: readonly RoundGuess[],
    ) => mutate(() => submitGameChallenge(challengeId, guesses)),
    cancelChallenge: (challengeId: string) =>
      mutate(() => cancelGameChallenge(challengeId)),
    declineChallenge: (challengeId: string) =>
      mutate(() => declineGameChallenge(challengeId)),
    loadMatchHistory: fetchFriendMatchHistory,
  };
}

export type SocialController = ReturnType<typeof useSocial>;
