import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlayerProgress } from "@/lib/progress";

// A player mid-ladder: two subjects titled, the rest still Newcomer, and a
// mix of earned and unearned achievements.
const fixture: PlayerProgress = {
  totalXp: 9_400,
  categories: [
    ["population", 4_200, 10, "Crowd Counter"],
    ["history", 3_700, 9, "Time Tourist"],
    ["geography", 900, 2, "Newcomer"],
    ["science", 300, 1, "Newcomer"],
    ["animals", 200, 1, "Newcomer"],
    ["space", 100, 1, "Newcomer"],
    ["technology", 0, 1, "Newcomer"],
    ["movies", 0, 1, "Newcomer"],
  ].map(([category, xp, rank, title]) => ({
    category: category as PlayerProgress["categories"][number]["category"],
    xp: xp as number,
    rank: rank as number,
    title: title as string,
    questionsAnswered: 10,
    perfectAnswers: 1,
    rankFloorXp: 0,
    nextRankXp: 5_000,
    fraction: 0.5,
  })),
  achievements: [
    {
      id: "first-steps",
      name: "First Steps",
      description: "Finish your first round.",
      tier: "bronze",
      progress: 1,
      threshold: 1,
      earned: true,
    },
    {
      id: "regular",
      name: "Regular",
      description: "Finish 25 rounds.",
      tier: "silver",
      progress: 8,
      threshold: 25,
      earned: false,
    },
  ],
};

vi.mock("@/src/useAuth", () => ({
  useAuth: () => ({
    enabled: true,
    status: "signed-in" as const,
    user: { id: "user-1", email: "player@example.com", emailConfirmed: true },
    canUseLeaderboard: true,
    recovering: false,
    endRecovery: () => {},
  }),
}));

vi.mock("@/src/useLeaderboard", () => ({
  useLeaderboard: () => ({
    enabled: true,
    ready: true,
    profile: { id: "user-1", displayName: "Ada" },
    join: vi.fn(),
    publish: vi.fn().mockResolvedValue(null),
    publishDaily: vi.fn().mockResolvedValue(null),
    publishSurvival: vi.fn().mockResolvedValue(null),
    submit: { status: "idle" as const },
    resetSubmit: vi.fn(),
    board: [],
    boardLoading: false,
    boardError: null,
    loadBoard: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/src/useProgress", () => ({
  useProgress: () => ({
    enabled: true,
    progress: fixture,
    change: null,
    refresh: vi.fn().mockResolvedValue(null),
    clearChange: vi.fn(),
  }),
}));

import Game from "@/src/Game";

async function openAccount(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Ada" }));
  return screen.findByRole("heading", { name: /^account$/i });
}

describe("progression screens", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("splits progress behind three doors rather than stacking it", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);

    // The account screen itself stays short: three buttons, no panels.
    expect(screen.getByRole("button", { name: /ranks/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /achievements/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unlocks/i })).toBeInTheDocument();
    expect(screen.queryByText("Crowd Counter")).not.toBeInTheDocument();
    expect(screen.queryByText("First Steps")).not.toBeInTheDocument();
  });

  it("opens ranks on its own screen", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);

    await user.click(screen.getByRole("button", { name: /ranks/i }));

    expect(
      await screen.findByRole("heading", { name: /^ranks$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Crowd Counter")).toBeInTheDocument();
    expect(screen.getByText("Time Tourist")).toBeInTheDocument();
    // Achievements are not along for the ride.
    expect(screen.queryByText("First Steps")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back to account/i }));
    expect(
      await screen.findByRole("heading", { name: /^account$/i }),
    ).toBeInTheDocument();
  });

  it("opens achievements on its own screen, earned and unearned", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);

    await user.click(screen.getByRole("button", { name: /achievements/i }));

    expect(
      await screen.findByRole("heading", { name: /^achievements$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("First Steps")).toBeInTheDocument();
    expect(screen.getByText("Regular")).toBeInTheDocument();
    // Unearned ones show how far off they are.
    expect(screen.getByText("8 / 25")).toBeInTheDocument();
    expect(screen.queryByText("Crowd Counter")).not.toBeInTheDocument();
  });

  it("is honest that there is nothing to unlock yet", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);

    await user.click(screen.getByRole("button", { name: /unlocks/i }));

    expect(
      await screen.findByRole("heading", { name: /^unlocks$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/nothing to unlock yet/i)).toBeInTheDocument();
    // It still credits the two titles already held toward whatever comes.
    expect(screen.getByText(/2 subject titles/i)).toBeInTheDocument();
  });

  it("shows earned titles on the home cards but never Newcomer", async () => {
    render(<Game />);

    // Population and History are titled; the other six are not.
    expect(screen.getByText(/Crowd Counter/)).toBeInTheDocument();
    expect(screen.getByText(/Time Tourist/)).toBeInTheDocument();
    expect(screen.queryByText(/Newcomer/)).not.toBeInTheDocument();
  });
});
