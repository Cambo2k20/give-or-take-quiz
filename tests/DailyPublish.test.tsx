import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// The same fixture idea as Game.test.tsx: the real schedule is content, so the
// routing tests pin their own set instead of depending on what ships.
vi.mock("@/data/daily-sets.json", () => ({
  default: {
    version: 1,
    sets: [{ date: "2026-08-01", questions: fixtureQuestions("pub") }],
  },
}));

function fixtureQuestions(prefix: string) {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `fixture-${prefix}-${index + 1}`,
    category: "science" as const,
    measure: "physics" as const,
    subtype: "duration" as const,
    prompt: `Fixture question ${prefix} number ${index + 1}, how long?`,
    answer: 40 + index,
    min: 1,
    max: 100,
    scale: "linear" as const,
    unit: "second" as const,
    source: { title: "Fixture source", url: "https://example.com/fixture" },
    explanation: "A fixture question used only by the test suite.",
  }));
}

// A signed-in, confirmed player who already holds a name: the one state in
// which a finished round publishes itself without any interaction.
const api = vi.hoisted(() => ({
  publish: vi.fn().mockResolvedValue(null),
  publishDaily: vi.fn().mockResolvedValue(null),
  loadClassicBoard: vi.fn().mockResolvedValue(undefined),
  join: vi.fn(),
  resetSubmit: vi.fn(),
}));

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
    join: api.join,
    publish: api.publish,
    publishDaily: api.publishDaily,
    submit: { status: "idle" as const },
    resetSubmit: api.resetSubmit,
    board: [],
    boardLoading: false,
    boardError: null,
    loadClassicBoard: api.loadClassicBoard,
  }),
}));

import Game from "@/src/Game";

async function playThrough(
  user: ReturnType<typeof userEvent.setup>,
  questions: number,
) {
  for (let asked = 1; asked <= questions; asked += 1) {
    await user.click(
      await screen.findByRole("button", { name: /lock in guess/i }),
    );
    await user.click(
      await screen.findByRole("button", {
        name: asked === questions ? /see results/i : /next question/i,
      }),
    );
  }
  expect(
    await screen.findByRole("heading", { name: /final score/i }),
  ).toBeInTheDocument();
}

describe("publishing a finished round", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("publishes the daily but links results to the Classic board", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-08-01T09:00:00"));

    const user = userEvent.setup();
    render(<Game />);

    expect(
      screen.getAllByRole("button", { name: /play today's daily/i }),
    ).toHaveLength(1);
    expect(document.querySelector(".daily-strip")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /play today's daily/i }),
    );
    await playThrough(user, 5);

    await waitFor(() => expect(api.publishDaily).toHaveBeenCalledOnce());
    expect(api.publishDaily).toHaveBeenCalledWith(
      "2026-08-01",
      Array.from({ length: 5 }, (_, index) =>
        expect.objectContaining({ question_id: `fixture-pub-${index + 1}` }),
      ),
    );
    expect(api.publish).not.toHaveBeenCalled();

    // Every non-Classic result now leads to the single Classic leaderboard.
    await user.click(
      screen.getByRole("button", { name: /see the classic leaderboard/i }),
    );
    expect(api.loadClassicBoard).toHaveBeenCalledOnce();
    expect(
      screen.getByText(/highest classic scores across every category/i),
    ).toBeInTheDocument();
  });

  it("still sends a category round to its mode board", async () => {
    const user = userEvent.setup();
    render(<Game />);

    const label = screen.getByText("History", {
      exact: true,
      selector: "strong",
    });
    const button = label.closest("button");
    if (!button) throw new Error("The History label is not inside a button.");
    await user.click(button);
    await playThrough(user, 10);

    await waitFor(() => expect(api.publish).toHaveBeenCalledOnce());
    expect(api.publish).toHaveBeenCalledWith(
      "history",
      expect.arrayContaining([
        expect.objectContaining({ question_id: expect.any(String) }),
      ]),
    );
    expect(api.publish.mock.calls[0]?.[1]).toHaveLength(10);
    expect(api.publishDaily).not.toHaveBeenCalled();
  });

  it("keeps the merged daily header on the account screen", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-08-01T09:00:00"));

    const user = userEvent.setup();
    render(<Game />);

    expect(
      screen.getByRole("button", { name: /play today's daily/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ada" }));

    expect(
      screen.getByRole("button", { name: /play today's daily/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Give or Take home" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Give or Take home" }));

    expect(
      screen.getByRole("button", { name: /play today's daily/i }),
    ).toBeInTheDocument();
  });
});
