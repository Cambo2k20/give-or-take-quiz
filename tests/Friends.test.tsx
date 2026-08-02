import { createRef } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  ChallengeSummary,
  FriendMatchHistory,
  Friendship,
  SocialDashboard,
} from "@/lib/social";
import { FriendsScreen } from "@/src/Friends";
import type { SocialController } from "@/src/useSocial";
import type { GameMode } from "@/lib/types";

const labels = {
  population: "Population",
  history: "History",
  geography: "Geography",
  science: "Science",
  animals: "Animals",
  space: "Space",
  technology: "Technology",
  movies: "Movies",
  dinosaurs: "Dinosaurs",
  games: "Games",
  mixed: "Mixed",
} satisfies Record<GameMode, string>;

const grace = {
  id: "player-2",
  displayName: "Grace",
  avatarKey: "event-horizon" as const,
};

const friendship: Friendship = {
  friendshipId: "friendship-1",
  player: grace,
  friendsSince: "2026-07-20T10:00:00Z",
  record: {
    played: 6,
    wins: 3,
    losses: 2,
    draws: 1,
    currentWinStreak: 2,
    bestWinStreak: 3,
    lastPlayedAt: "2026-08-02T10:00:00Z",
  },
};

const history: FriendMatchHistory = {
  friend: grace,
  record: friendship.record,
  matches: [
    {
      id: "match-3",
      format: "classic",
      classicMode: "space",
      myResult: 9_100,
      opponentResult: 8_400,
      outcome: "win",
      completedAt: "2026-08-02T10:00:00Z",
    },
    {
      id: "match-2",
      format: "survival",
      classicMode: null,
      myResult: 7,
      opponentResult: 9,
      outcome: "loss",
      completedAt: "2026-08-01T10:00:00Z",
    },
  ],
};

const draftChallenge: ChallengeSummary = {
  id: "challenge-1",
  format: "survival",
  classicMode: null,
  state: "draft",
  role: "challenger",
  opponent: grace,
  myResult: null,
  opponentResult: null,
  activatedAt: null,
  expiresAt: null,
  completedAt: null,
  createdAt: "2026-08-02T10:00:00Z",
};

function controller(
  overrides: Partial<SocialController> = {},
): SocialController {
  const dashboard: SocialDashboard = {
    unreadCount: 0,
    incomingRequests: [],
    outgoingRequests: [],
    friends: [friendship],
    activeChallenges: [],
    recentResults: [],
    blockedPlayers: [],
  };

  return {
    ready: true,
    loading: false,
    error: null,
    dashboard,
    unreadCount: 0,
    searchResult: null,
    searching: false,
    clearSearch: vi.fn(),
    refresh: vi.fn().mockResolvedValue(dashboard),
    enterFriends: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue(null),
    sendRequest: vi.fn().mockResolvedValue(undefined),
    respondRequest: vi.fn().mockResolvedValue(undefined),
    removeFriend: vi.fn().mockResolvedValue(undefined),
    blockPlayer: vi.fn().mockResolvedValue(undefined),
    unblockPlayer: vi.fn().mockResolvedValue(undefined),
    createChallenge: vi.fn().mockResolvedValue("challenge-1"),
    loadChallenge: vi.fn().mockResolvedValue(draftChallenge),
    loadChallengeDeck: vi.fn().mockResolvedValue([]),
    submitChallenge: vi.fn().mockResolvedValue({
      challengeId: "challenge-1",
      roundId: "round-1",
      result: 0,
      state: "pending",
      challenge: draftChallenge,
    }),
    cancelChallenge: vi.fn().mockResolvedValue(undefined),
    declineChallenge: vi.fn().mockResolvedValue(undefined),
    loadMatchHistory: vi.fn().mockResolvedValue(history),
    ...overrides,
  };
}

function renderFriends(social: SocialController, initialChallengeId: string | null = null) {
  const onPlayChallenge = vi.fn();
  render(
    <FriendsScreen
      social={social}
      modeLabels={labels}
      initialChallengeId={initialChallengeId}
      onPlayChallenge={onPlayChallenge}
      onBack={vi.fn()}
      headingRef={createRef<HTMLHeadingElement>()}
    />,
  );
  return { onPlayChallenge };
}

describe("FriendsScreen", () => {
  it("shows the player-relative record and latest head-to-head matches", async () => {
    const user = userEvent.setup();
    const social = controller();
    renderFriends(social);

    const friendButton = screen.getByRole("button", {
      name: /Grace3 W2 L1 D2 win streak/i,
    });
    await user.click(friendButton);

    expect(
      await screen.findByRole("heading", { name: "Grace" }),
    ).toBeVisible();
    const summary = document.querySelector(".head-to-head-summary");
    expect(summary).toBeInstanceOf(HTMLElement);
    expect(
      within(summary as HTMLElement)
        .getAllByRole("strong")
        .map((item) => item.textContent),
    ).toEqual(["3", "2", "1", "2", "3"]);
    expect(screen.getByText("Space Classic")).toBeVisible();
    expect(screen.getByText("9,100 points · 8,400 points")).toBeVisible();
    expect(social.loadMatchHistory).toHaveBeenCalledWith("player-2");
  });

  it("creates a Survival challenge for the selected friend and starts its deck", async () => {
    const user = userEvent.setup();
    const social = controller();
    const { onPlayChallenge } = renderFriends(social);

    await user.click(screen.getByRole("button", { name: "Challenge" }));
    expect(
      screen.getByRole("heading", { name: "Challenge Grace" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Subject")).toHaveValue("mixed");

    await user.click(screen.getByRole("button", { name: "Survival" }));
    expect(screen.queryByLabelText("Subject")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Start challenge" }));

    await waitFor(() => {
      expect(social.createChallenge).toHaveBeenCalledWith(
        "player-2",
        "survival",
        null,
      );
      expect(onPlayChallenge).toHaveBeenCalledWith(draftChallenge);
    });
  });

  it("shows the same generic unavailable message for an invalid challenge link", async () => {
    const social = controller({
      loadChallenge: vi.fn().mockRejectedValue(new Error("private details")),
    });
    renderFriends(social, "not-for-this-player");

    expect(
      await screen.findByText("This challenge is unavailable."),
    ).toBeVisible();
    expect(screen.queryByText("private details")).toBeNull();
  });
});
