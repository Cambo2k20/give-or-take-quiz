import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, query } = vi.hoisted(() => {
  const limit = vi.fn();
  const inFilter = vi.fn();
  const order = vi.fn();
  order.mockReturnValue({ order, limit });
  const eq = vi.fn(() => ({ order, in: inFilter }));
  const select = vi.fn(() => ({ eq, order }));
  const from = vi.fn(() => ({ select }));
  return {
    rpc: vi.fn(),
    query: { from, select, eq, order, limit, inFilter },
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: { rpc, from: query.from },
  leaderboardEnabled: true,
}));

const {
  fetchClassicLeaderboard,
  fetchDailyLeaderboard,
  fetchMyOfficialDailies,
  submitDailyRound,
} = await import("@/lib/leaderboard");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("submitDailyRound", () => {
  it("names the day and hands the guesses to submit_daily_round", async () => {
    rpc.mockResolvedValue({
      data: { round_id: "round-9", total_score: 3456, puzzle_date: "2026-08-01" },
      error: null,
    });

    const guesses = [{ question_id: "q-1", guess: 40 }];
    const result = await submitDailyRound("2026-08-01", guesses);

    expect(rpc).toHaveBeenCalledWith("submit_daily_round", {
      p_date: "2026-08-01",
      p_guesses: guesses,
    });
    expect(result).toEqual({ roundId: "round-9", totalScore: 3456 });
  });

  it("surfaces the server's refusal as the error message", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "that daily has not been published yet" },
    });

    await expect(submitDailyRound("2099-01-01", [])).rejects.toThrow(
      "that daily has not been published yet",
    );
  });

  it("treats an empty reply as a failure rather than a silent success", async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await expect(submitDailyRound("2026-08-01", [])).rejects.toThrow(
      "The round was not recorded.",
    );
  });
});

describe("fetchDailyLeaderboard", () => {
  it("reads one day's official board and counts attempts as rounds", async () => {
    query.limit.mockResolvedValue({
      data: [
        {
          puzzle_date: "2026-08-01",
          player_id: "p-1",
          display_name: "Ada",
          score: 4200,
          attempts: 2,
          rank: 1,
          completed_at: "2026-08-01T09:14:00Z",
        },
      ],
      error: null,
    });

    const rows = await fetchDailyLeaderboard("2026-08-01");

    expect(query.from).toHaveBeenCalledWith("daily_leaderboard");
    expect(query.eq).toHaveBeenCalledWith("puzzle_date", "2026-08-01");
    // The view decides the tie-break; the client must not re-sort and undo it.
    expect(query.order).toHaveBeenCalledWith("rank", { ascending: true });
    expect(rows).toEqual([
      {
        puzzleDate: "2026-08-01",
        playerId: "p-1",
        displayName: "Ada",
        // The official attempt's score, not the best of the two attempts.
        bestScore: 4200,
        roundsPlayed: 2,
        rank: 1,
        completedAt: "2026-08-01T09:14:00Z",
      },
    ]);
  });

  it("returns an empty board when the day has no rows yet", async () => {
    query.limit.mockResolvedValue({ data: null, error: null });

    await expect(fetchDailyLeaderboard("2026-08-02")).resolves.toEqual([]);
  });
});

describe("fetchMyOfficialDailies", () => {
  it("fetches the account's visible Daily history in one query", async () => {
    query.inFilter.mockResolvedValue({
      data: [
        { puzzle_date: "2026-08-01", score: 4200, attempts: 2 },
        { puzzle_date: "2026-08-02", score: 3900, attempts: 1 },
      ],
      error: null,
    });

    await expect(
      fetchMyOfficialDailies("player-1", ["2026-08-02", "2026-08-01"]),
    ).resolves.toEqual([
      { date: "2026-08-01", score: 4200, attempts: 2 },
      { date: "2026-08-02", score: 3900, attempts: 1 },
    ]);
    expect(query.from).toHaveBeenCalledWith("daily_leaderboard");
    expect(query.select).toHaveBeenCalledWith(
      "puzzle_date, score, attempts",
    );
    expect(query.eq).toHaveBeenCalledWith("player_id", "player-1");
    expect(query.inFilter).toHaveBeenCalledWith("puzzle_date", [
      "2026-08-02",
      "2026-08-01",
    ]);
  });

  it("skips Supabase when no Daily dates are visible", async () => {
    await expect(fetchMyOfficialDailies("player-1", [])).resolves.toEqual([]);
    expect(query.from).not.toHaveBeenCalled();
  });

  it("surfaces a failed history query", async () => {
    query.inFilter.mockResolvedValue({
      data: null,
      error: { message: "history unavailable" },
    });

    await expect(
      fetchMyOfficialDailies("player-1", ["2026-08-02"]),
    ).rejects.toThrow("history unavailable");
  });
});

describe("fetchClassicLeaderboard", () => {
  it("maps the best round details used by the combined board", async () => {
    query.limit.mockResolvedValue({
      data: [
        {
          mode: "science",
          player_id: "p-1",
          display_name: "Ada",
          best_score: 4420,
          rounds_played: 4,
          rank: 1,
          correct_answers: 3,
          accuracy: "88.4",
          best_date: "2026-07-27T12:00:00Z",
        },
      ],
      error: null,
    });

    await expect(fetchClassicLeaderboard()).resolves.toEqual([
      {
        playerId: "p-1",
        displayName: "Ada",
        category: "science",
        bestScore: 4420,
        roundsPlayed: 4,
        rank: 1,
        correctAnswers: 3,
        accuracy: 88.4,
        bestDate: "2026-07-27T12:00:00Z",
      },
    ]);
    expect(query.from).toHaveBeenCalledWith("leaderboard");
    expect(query.order).toHaveBeenNthCalledWith(1, "best_score", {
      ascending: false,
    });
    expect(query.order).toHaveBeenNthCalledWith(2, "best_date", {
      ascending: true,
    });
  });
});
