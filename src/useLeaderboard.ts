import { useCallback, useEffect, useState } from "react";
import {
  type LeaderboardRow,
  type PlayerProfile,
  type ProfileAvatarKey,
  type RoundGuess,
  type SubmittedRound,
  currentProfile,
  fetchClassicLeaderboard,
  fetchDailyLeaderboard,
  fetchLeaderboard,
  fetchMyDailyRank,
  fetchMyOfficialDaily,
  fetchSurvivalLeaderboard,
  joinLeaderboard,
  submitDailyRound,
  submitRound,
  submitSurvivalRun,
  updateProfileAvatar,
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
export function useLeaderboard(userId: string | null) {
  // Keyed by account, so the profile belonging to a previous sign-in is never
  // shown to the next one. Deriving both profile and ready from this keeps the
  // signed-out case out of the effect entirely.
  const [loaded, setLoaded] = useState<{
    userId: string;
    profile: PlayerProfile | null;
  } | null>(null);
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  const forThisUser = userId && loaded?.userId === userId ? loaded : null;
  const profile = forThisUser?.profile ?? null;
  const ready = !leaderboardEnabled || !userId || forThisUser !== null;

  // Only ever fetches for a signed-in account, and only from a callback, so no
  // state is set synchronously while rendering.
  useEffect(() => {
    if (!leaderboardEnabled || !userId) return;
    let cancelled = false;

    currentProfile()
      .then((found) => {
        if (!cancelled) setLoaded({ userId, profile: found });
      })
      .catch(() => {
        // A profile that cannot be read is indistinguishable from not having
        // one yet, and either way the game is still playable.
        if (!cancelled) setLoaded({ userId, profile: null });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const join = useCallback(async (name: string) => {
    const joined = await joinLeaderboard(name);
    setLoaded({ userId: joined.id, profile: joined });
    return joined;
  }, []);

  const updateAvatar = useCallback(
    async (avatarKey: ProfileAvatarKey) => {
      if (!userId) throw new Error("Sign in to change your avatar.");
      await updateProfileAvatar(avatarKey);
      setLoaded((current) =>
        current?.userId === userId && current.profile
          ? {
              ...current,
              profile: { ...current.profile, avatarKey },
            }
          : current,
      );
    },
    [userId],
  );

  // Category and daily rounds go to different server calls but share the one
  // submit state: only a single round can be on the results screen at a time.
  // Generic so a daily submission keeps its extra fields (isOfficial,
  // officialScore) rather than being narrowed to the base shape.
  const record = useCallback(
    async <T extends SubmittedRound>(
      send: () => Promise<T>,
    ): Promise<T | null> => {
      setSubmit({ status: "sending" });
      try {
        const result = await send();
        setSubmit({ status: "sent", totalScore: result.totalScore });
        return result;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not save your score.";
        setSubmit({ status: "failed", message });
        return null;
      }
    },
    [],
  );

  const publish = useCallback(
    (mode: GameMode, guesses: readonly RoundGuess[]) =>
      record(() => submitRound(mode, guesses)),
    [record],
  );

  const publishDaily = useCallback(
    (date: string, guesses: readonly RoundGuess[]) =>
      record(() => submitDailyRound(date, guesses)),
    [record],
  );

  // Checked before a signed-in player starts today's puzzle, so a device that
  // has not played yet finds out an official result already exists — on this
  // device or another — instead of discovering it only after a submission
  // loses the race for the official slot.
  const checkDailyOfficial = useCallback(
    (playerId: string, date: string) => fetchMyOfficialDaily(playerId, date),
    [],
  );

  const myDailyRank = useCallback(
    (playerId: string, date: string) => fetchMyDailyRank(playerId, date),
    [],
  );

  // The run's own count of questions survived is discarded in favour of the
  // server's, which re-judged every guess against its own window schedule.
  const publishSurvival = useCallback(
    (guesses: readonly RoundGuess[]) =>
      record(async () => {
        const run = await submitSurvivalRun(guesses);
        return { roundId: run.runId, totalScore: run.survived };
      }),
    [record],
  );

  // The board state is shared the same way: the leaderboard screen shows one
  // board at a time, whether it belongs to a category or to a calendar day.
  const showBoard = useCallback(
    async (fetchRows: () => Promise<LeaderboardRow[]>) => {
      setBoardLoading(true);
      setBoardError(null);
      try {
        setBoard(await fetchRows());
      } catch (error) {
        setBoardError(
          error instanceof Error ? error.message : "Could not load the board.",
        );
      } finally {
        setBoardLoading(false);
      }
    },
    [],
  );

  const loadBoard = useCallback(
    (mode: GameMode) => showBoard(() => fetchLeaderboard(mode)),
    [showBoard],
  );

  const loadClassicBoard = useCallback(
    () => showBoard(() => fetchClassicLeaderboard()),
    [showBoard],
  );

  const loadDailyBoard = useCallback(
    (date: string) => showBoard(() => fetchDailyLeaderboard(date)),
    [showBoard],
  );

  const loadSurvivalBoard = useCallback(
    () => showBoard(() => fetchSurvivalLeaderboard()),
    [showBoard],
  );

  const resetSubmit = useCallback(() => setSubmit({ status: "idle" }), []);

  return {
    enabled: leaderboardEnabled,
    ready,
    profile,
    join,
    updateAvatar,
    publish,
    publishDaily,
    checkDailyOfficial,
    myDailyRank,
    publishSurvival,
    submit,
    resetSubmit,
    board,
    boardLoading,
    boardError,
    loadBoard,
    loadClassicBoard,
    loadDailyBoard,
    loadSurvivalBoard,
  };
}
