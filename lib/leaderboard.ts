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

export type SubmittedRun = {
  runId: string;
  /** Questions beaten, as the server counted them — not as the client did. */
  survived: number;
  totalScore: number;
};

/** Which board is being looked at. Formats and subjects are separate axes. */
export type BoardScope =
  | { kind: "category"; mode: GameMode }
  | { kind: "daily"; date: string }
  | { kind: "survival" };

/** One row of "where do I stand", used by the board picker. */
export type Standing = {
  scope: BoardScope;
  label: string;
  rank: number | null;
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
 * Claims a display name for the signed-in account. Requires a confirmed
 * address: the row level security policy on profiles enforces the same rule,
 * so this check only exists to give a clearer message than a policy violation.
 */
export async function joinLeaderboard(name: string): Promise<PlayerProfile> {
  const supabaseClient = client();
  const displayName = name.trim();

  const invalid = displayNameError(displayName);
  if (invalid) throw new Error(invalid);

  const { data: sessionData } = await supabaseClient.auth.getSession();
  const user = sessionData.session?.user;
  const userId = user?.id;

  if (!userId) {
    throw new Error("Sign in to claim a name on the leaderboard.");
  }

  if (!(user?.email_confirmed_at ?? user?.confirmed_at)) {
    throw new Error("Confirm your email address first.");
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

/**
 * Records a finished daily. Unlike submitRound this names a calendar day, not a
 * mode: the server checks the guesses against that day's published set and
 * files the round on the per-day board.
 */
export async function submitDailyRound(
  date: string,
  guesses: readonly RoundGuess[],
): Promise<SubmittedRound> {
  const { data, error } = await client().rpc("submit_daily_round", {
    p_date: date,
    p_guesses: guesses,
  });

  if (error) throw new Error(error.message);

  const result = data as { round_id: string; total_score: number } | null;
  if (!result) throw new Error("The round was not recorded.");
  return { roundId: result.round_id, totalScore: result.total_score };
}

/**
 * Records a finished survival run: every guess in order, ending with the one
 * that killed it. The server re-judges each guess against its own window
 * schedule and rejects a run that did not end in a miss, so the number it
 * returns is the authoritative one.
 */
export async function submitSurvivalRun(
  guesses: readonly RoundGuess[],
): Promise<SubmittedRun> {
  const { data, error } = await client().rpc("submit_survival_run", {
    p_guesses: guesses,
  });

  if (error) throw new Error(error.message);

  const result = data as {
    run_id: string;
    survived: number;
    total_score: number;
  } | null;
  if (!result) throw new Error("The run was not recorded.");
  return {
    runId: result.run_id,
    survived: result.survived,
    totalScore: result.total_score,
  };
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

/**
 * The board for one day's puzzle. Ranked within the date only — two dailies
 * are different puzzles — so callers always name the day they want. `attempts`
 * maps onto roundsPlayed: each attempt at the puzzle is one round.
 */
export async function fetchDailyLeaderboard(
  date: string,
  limit = 10,
): Promise<LeaderboardRow[]> {
  const { data, error } = await client()
    .from("daily_leaderboard")
    .select("player_id, display_name, best_score, attempts, rank")
    .eq("puzzle_date", date)
    .order("best_score", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    playerId: row.player_id,
    displayName: row.display_name,
    bestScore: row.best_score,
    roundsPlayed: row.attempts,
    rank: row.rank,
  }));
}

/**
 * The survival board. `bestScore` carries questions survived rather than
 * points — a different number, which is exactly why survival has a board of
 * its own rather than a column on the category one.
 */
export async function fetchSurvivalLeaderboard(
  limit = 10,
): Promise<LeaderboardRow[]> {
  const { data, error } = await client()
    .from("survival_leaderboard")
    .select("player_id, display_name, best_run, attempts, rank")
    .order("best_run", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    playerId: row.player_id,
    displayName: row.display_name,
    bestScore: row.best_run,
    roundsPlayed: row.attempts,
    rank: row.rank,
  }));
}

/**
 * Where the player stands on every board at once, for the board picker.
 *
 * Three queries rather than eleven: the category view holds one row per player
 * per mode, so a single filter on player_id covers all nine subjects. A board
 * the player has never placed on simply reports a null rank.
 */
export async function fetchMyStandings(
  playerId: string,
  dailyDate: string,
): Promise<{
  categories: Partial<Record<GameMode, number>>;
  daily: number | null;
  survival: number | null;
}> {
  const supabaseClient = client();

  const [categoryRows, dailyRows, survivalRows] = await Promise.all([
    supabaseClient
      .from("leaderboard")
      .select("mode, rank")
      .eq("player_id", playerId),
    supabaseClient
      .from("daily_leaderboard")
      .select("rank")
      .eq("player_id", playerId)
      .eq("puzzle_date", dailyDate)
      .maybeSingle(),
    supabaseClient
      .from("survival_leaderboard")
      .select("rank")
      .eq("player_id", playerId)
      .maybeSingle(),
  ]);

  if (categoryRows.error) throw new Error(categoryRows.error.message);

  const categories: Partial<Record<GameMode, number>> = {};
  for (const row of categoryRows.data ?? []) {
    categories[row.mode as GameMode] = row.rank;
  }

  // A missing standing is not an error: it just means "never placed here".
  return {
    categories,
    daily: dailyRows.data?.rank ?? null,
    survival: survivalRows.data?.rank ?? null,
  };
}

/**
 * The row immediately above the player on a board, so the standing card can
 * say how far off the next place is. Null when they are already top, or when
 * the board does not have them.
 */
export function rowAbove(
  rows: readonly LeaderboardRow[],
  playerId: string,
): LeaderboardRow | null {
  const index = rows.findIndex((row) => row.playerId === playerId);
  if (index <= 0) return null;
  return rows[index - 1];
}
