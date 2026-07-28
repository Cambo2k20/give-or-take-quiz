import { supabase } from "./supabase";
import type { GameMode, QuestionCategory } from "./types";

export const DEFAULT_PROFILE_AVATAR = "event-horizon" as const;
export const VOLCANO_PROFILE_AVATAR = "volcano" as const;
export const BUILT_IN_PROFILE_AVATARS = [
  DEFAULT_PROFILE_AVATAR,
  VOLCANO_PROFILE_AVATAR,
] as const;

type PaddedBadgeRank = "05" | "10" | "15" | "20" | "25" | "30";
export type ProfileAvatarKey =
  | (typeof BUILT_IN_PROFILE_AVATARS)[number]
  | `${QuestionCategory}-${PaddedBadgeRank}`;

const PROFILE_AVATAR_PATTERN =
  /^(population|history|geography|science|animals|space|technology|movies)-(05|10|15|20|25|30)$/;

export function isProfileAvatarKey(value: unknown): value is ProfileAvatarKey {
  return (
    BUILT_IN_PROFILE_AVATARS.includes(
      value as (typeof BUILT_IN_PROFILE_AVATARS)[number],
    ) ||
    (typeof value === "string" && PROFILE_AVATAR_PATTERN.test(value))
  );
}

export type LeaderboardRow = {
  playerId: string;
  displayName: string;
  bestScore: number;
  roundsPlayed: number;
  rank: number;
};

export type ClassicLeaderboardRow = LeaderboardRow & {
  category: GameMode;
  correctAnswers: number;
  accuracy: number;
  bestDate: string;
};

/**
 * One official daily result. `bestScore` carries the official score — the first
 * attempt inside the puzzle's window — rather than the best of several tries,
 * because a fixed set of five questions must not reward replaying it.
 * `roundsPlayed` counts every attempt, official and practice alike.
 */
export type DailyLeaderboardRow = LeaderboardRow & {
  puzzleDate: string;
  /** When the official attempt was filed; the tie-break above equal scores. */
  completedAt: string;
};

export type PlayerProfile = {
  id: string;
  displayName: string;
  avatarKey: ProfileAvatarKey;
};

export type SubmittedRound = {
  roundId: string;
  totalScore: number;
};

export type SubmittedDailyRound = SubmittedRound & {
  /** Whether this attempt is the one that counts for its date. */
  isOfficial: boolean;
  /** The score that counts for the date — may belong to an earlier attempt
   * than this one, when another attempt already claimed the official slot. */
  officialScore: number;
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
    .select("id, display_name, avatar_key")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    displayName: data.display_name,
    avatarKey: isProfileAvatarKey(data.avatar_key)
      ? data.avatar_key
      : DEFAULT_PROFILE_AVATAR,
  };
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

  return {
    id: userId,
    displayName,
    avatarKey: DEFAULT_PROFILE_AVATAR,
  };
}

/** Saves one of the built-in profile avatars on the signed-in player's row. */
export async function updateProfileAvatar(
  avatarKey: ProfileAvatarKey,
): Promise<void> {
  const supabaseClient = client();
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const userId = sessionData.session?.user.id;

  if (!userId) {
    throw new Error("Sign in to change your avatar.");
  }

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      avatar_key: avatarKey,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);
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
): Promise<SubmittedDailyRound> {
  const { data, error } = await client().rpc("submit_daily_round", {
    p_date: date,
    p_guesses: guesses,
  });

  if (error) throw new Error(error.message);

  const result = data as {
    round_id: string;
    total_score: number;
    is_official: boolean;
    official_score: number;
  } | null;
  if (!result) throw new Error("The round was not recorded.");
  return {
    roundId: result.round_id,
    totalScore: result.total_score,
    isOfficial: result.is_official,
    officialScore: result.official_score,
  };
}

/**
 * Whether this player already has an official result for `date`, checked
 * before they start playing. `daily_leaderboard` only ever holds official
 * rows, so a hit here means the slot is taken — on this device or another —
 * and the client should show the result rather than offer to play again.
 */
export async function fetchMyOfficialDaily(
  playerId: string,
  date: string,
): Promise<{ score: number; attempts: number } | null> {
  const { data, error } = await client()
    .from("daily_leaderboard")
    .select("score, attempts")
    .eq("player_id", playerId)
    .eq("puzzle_date", date)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return { score: data.score, attempts: data.attempts };
}

/**
 * The player's rank on one day's board, or null if they are not on it. A single
 * row rather than the whole board: the home screen only needs the number, and
 * loading the full board there would fight the leaderboard screen for the
 * shared board state.
 */
export async function fetchMyDailyRank(
  playerId: string,
  date: string,
): Promise<number | null> {
  const { data, error } = await client()
    .from("daily_leaderboard")
    .select("rank")
    .eq("player_id", playerId)
    .eq("puzzle_date", date)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.rank ?? null;
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
 * The default Classic board: one best round per player per category, ordered
 * across every category. Filtering is done client-side so switching the
 * category select is instant and does not create a collection of empty boards.
 */
export async function fetchClassicLeaderboard(
  limit = 100,
): Promise<ClassicLeaderboardRow[]> {
  const { data, error } = await client()
    .from("leaderboard")
    .select(
      "mode, player_id, display_name, best_score, rounds_played, rank, correct_answers, accuracy, best_date",
    )
    .order("best_score", { ascending: false })
    .order("best_date", { ascending: true })
    .limit(limit);

  if (error) {
    // Keep the checked-out app usable before the migration is applied to a
    // hosted project. These source tables are already deliberately public and
    // RLS-protected; the migration turns this work into one efficient view.
    if (
      error.message.includes("correct_answers") ||
      error.message.includes("best_date")
    ) {
      return fetchClassicLeaderboardFromSource(limit);
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    playerId: row.player_id,
    displayName: row.display_name,
    category: row.mode as GameMode,
    bestScore: row.best_score,
    roundsPlayed: row.rounds_played,
    rank: row.rank,
    correctAnswers: row.correct_answers,
    accuracy: Number(row.accuracy),
    bestDate: row.best_date,
  }));
}

async function fetchClassicLeaderboardFromSource(
  limit: number,
): Promise<ClassicLeaderboardRow[]> {
  const supabaseClient = client();
  const { data: rounds, error: roundsError } = await supabaseClient
    .from("game_rounds")
    .select("id, player_id, mode, total_score, question_count, created_at")
    .neq("mode", "daily")
    .neq("mode", "survival")
    .order("created_at", { ascending: true })
    .limit(1000);

  if (roundsError) throw new Error(roundsError.message);
  if (!rounds?.length) return [];

  const roundCount = new Map<string, number>();
  const bestRound = new Map<string, (typeof rounds)[number]>();
  for (const round of rounds) {
    const key = `${round.player_id}:${round.mode}`;
    roundCount.set(key, (roundCount.get(key) ?? 0) + 1);
    const best = bestRound.get(key);
    if (
      !best ||
      round.total_score > best.total_score ||
      (round.total_score === best.total_score &&
        new Date(round.created_at).getTime() <
          new Date(best.created_at).getTime())
    ) {
      bestRound.set(key, round);
    }
  }

  const bestRounds = [...bestRound.values()];
  const playerIds = [...new Set(bestRounds.map((round) => round.player_id))];
  const roundIds = bestRounds.map((round) => round.id);
  const [profilesResult, answersResult] = await Promise.all([
    supabaseClient
      .from("profiles")
      .select("id, display_name")
      .in("id", playerIds),
    supabaseClient
      .from("round_answers")
      .select("round_id, points")
      .in("round_id", roundIds)
      .limit(1000),
  ]);

  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (answersResult.error) throw new Error(answersResult.error.message);

  const names = new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.id,
      profile.display_name,
    ]),
  );
  const correctByRound = new Map<string, number>();
  for (const answer of answersResult.data ?? []) {
    if (answer.points < 980) continue;
    correctByRound.set(
      answer.round_id,
      (correctByRound.get(answer.round_id) ?? 0) + 1,
    );
  }

  return bestRounds
    .map((round) => {
      const key = `${round.player_id}:${round.mode}`;
      return {
        playerId: round.player_id,
        displayName: names.get(round.player_id) ?? "Player",
        category: round.mode as GameMode,
        bestScore: round.total_score,
        roundsPlayed: roundCount.get(key) ?? 1,
        rank: 0,
        correctAnswers: correctByRound.get(round.id) ?? 0,
        accuracy:
          Math.round(
            (round.total_score / (round.question_count * 1000)) * 1000,
          ) / 10,
        bestDate: round.created_at,
      };
    })
    .sort(
      (left, right) =>
        right.bestScore - left.bestScore ||
        new Date(left.bestDate).getTime() -
          new Date(right.bestDate).getTime() ||
        left.playerId.localeCompare(right.playerId),
    )
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

/**
 * The board for one day's puzzle. Ranked within the date only — two dailies
 * are different puzzles — so callers always name the day they want. `attempts`
 * maps onto roundsPlayed: each attempt at the puzzle is one round.
 */
export async function fetchDailyLeaderboard(
  date: string,
  limit = 10,
): Promise<DailyLeaderboardRow[]> {
  const { data, error } = await client()
    .from("daily_leaderboard")
    .select(
      "puzzle_date, player_id, display_name, score, attempts, rank, completed_at",
    )
    .eq("puzzle_date", date)
    // The view already ranks by score, then completion time, then player id.
    // Ordering by that rank keeps the client from re-deciding the tie-break.
    .order("rank", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    puzzleDate: row.puzzle_date,
    playerId: row.player_id,
    displayName: row.display_name,
    bestScore: row.score,
    roundsPlayed: row.attempts,
    rank: row.rank,
    completedAt: row.completed_at,
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
