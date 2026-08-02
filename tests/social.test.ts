import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: { rpc },
  leaderboardEnabled: true,
}));

const {
  challengeOutcome,
  fetchFriendMatchHistory,
  fetchGameChallengeDeck,
  fetchSocialDashboard,
  submitGameChallenge,
} = await import("@/lib/social");
const { questions } = await import("@/lib/questions");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("social client mappings", () => {
  it("maps per-friend records and keeps a pending opponent result hidden", async () => {
    rpc.mockResolvedValue({
      error: null,
      data: {
        unread_count: 2,
        incoming_requests: [],
        outgoing_requests: [],
        friends: [
          {
            friendship_id: "friendship-1",
            player: {
              id: "player-2",
              display_name: "Grace",
              avatar_key: "event-horizon",
            },
            friends_since: "2026-08-01T10:00:00Z",
            record: {
              played: 7,
              wins: 4,
              losses: 2,
              draws: 1,
              current_win_streak: 3,
              best_win_streak: 4,
              last_played_at: "2026-08-02T10:00:00Z",
            },
          },
        ],
        active_challenges: [
          {
            id: "challenge-1",
            format: "classic",
            classic_mode: "space",
            state: "pending",
            role: "recipient",
            opponent: {
              id: "player-2",
              display_name: "Grace",
              avatar_key: "event-horizon",
            },
            my_result: null,
            opponent_result: null,
            activated_at: "2026-08-02T09:00:00Z",
            expires_at: "2026-08-09T09:00:00Z",
            completed_at: null,
            created_at: "2026-08-02T08:00:00Z",
          },
        ],
        recent_results: [],
        blocked_players: [],
      },
    });

    const dashboard = await fetchSocialDashboard();

    expect(dashboard.unreadCount).toBe(2);
    expect(dashboard.friends[0].record).toEqual({
      played: 7,
      wins: 4,
      losses: 2,
      draws: 1,
      currentWinStreak: 3,
      bestWinStreak: 4,
      lastPlayedAt: "2026-08-02T10:00:00Z",
    });
    expect(dashboard.activeChallenges[0].opponentResult).toBeNull();
  });

  it("maps chronological head-to-head history from the current player's perspective", async () => {
    rpc.mockResolvedValue({
      error: null,
      data: {
        friend: {
          id: "player-2",
          display_name: "Grace",
          avatar_key: "event-horizon",
        },
        record: {
          played: 1,
          wins: 1,
          losses: 0,
          draws: 0,
          current_win_streak: 1,
          best_win_streak: 1,
          last_played_at: "2026-08-02T10:00:00Z",
        },
        matches: [
          {
            id: "challenge-1",
            format: "survival",
            classic_mode: null,
            my_result: 8,
            opponent_result: 6,
            outcome: "win",
            completed_at: "2026-08-02T10:00:00Z",
          },
        ],
      },
    });

    await expect(fetchFriendMatchHistory("player-2")).resolves.toMatchObject({
      friend: { id: "player-2", displayName: "Grace" },
      record: { wins: 1, currentWinStreak: 1 },
      matches: [
        {
          format: "survival",
          myResult: 8,
          opponentResult: 6,
          outcome: "win",
        },
      ],
    });
    expect(rpc).toHaveBeenCalledWith("get_friend_match_history", {
      p_friend_id: "player-2",
      p_limit: 20,
    });
  });

  it("maps the immutable server order back to bundled questions", async () => {
    const ids = [questions[3].id, questions[0].id, questions[8].id];
    rpc.mockResolvedValue({ error: null, data: ids });

    const deck = await fetchGameChallengeDeck("challenge-2");

    expect(deck.map((question) => question.id)).toEqual(ids);
  });

  it("returns the authoritative challenge phase with a submission", async () => {
    rpc.mockResolvedValue({
      error: null,
      data: {
        challenge_id: "challenge-3",
        round_id: "round-9",
        result: 8123,
        state: "pending",
        challenge: {
          id: "challenge-3",
          format: "classic",
          classic_mode: "movies",
          state: "pending",
          role: "challenger",
          opponent: {
            id: "player-2",
            display_name: "Grace",
            avatar_key: "event-horizon",
          },
          my_result: 8123,
          opponent_result: null,
          activated_at: "2026-08-02T10:00:00Z",
          expires_at: "2026-08-09T10:00:00Z",
          completed_at: null,
          created_at: "2026-08-02T09:00:00Z",
        },
      },
    });

    const guesses = [{ question_id: "q-1", guess: 20 }];
    const result = await submitGameChallenge("challenge-3", guesses);

    expect(rpc).toHaveBeenCalledWith("submit_game_challenge", {
      p_challenge_id: "challenge-3",
      p_guesses: guesses,
    });
    expect(result.challenge.state).toBe("pending");
    expect(result.challenge.opponentResult).toBeNull();
  });
});

describe("challenge comparison", () => {
  const base = {
    state: "completed" as const,
    myResult: 5,
    opponentResult: 4,
  };

  it("uses the same greater/equal/less comparison for both formats", () => {
    expect(challengeOutcome(base)).toBe("win");
    expect(challengeOutcome({ ...base, myResult: 3 })).toBe("loss");
    expect(challengeOutcome({ ...base, myResult: 4 })).toBe("draw");
  });

  it("does not invent an outcome while an opponent score is hidden", () => {
    expect(
      challengeOutcome({
        state: "pending",
        myResult: null,
        opponentResult: null,
      }),
    ).toBeNull();
  });
});
