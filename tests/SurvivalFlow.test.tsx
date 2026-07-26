import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// A deck whose answers sit at known rail positions, so a guess left at its
// start position dies at a predictable point in the run.
vi.mock("@/lib/formats", async () => {
  const actual = await vi.importActual<typeof import("@/lib/formats")>(
    "@/lib/formats",
  );
  return {
    ...actual,
    buildSurvivalDeck: () =>
      Array.from({ length: 6 }, (_, index) => ({
        id: `survival-fixture-${index + 1}`,
        category: "science" as const,
        measure: "physics" as const,
        subtype: "duration" as const,
        prompt: `Survival fixture ${index + 1}, how long?`,
        answer: 50,
        min: 0,
        max: 100,
        scale: "linear" as const,
        unit: "second" as const,
        source: { title: "Fixture source", url: "https://example.com/fixture" },
        explanation: "A fixture question used only by the test suite.",
      })),
  };
});

const api = vi.hoisted(() => ({
  publish: vi.fn().mockResolvedValue(null),
  publishDaily: vi.fn().mockResolvedValue(null),
  publishSurvival: vi.fn().mockResolvedValue(null),
  loadBoard: vi.fn().mockResolvedValue(undefined),
  loadDailyBoard: vi.fn().mockResolvedValue(undefined),
  loadSurvivalBoard: vi.fn().mockResolvedValue(undefined),
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
    publishSurvival: api.publishSurvival,
    submit: { status: "idle" as const },
    resetSubmit: api.resetSubmit,
    board: [],
    boardLoading: false,
    boardError: null,
    loadBoard: api.loadBoard,
    loadDailyBoard: api.loadDailyBoard,
    loadSurvivalBoard: api.loadSurvivalBoard,
  }),
}));

import Game from "@/src/Game";
import { readFormatRecords } from "@/lib/formats";

async function startRun(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^survival$/i }));
  await user.click(screen.getByRole("button", { name: /start a run/i }));
  expect(
    await screen.findByRole("button", { name: /lock in guess/i }),
  ).toBeEnabled();
}

/** Answers with the slider untouched until the run ends. */
async function playUntilDead(user: ReturnType<typeof userEvent.setup>) {
  for (let guard = 0; guard < 12; guard += 1) {
    const lock = screen.queryByRole("button", { name: /lock in guess/i });
    if (!lock) break;
    await user.click(lock);
    const advance = await screen.findByRole("button", {
      name: /next question|see how far you got/i,
    });
    await user.click(advance);
  }
}

describe("survival", () => {
  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("runs until a guess misses, then banks and publishes the run", async () => {
    const user = userEvent.setup();
    render(<Game />);

    await startRun(user);
    await playUntilDead(user);

    expect(
      await screen.findByRole("heading", { name: /you lasted/i }),
    ).toBeInTheDocument();

    await waitFor(() => expect(api.publishSurvival).toHaveBeenCalledOnce());

    // Every guess in order, ending with the fatal one: the server rejects a
    // run that does not end at its first miss.
    const submitted = api.publishSurvival.mock.calls[0]?.[0] as Array<{
      question_id: string;
      guess: number;
    }>;
    expect(submitted.length).toBeGreaterThan(0);
    expect(new Set(submitted.map((g) => g.question_id)).size).toBe(
      submitted.length,
    );
    submitted.forEach((guess, index) => {
      expect(guess.question_id).toBe(`survival-fixture-${index + 1}`);
    });

    // A run is not a category score and must not touch either points board.
    expect(api.publish).not.toHaveBeenCalled();
    expect(api.publishDaily).not.toHaveBeenCalled();

    // The local best is the run length, which is one less than the guesses made.
    const best = readFormatRecords(window.localStorage).survivalBest;
    expect(best).toBe(submitted.length - 1);
  });

  it("keeps the classic hero a consequence-free warm-up", async () => {
    const user = userEvent.setup();
    render(<Game />);

    // Classic is the default: the hero is the demo, not question 1 of a run.
    await user.click(screen.getByRole("button", { name: /check my guess/i }));
    expect(
      screen.getByRole("button", { name: /play a full round/i }),
    ).toBeInTheDocument();

    expect(api.publishSurvival).not.toHaveBeenCalled();
    expect(api.publish).not.toHaveBeenCalled();
    expect(readFormatRecords(window.localStorage).survivalBest).toBe(0);
  });

  it("offers the survival board from the run's end screen", async () => {
    const user = userEvent.setup();
    render(<Game />);

    await startRun(user);
    await playUntilDead(user);
    await user.click(
      await screen.findByRole("button", { name: /see the survival board/i }),
    );

    expect(api.loadSurvivalBoard).toHaveBeenCalledOnce();
    expect(api.loadBoard).not.toHaveBeenCalled();
    expect(
      screen.getByText(/ranked by questions survived, not points/i),
    ).toBeInTheDocument();
  });
});
