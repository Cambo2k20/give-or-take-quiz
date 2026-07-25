import { supabase } from "./supabase";
import type { GameMode } from "./types";

export type LeaderboardRow = {
  playerId: string;
  displayName: string;
  bestScore: number;
  roundsPlayed: number;
  rank: number;
};

export type PlayerProfile = {
  id: string;
  displayName: string;
};

export type SubmittedRound = {
  roundId: string;
  totalScore: number;
};

/** One answer as submit_round() expects it. */
export type RoundGuess = {
  question_id: string;
  guess: number;
};

export const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]*[A-Za-z0-9]$/;

/** Mirrors the profiles check constraints, so the UI can say no first. */
export function displayNameError(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Use at least 2 characters.";
  if (trimmed.length > 24) return "Keep it to 24 characters or fewer.";
  if (!DISPLAY_NAME_PATTERN.test(trimmed)) {
    return "Letters, numbers, spaces, hyphens and underscores only.";
  }
  return null;
}

function client() {
  if (!supabase) throw new Error("The leaderboard is not configured.");
  return supabase;
}

/**
 * The signed-in player's profile, or null if they have never joined. Reads the
 * stored session from the device, so this makes no network call when signed out.
 */
export async function currentProfile(): Promise<PlayerProfile | null> {
  if (!supabase) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return { id: data.id, displayName: data.display_name };
}

/**
 * Claims a display name, signing in anonymously first if needed. Anonymous
 * because the game asks for nothing else; a player who wants their scores on
 * another device can link an email later.
 */
export async function joinLeaderboard(name: string): Promise<PlayerProfile> {
  const supabaseClient = client();
  const displayName = name.trim();

  const invalid = displayNameError(displayName);
  if (invalid) throw new Error(invalid);

  const { data: sessionData } = await supabaseClient.auth.getSession();
  let userId = sessionData.session?.user.id;

  if (!userId) {
    const { data, error } = await supabaseClient.auth.signInAnonymously();
    if (error) throw new Error(error.message);
    userId = data.user?.id;
    if (!userId) throw new Error("Could not start a session.");
  }

  const { error } = await supabaseClient
    .from("profiles")
    .upsert({ id: userId, display_name: displayName }, { onConflict: "id" });

  if (error) {
    // 23505 is the case-insensitive unique index on display_name.
    if (error.code === "23505") {
      throw new Error(`"${displayName}" is taken. Try another name.`);
    }
    throw new Error(error.message);
  }

  return { id: userId, displayName };
}

/**
 * Records a finished round. The server rescores every guess, so the total it
 * returns is authoritative and may be trusted over the one held in the UI.
 */
export async function submitRound(
  mode: GameMode,
  guesses: readonly RoundGuess[],
): Promise<SubmittedRound> {
  const { data, error } = await client().rpc("submit_round", {
    p_mode: mode,
    p_guesses: guesses,
  });

  if (error) throw new Error(error.message);

  const result = data as { round_id: string; total_score: number } | null;
  if (!result) throw new Error("The round was not recorded.");
  return { roundId: result.round_id, totalScore: result.total_score };
}

export async function fetchLeaderboard(
  mode: GameMode,
  limit = 10,
): Promise<LeaderboardRow[]> {
  const { data, error } = await client()
    .from("leaderboard")
    .select("player_id, display_name, best_score, rounds_played, rank")
    .eq("mode", mode)
    .order("best_score", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    playerId: row.player_id,
    displayName: row.display_name,
    bestScore: row.best_score,
    roundsPlayed: row.rounds_played,
    rank: row.rank,
  }));
}
