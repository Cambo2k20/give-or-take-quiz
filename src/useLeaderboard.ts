import { useCallback, useEffect, useState } from "react";
import {
  type LeaderboardRow,
  type PlayerProfile,
  type RoundGuess,
  currentProfile,
  fetchLeaderboard,
  joinLeaderboard,
  submitRound,
} from "../lib/leaderboard";
import { leaderboardEnabled } from "../lib/supabase";
import type { GameMode } from "../lib/types";

export type SubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent"; totalScore: number }
  | { status: "failed"; message: string };

/**
 * Owns the player's identity and every leaderboard call. Nothing here runs on
 * a timer or polls: the board is fetched when someone asks to see it, and a
 * round is published only once the player has chosen a name.
 */
export function useLeaderboard() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [ready, setReady] = useState(!leaderboardEnabled);
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  // Signed out, this only reads the stored session and makes no request.
  useEffect(() => {
    if (!leaderboardEnabled) return;
    let cancelled = false;

    currentProfile()
      .then((found) => {
        if (!cancelled) setProfile(found);
      })
      .catch(() => {
        // A profile that cannot be read is indistinguishable from not having
        // one yet, and either way the game is still playable.
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const join = useCallback(async (name: string) => {
    const joined = await joinLeaderboard(name);
    setProfile(joined);
    return joined;
  }, []);

  const publish = useCallback(
    async (mode: GameMode, guesses: readonly RoundGuess[]) => {
      setSubmit({ status: "sending" });
      try {
        const result = await submitRound(mode, guesses);
        setSubmit({ status: "sent", totalScore: result.totalScore });
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not save your score.";
        setSubmit({ status: "failed", message });
        return null;
      }
    },
    [],
  );

  const loadBoard = useCallback(async (mode: GameMode) => {
    setBoardLoading(true);
    setBoardError(null);
    try {
      setBoard(await fetchLeaderboard(mode));
    } catch (error) {
      setBoardError(
        error instanceof Error ? error.message : "Could not load the board.",
      );
    } finally {
      setBoardLoading(false);
    }
  }, []);

  const resetSubmit = useCallback(() => setSubmit({ status: "idle" }), []);

  return {
    enabled: leaderboardEnabled,
    ready,
    profile,
    join,
    publish,
    submit,
    resetSubmit,
    board,
    boardLoading,
    boardError,
    loadBoard,
  };
}
