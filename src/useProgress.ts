import { useCallback, useEffect, useRef, useState } from "react";
import {
  type PlayerProgress,
  type ProgressChange,
  diffProgress,
  fetchProgress,
} from "../lib/progress";
import { leaderboardEnabled } from "../lib/supabase";

/**
 * Owns the signed-in player's progression, and nothing else. Like
 * useLeaderboard it never polls: progress is read when an account appears and
 * again when a round has been recorded, because those are the only two moments
 * it can have changed.
 */
export function useProgress(playerId: string | null) {
  // Keyed by account so a previous sign-in's ranks are never shown to the
  // next one, exactly as useLeaderboard keys its profile.
  const [loaded, setLoaded] = useState<{
    playerId: string;
    progress: PlayerProgress;
  } | null>(null);
  // Keyed the same way, and for the same reason: deriving it per account means
  // signing out never needs to clear it, which would be a setState inside an
  // effect and a cascading render.
  const [lastChange, setLastChange] = useState<{
    playerId: string;
    change: ProgressChange;
  } | null>(null);

  // The snapshot a refresh will be diffed against. Held in a ref rather than
  // state so recording a round cannot race a re-render into comparing a
  // snapshot with itself.
  const baseline = useRef<PlayerProgress | null>(null);

  const forThisPlayer =
    playerId && loaded?.playerId === playerId ? loaded : null;
  const progress = forThisPlayer?.progress ?? null;
  const change =
    playerId && lastChange?.playerId === playerId ? lastChange.change : null;

  useEffect(() => {
    if (!leaderboardEnabled || !playerId) {
      baseline.current = null;
      return;
    }
    let cancelled = false;

    fetchProgress(playerId)
      .then((found) => {
        if (cancelled) return;
        baseline.current = found;
        setLoaded({ playerId, progress: found });
      })
      .catch(() => {
        // Progress that cannot be read must never block play; the account
        // screen simply shows nothing until the next attempt succeeds.
        if (!cancelled) setLoaded(null);
      });

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  /**
   * Re-reads after a round and reports what moved. Returns the change so a
   * caller can await it, and stores it so the ribbon can render.
   */
  const refresh = useCallback(async (): Promise<ProgressChange | null> => {
    if (!leaderboardEnabled || !playerId) return null;

    try {
      const found = await fetchProgress(playerId);
      const moved = diffProgress(baseline.current, found);
      baseline.current = found;
      setLoaded({ playerId, progress: found });
      setLastChange({ playerId, change: moved });
      return moved;
    } catch {
      // A failed refresh leaves the last good snapshot in place.
      return null;
    }
  }, [playerId]);

  const clearChange = useCallback(() => setLastChange(null), []);

  return {
    enabled: leaderboardEnabled,
    progress,
    /** Rank-ups and achievements earned by the round just recorded. */
    change,
    refresh,
    clearChange,
  };
}
