import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PublicPlayerProfile } from "@/lib/publicProfile";
import {
  PublicProfileEditorState,
  PublicProfileScreen,
} from "@/src/PublicProfile";

const categories = [
  "population",
  "history",
  "geography",
  "science",
  "animals",
  "space",
  "technology",
  "movies",
] as const;

const labels = Object.fromEntries(
  categories.map((category) => [
    category,
    { title: category[0].toUpperCase() + category.slice(1), icon: <span /> },
  ]),
) as Parameters<typeof PublicProfileScreen>[0]["labels"];

const profile: PublicPlayerProfile = {
  player: { id: "player-1", displayName: "Cambo", avatarKey: "hermes" },
  isQa: false,
  relationship: "self",
  showcase: {
    featuredBadgeKey: "space-05",
    customFeaturedBadgeKey: null,
    pinnedAchievementIds: ["achievement-7"],
    profileThemeId: "deep-space",
    customProfileThemeId: null,
  },
  totalXp: 9479,
  categoryRanks: categories.map((category) => ({
    category,
    xp: category === "space" ? 4779 : 100,
    rank: category === "space" ? 5 : 1,
    title: category === "space" ? "Stargazer" : "Newcomer",
  })),
  earnedBadges: [
    { badgeKey: "space-05", category: "space", rankFloor: 5, title: "Stargazer" },
  ],
  earnedAchievements: Array.from({ length: 7 }, (_, index) => ({
    id: `achievement-${index + 1}`,
    name: `Achievement ${index + 1}`,
    description: `Earn achievement ${index + 1}.`,
    tier: index === 0 ? "gold" : "bronze",
  })),
  classicBests: [
    {
      category: "mixed",
      bestScore: 4800,
      correctAnswers: 5,
      accuracy: 96,
      bestDate: "2026-08-02T10:00:00Z",
    },
  ],
  survival: { bestRun: 12, attempts: 4 },
  daily: { played: 9, longestStreak: 3, bestScore: 4700 },
};

function renderProfile(
  overrides: Partial<PublicPlayerProfile> = {},
  actions = { onManage: vi.fn(), onSignIn: vi.fn() },
) {
  render(
    <PublicProfileScreen
      profile={{ ...profile, ...overrides }}
      labels={labels}
      themeMode="dark"
      loading={false}
      unavailable={false}
      error=""
      actionBusy={false}
      actionMessage=""
      socialCompetitionBlocked={false}
      matchHistory={null}
      matchHistoryLoading={false}
      onAddFriend={vi.fn()}
      onOpenFriends={vi.fn()}
      onChallenge={vi.fn()}
      onManage={actions.onManage}
      onSignIn={actions.onSignIn}
      onShare={vi.fn()}
      onBack={vi.fn()}
      headingRef={createRef<HTMLHeadingElement>()}
    />,
  );
  return actions;
}

describe("public player profile", () => {
  it("shows the controlled competitive layout and the owner's edit action", async () => {
    const user = userEvent.setup();
    const actions = renderProfile();

    expect(screen.getByRole("heading", { name: "Cambo" })).toBeInTheDocument();
    expect(screen.getByText("Stargazer · Space")).toBeInTheDocument();
    expect(screen.getByText("Mixed")).toBeInTheDocument();
    expect(screen.getAllByText(/Achievement \d/)).toHaveLength(6);

    await user.click(
      screen.getByRole("button", { name: "Customise public profile" }),
    );
    expect(actions.onManage).toHaveBeenCalledOnce();
  });

  it("shows a sign-in action without leaking friend-only history", () => {
    renderProfile({ relationship: "signed_out" });

    expect(
      screen.getByRole("button", { name: "Sign in to add friend" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Head to head")).not.toBeInTheDocument();
  });

  it("marks QA profiles and removes competitive social actions", () => {
    renderProfile({ isQa: true, relationship: "friend" });

    expect(screen.getByText("QA")).toBeInTheDocument();
    expect(
      screen.getByText(/progress, badges and achievements shown here are simulated/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Challenge" })).toBeNull();
    expect(screen.queryByText("Head to head")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Subject ranks" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Achievements" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Personal bests" })).toBeNull();
  });

  it("removes competition actions when the signed-in viewer is QA", () => {
    render(
      <PublicProfileScreen
        profile={{ ...profile, relationship: "friend" }}
        labels={labels}
        themeMode="dark"
        loading={false}
        unavailable={false}
        error=""
        actionBusy={false}
        actionMessage=""
        socialCompetitionBlocked
        matchHistory={null}
        matchHistoryLoading={false}
        onAddFriend={vi.fn()}
        onOpenFriends={vi.fn()}
        onChallenge={vi.fn()}
        onManage={vi.fn()}
        onSignIn={vi.fn()}
        onShare={vi.fn()}
        onBack={vi.fn()}
        headingRef={createRef<HTMLHeadingElement>()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Challenge" })).toBeNull();
    expect(screen.queryByText("Head to head")).toBeNull();
    expect(screen.getByRole("button", { name: "Share profile" })).toBeInTheDocument();
  });

  it("uses a generic unavailable state for blocked or missing profiles", () => {
    render(
      <PublicProfileScreen
        profile={null}
        labels={labels}
        themeMode="dark"
        loading={false}
        unavailable
        error=""
        actionBusy={false}
        actionMessage=""
        socialCompetitionBlocked={false}
        matchHistory={null}
        matchHistoryLoading={false}
        onAddFriend={vi.fn()}
        onOpenFriends={vi.fn()}
        onChallenge={vi.fn()}
        onManage={vi.fn()}
        onSignIn={vi.fn()}
        onShare={vi.fn()}
        onBack={vi.fn()}
        headingRef={createRef<HTMLHeadingElement>()}
      />,
    );

    expect(screen.getByText("This player profile is unavailable.")).toBeInTheDocument();
  });

  it("keeps the profile editor visible while its data is loading", () => {
    render(
      <PublicProfileEditorState
        loading
        error=""
        onBack={vi.fn()}
        headingRef={createRef<HTMLHeadingElement>()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Customise profile" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading your earned titles",
    );
  });

  it("shows a recoverable profile editor error instead of a blank page", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <PublicProfileEditorState
        loading={false}
        error="The profile service is unavailable."
        onBack={onBack}
        headingRef={createRef<HTMLHeadingElement>()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The profile service is unavailable.",
    );
    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
