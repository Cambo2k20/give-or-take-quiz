import { render, screen, waitFor, within } from "@testing-library/react";
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
  loadDailyBoard: vi.fn().mockResolvedValue(undefined),
  loadSurvivalBoard: vi.fn().mockResolvedValue(undefined),
  join: vi.fn(),
  resetSubmit: vi.fn(),
  myDailyRank: vi.fn().mockResolvedValue(null),
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
    myDailyRank: api.myDailyRank,
    submit: { status: "idle" as const },
    resetSubmit: api.resetSubmit,
    board: [],
    boardLoading: false,
    boardError: null,
    loadClassicBoard: api.loadClassicBoard,
    loadDailyBoard: api.loadDailyBoard,
    loadSurvivalBoard: api.loadSurvivalBoard,
  }),
}));

import Game from "@/src/Game";

/**
 * The home screen's Daily hero, as distinct from the compact Daily control in
 * the header. Both offer today's puzzle, so a bare role query matches two.
 */
function dailyHero() {
  const hero = document.querySelector(".daily-hero");
  if (!(hero instanceof HTMLElement)) {
    throw new Error("The Daily hero is not on the home screen.");
  }
  return within(hero);
}

/** The compact Daily control that rides along on every screen. */
function homeHeader() {
  const header = document.querySelector(".home-header");
  if (!(header instanceof HTMLElement)) {
    throw new Error("The home header is not rendered.");
  }
  return within(header);
}

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

  it("publishes the daily and links results to that day's Daily board", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-08-01T09:00:00"));

    const user = userEvent.setup();
    render(<Game />);

    // Two entry points by design: the compact header control and the home
    // screen's Daily hero.
    expect(
      screen.getAllByRole("button", { name: /play today's daily/i }),
    ).toHaveLength(2);
    expect(document.querySelector(".daily-strip")).not.toBeInTheDocument();

    await user.click(
      dailyHero().getByRole("button", { name: /play today's daily/i }),
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

    // A Daily result belongs on the Daily board for that day, not on Classic:
    // the two rank different things and are not comparable.
    await user.click(
      screen.getByRole("button", { name: /see today's daily board/i }),
    );
    expect(api.loadDailyBoard).toHaveBeenCalledWith("2026-08-01");
    expect(api.loadClassicBoard).not.toHaveBeenCalled();
    expect(
      screen.getByText(/everyone answered the same five questions/i),
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
    await playThrough(user, 5);

    await waitFor(() => expect(api.publish).toHaveBeenCalledOnce());
    expect(api.publish).toHaveBeenCalledWith(
      "history",
      expect.arrayContaining([
        expect.objectContaining({ question_id: expect.any(String) }),
      ]),
    );
    expect(api.publish.mock.calls[0]?.[1]).toHaveLength(5);
    expect(api.publishDaily).not.toHaveBeenCalled();
  });

  it("keeps the merged daily header on the account screen", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-08-01T09:00:00"));

    const user = userEvent.setup();
    render(<Game />);

    expect(
      homeHeader().getByRole("button", { name: /play today's daily/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ada" }));

    // The hero is home-screen only; the header control is what must survive
    // the trip to the account screen.
    expect(document.querySelector(".daily-hero")).not.toBeInTheDocument();
    expect(
      homeHeader().getByRole("button", { name: /play today's daily/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Give or Take home" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Give or Take home" }));

    expect(
      homeHeader().getByRole("button", { name: /play today's daily/i }),
    ).toBeInTheDocument();
    expect(
      dailyHero().getByRole("button", { name: /play today's daily/i }),
    ).toBeInTheDocument();
  });
});
