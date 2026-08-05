import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: { rpc },
  leaderboardEnabled: true,
}));

const {
  fetchPublicPlayerProfile,
  mapPublicPlayerProfile,
  sendProfileFriendRequest,
  updateProfileShowcase,
} = await import("@/lib/publicProfile");

const serverProfile = {
  player: {
    id: "player-1",
    display_name: "Cambo",
    avatar_key: "hermes",
  },
  relationship: "friend",
  showcase: {
    featured_badge_key: "space-05",
    custom_featured_badge_key: "space-05",
    pinned_achievement_ids: ["first-steps"],
    profile_theme_id: "deep-space",
    custom_profile_theme_id: "deep-space",
  },
  total_xp: 9479,
  category_ranks: [
    { category: "space", xp: 4779, rank: 5, title: "Stargazer" },
  ],
  earned_badges: [
    {
      badge_key: "space-05",
      category: "space",
      rank_floor: 5,
      title: "Stargazer",
    },
  ],
  earned_achievements: [
    {
      id: "first-steps",
      name: "First Steps",
      description: "Finish your first round.",
      tier: "gold",
    },
  ],
  classic_bests: [
    {
      category: "space",
      best_score: 4800,
      correct_answers: 5,
      accuracy: 96,
      best_date: "2026-08-02T10:00:00Z",
    },
  ],
  survival: { best_run: 12, attempts: 4 },
  daily: { played: 9, longest_streak: 3, best_score: 4700 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("public profile mapping", () => {
  it("maps the curated server payload and falls back from unknown cosmetics", () => {
    const mapped = mapPublicPlayerProfile({
      ...serverProfile,
      player: { ...serverProfile.player, avatar_key: "not-an-avatar" },
      showcase: {
        ...serverProfile.showcase,
        profile_theme_id: "not-a-theme",
      },
    });

    expect(mapped.player.displayName).toBe("Cambo");
    expect(mapped.isQa).toBe(false);
    expect(mapped.player.avatarKey).toBe("event-horizon");
    expect(mapped.showcase.profileThemeId).toBeNull();
    expect(mapped.earnedAchievements[0].tier).toBe("gold");
    expect(mapped.classicBests[0]).toMatchObject({
      category: "space",
      bestScore: 4800,
      correctAnswers: 5,
    });
  });
});

describe("public profile RPCs", () => {
  it("loads a signed-out-safe profile through the public RPC", async () => {
    rpc
      .mockResolvedValueOnce({ data: serverProfile, error: null })
      .mockResolvedValueOnce({ data: true, error: null });

    await expect(fetchPublicPlayerProfile("player-1")).resolves.toMatchObject({
      player: { id: "player-1", displayName: "Cambo" },
      isQa: true,
      relationship: "friend",
    });
    expect(rpc).toHaveBeenCalledWith("get_public_player_profile", {
      p_player_id: "player-1",
    });
    expect(rpc).toHaveBeenCalledWith("get_public_qa_profile_status", {
      p_player_id: "player-1",
    });
  });

  it("sends only controlled showcase choices", async () => {
    rpc.mockResolvedValue({ data: serverProfile, error: null });

    await updateProfileShowcase({
      featuredBadgeKey: "space-05",
      pinnedAchievementIds: ["first-steps"],
      profileThemeId: "deep-space",
    });

    expect(rpc).toHaveBeenCalledWith("update_profile_showcase", {
      p_featured_badge_key: "space-05",
      p_pinned_achievement_ids: ["first-steps"],
      p_profile_theme_id: "deep-space",
    });
  });

  it("uses the immutable player id for friend requests", async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await sendProfileFriendRequest("player-2");

    expect(rpc).toHaveBeenCalledWith("send_friend_request_by_id", {
      p_player_id: "player-2",
    });
  });
});
