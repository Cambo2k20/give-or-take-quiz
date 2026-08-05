import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QaSimulation } from "@/lib/qaSimulation";
import type { QuestionCategory } from "@/lib/types";

const { rpc, badgeRows } = vi.hoisted(() => ({
  rpc: vi.fn(),
  badgeRows: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc,
    from: () => ({
      select: () => Promise.resolve({ data: badgeRows, error: null }),
    }),
  },
  leaderboardEnabled: true,
}));

const { PLAYABLE_CATEGORIES } = await import("@/lib/game");
const { BADGE_RANK_FLOORS, fetchProgress } = await import("@/lib/progress");
const { BACKGROUND_THEMES, isThemeUnlocked } = await import("@/lib/themes");
const { fetchQaSimulation, saveQaSimulation } = await import(
  "@/lib/qaSimulation"
);
const { QaSimulationControls } = await import("@/src/QaSimulationControls");

const labels = Object.fromEntries(
  PLAYABLE_CATEGORIES.map((category) => [
    category,
    { title: category[0].toUpperCase() + category.slice(1), icon: null },
  ]),
) as Record<QuestionCategory, { title: string; icon: null }>;

function ranksAt(rank: number) {
  return Object.fromEntries(
    PLAYABLE_CATEGORIES.map((category) => [category, rank]),
  ) as QaSimulation["categoryRanks"];
}

function serverSimulation(rank = 30, achievements = true) {
  return {
    category_ranks: ranksAt(rank),
    simulate_all_achievements: achievements,
  };
}

beforeEach(() => {
  rpc.mockReset();
  badgeRows.splice(
    0,
    badgeRows.length,
    ...PLAYABLE_CATEGORIES.flatMap((category) =>
      BADGE_RANK_FLOORS.map((rankFloor) => ({
        category,
        rank_floor: rankFloor,
        title: `${category} title ${rankFloor}`,
        badge_key: `${category}-${String(rankFloor).padStart(2, "0")}`,
      })),
    ),
  );
});

describe("QA simulation server client", () => {
  it("loads defaults and persists exactly all ten category ranks", async () => {
    rpc
      .mockResolvedValueOnce({ data: serverSimulation(), error: null })
      .mockResolvedValueOnce({ data: serverSimulation(5, false), error: null });

    await expect(fetchQaSimulation()).resolves.toEqual({
      categoryRanks: ranksAt(30),
      simulateAllAchievements: true,
    });
    await expect(
      saveQaSimulation({
        categoryRanks: ranksAt(5),
        simulateAllAchievements: false,
      }),
    ).resolves.toEqual({
      categoryRanks: ranksAt(5),
      simulateAllAchievements: false,
    });
    expect(rpc).toHaveBeenLastCalledWith("update_qa_simulation", {
      p_category_ranks: ranksAt(5),
      p_simulate_all_achievements: false,
    });
    expect(rpc.mock.calls[1][1]).not.toHaveProperty("user_id");
  });

  it("rejects malformed server state and reports RPC failures", async () => {
    rpc
      .mockResolvedValueOnce({
        data: {
          ...serverSimulation(),
          category_ranks: { ...ranksAt(30), space: 31 },
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: { message: "Denied" } });

    await expect(fetchQaSimulation()).rejects.toThrow(
      "invalid space rank",
    );
    await expect(fetchQaSimulation()).rejects.toThrow("Denied");
  });

  it("maps max simulated progress through the shared badge and theme catalogues", async () => {
    rpc.mockResolvedValueOnce({
      error: null,
      data: {
        is_simulated: true,
        categories: PLAYABLE_CATEGORIES.map((category) => ({
          category,
          xp: 70_295,
          rank: 30,
          title: `${category} master`,
          questions_answered: 0,
          perfect_answers: 0,
          rank_floor_xp: 70_295,
          next_rank_xp: 73_961,
          simulated: true,
        })),
        achievements: [{
          achievement_id: "qa-achievement",
          name: "QA Achievement",
          description: "Simulated only.",
          tier: "gold",
          progress: 1,
          threshold: 1,
          earned: true,
          sort_order: 1,
          simulated: true,
        }],
      },
    });

    const progress = await fetchProgress("qa-player", true);

    expect(progress.isSimulated).toBe(true);
    expect(progress.badges).toHaveLength(60);
    expect(progress.badges.every((badge) => badge.earned)).toBe(true);
    expect(progress.achievements[0]).toMatchObject({
      earned: true,
      simulated: true,
    });
    expect(BACKGROUND_THEMES).toHaveLength(6);
    expect(BACKGROUND_THEMES.every((theme) => isThemeUnlocked(progress, theme)))
      .toBe(true);
  });
});

describe("QA simulation controls", () => {
  it("supports max, reset, presets, an individual rank and achievements", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <QaSimulationControls
        simulation={{
          categoryRanks: ranksAt(30),
          simulateAllAchievements: true,
        }}
        status="ready"
        error=""
        labels={labels}
        onSave={onSave}
        onRetry={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reset simulation" }));
    expect(screen.getByLabelText("Space simulated rank")).toHaveValue("1");
    expect(screen.getByRole("checkbox")).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: "Rank 15" }));
    expect(screen.getByLabelText("History simulated rank")).toHaveValue("15");
    fireEvent.change(screen.getByLabelText("Space simulated rank"), {
      target: { value: "25" },
    });
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Save simulation" }));

    expect(onSave).toHaveBeenCalledWith({
      categoryRanks: { ...ranksAt(15), space: 25 },
      simulateAllAchievements: true,
    });

    await user.click(screen.getByRole("button", { name: "Max account" }));
    expect(screen.getByLabelText("Games simulated rank")).toHaveValue("30");
  });

  it("shows load and save failure states with a retry action", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const view = render(
      <QaSimulationControls
        simulation={null}
        status="error"
        error="Simulation denied"
        labels={labels}
        onSave={vi.fn()}
        onRetry={retry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Simulation denied");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();

    view.rerender(
      <QaSimulationControls
        simulation={{
          categoryRanks: ranksAt(5),
          simulateAllAchievements: false,
        }}
        status="error"
        error="Could not save"
        labels={labels}
        onSave={vi.fn().mockRejectedValue(new Error("Could not save"))}
        onRetry={retry}
      />,
    );
    expect(screen.getByText("Could not save")).toBeInTheDocument();
  });
});
