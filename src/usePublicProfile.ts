import { useCallback, useEffect, useState } from "react";
import {
  fetchPublicPlayerProfile,
  sendProfileFriendRequest,
  updateProfileShowcase,
  type ProfileShowcaseDraft,
  type PublicPlayerProfile,
} from "../lib/publicProfile";
import { leaderboardEnabled } from "../lib/supabase";

export function usePublicProfile(playerId: string | null) {
  const [loaded, setLoaded] = useState<{
    playerId: string;
    profile: PublicPlayerProfile | null;
  } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!leaderboardEnabled || !playerId) return null;
    setLoadingId(playerId);
    setError("");
    try {
      const profile = await fetchPublicPlayerProfile(playerId);
      setLoaded({ playerId, profile });
      return profile;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "This player profile could not be loaded.",
      );
      return null;
    } finally {
      setLoadingId(null);
    }
  }, [playerId]);

  useEffect(() => {
    if (!leaderboardEnabled || !playerId) return;
    let cancelled = false;

    fetchPublicPlayerProfile(playerId)
      .then((profile) => {
        if (!cancelled) setLoaded({ playerId, profile });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "This player profile could not be loaded.",
        );
        setLoaded({ playerId, profile: null });
      });

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const save = useCallback(async (draft: ProfileShowcaseDraft) => {
    setError("");
    try {
      const profile = await updateProfileShowcase(draft);
      setLoaded({ playerId: profile.player.id, profile });
      return profile;
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "The public profile could not be updated.";
      setError(message);
      throw new Error(message);
    }
  }, []);

  const addFriend = useCallback(async () => {
    if (!playerId) return;
    setError("");
    try {
      await sendProfileFriendRequest(playerId);
      await refresh();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "The request could not be sent.";
      setError(message);
      throw new Error(message);
    }
  }, [playerId, refresh]);

  const forThisPlayer =
    playerId && loaded?.playerId === playerId ? loaded.profile : null;
  const resolved = playerId && loaded?.playerId === playerId;

  return {
    enabled: leaderboardEnabled,
    profile: forThisPlayer,
    unavailable: Boolean(
      playerId &&
        (!leaderboardEnabled || (resolved && loaded?.profile === null)),
    ),
    loading: Boolean(
      leaderboardEnabled &&
        playerId &&
        (!resolved || loadingId === playerId),
    ),
    error,
    refresh,
    save,
    addFriend,
  };
}
