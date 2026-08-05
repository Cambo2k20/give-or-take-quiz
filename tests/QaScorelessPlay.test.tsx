import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/formats", async () => {
  const actual = await vi.importActual<typeof import("@/lib/formats")>(
    "@/lib/formats",
  );
  return {
    ...actual,
    buildSurvivalDeck: () =>
      Array.from({ length: 4 }, (_, index) => ({
        id: `qa-survival-${index + 1}`,
        category: "science" as const,
        measure: "physics" as const,
        subtype: "duration" as const,
        prompt: `QA survival fixture ${index + 1}`,
        answer: 100,
        min: 0,
        max: 100,
        scale: "linear" as const,
        unit: "second" as const,
        source: { title: "Fixture", url: "https://example.test/fixture" },
        explanation: "Test fixture.",
      })),
  };
});

const api = vi.hoisted(() => ({
  account: "qa" as "qa" | "ordinary" | "guest" | "loading" | "error",
  profile: {
    id: "qa-user",
    displayName: "Testasaurus Rex",
    avatarKey: "event-horizon" as const,
  } as { id: string; displayName: string; avatarKey: "event-horizon" | "hermes" } | null,
  publish: vi.fn(),
  publishDaily: vi.fn(),
  publishSurvival: vi.fn(),
  saveDisplayName: vi.fn(),
  updateAvatar: vi.fn(),
  retryCapability: vi.fn(),
  progressPlayerIds: [] as Array<string | null>,
  socialPlayerIds: [] as Array<string | null>,
}));

vi.mock("@/src/useProgress", async () => {
  const actual = await vi.importActual<typeof import("@/src/useProgress")>(
    "@/src/useProgress",
  );
  return {
    ...actual,
    useProgress: (playerId: string | null, qaSimulation = false) => {
      api.progressPlayerIds.push(playerId);
      if (qaSimulation && playerId) {
        const categories = [
          "population", "history", "geography", "science", "animals",
          "space", "technology", "movies", "dinosaurs", "games",
        ] as const;
        return {
          enabled: true,
          progress: {
            isSimulated: true,
            totalXp: 702_950,
            categories: categories.map((category) => ({
              category,
              xp: 70_295,
              rank: 30,
              title: "QA Master",
              questionsAnswered: 0,
              perfectAnswers: 0,
              rankFloorXp: 70_295,
              nextRankXp: 73_961,
              fraction: 0,
              simulated: true,
            })),
            achievements: [],
            badges: [],
            badgeCatalogueAvailable: false,
          },
          change: null,
          refresh: vi.fn(),
          reload: vi.fn().mockResolvedValue(null),
          clearChange: vi.fn(),
        };
      }
      return actual.useProgress(playerId);
    },
  };
});

vi.mock("@/src/useQaSimulation", () => ({
  useQaSimulation: () => ({
    simulation: {
      categoryRanks: Object.fromEntries([
        "population", "history", "geography", "science", "animals",
        "space", "technology", "movies", "dinosaurs", "games",
      ].map((category) => [category, 30])),
      simulateAllAchievements: true,
    },
    status: "ready" as const,
    error: "",
    save: vi.fn(),
    retry: vi.fn(),
  }),
}));

vi.mock("@/src/useSocial", async () => {
  const actual = await vi.importActual<typeof import("@/src/useSocial")>(
    "@/src/useSocial",
  );
  return {
    ...actual,
    useSocial: (playerId: string | null) => {
      api.socialPlayerIds.push(playerId);
      return actual.useSocial(playerId);
    },
  };
});

vi.mock("@/src/useAuth", () => ({
  useAuth: () => {
    const signedIn = api.account === "qa" || api.account === "ordinary" || api.account === "error";
    const isQa = api.account === "qa";
    const ordinary = api.account === "ordinary";
    return {
      enabled: true,
      status: api.account === "guest"
        ? ("signed-out" as const)
        : api.account === "loading"
          ? ("loading" as const)
          : ("signed-in" as const),
      user: signedIn
        ? {
            id: isQa ? "qa-user" : "ordinary-user",
            email: isQa ? "qa@example.test" : "ordinary@example.test",
            emailConfirmed: true,
          }
        : null,
      qaStatus: isQa
        ? ("qa" as const)
        : ordinary
          ? ("not-qa" as const)
          : api.account === "error"
            ? ("error" as const)
            : ("idle" as const),
      isQa,
      canUseAccountIdentity: isQa || ordinary,
      canSubmitCompetitiveScores: ordinary,
      canUseSocialCompetition: ordinary,
      canPersistLocalScores: ordinary || api.account === "guest",
      retryQaCapability: api.retryCapability,
      recovering: false,
      endRecovery: () => {},
    };
  },
}));

vi.mock("@/src/useLeaderboard", () => ({
  useLeaderboard: () => ({
    enabled: true,
    ready: true,
    profile: api.profile,
    join: vi.fn(),
    saveDisplayName: api.saveDisplayName,
    updateAvatar: api.updateAvatar,
    publish: api.publish,
    publishDaily: api.publishDaily,
    publishSurvival: api.publishSurvival,
    loadDailyHistory: vi.fn().mockResolvedValue([]),
    myDailyRank: vi.fn().mockResolvedValue(null),
    submit: { status: "idle" as const },
    resetSubmit: vi.fn(),
    board: [],
    boardLoading: false,
    boardError: null,
    loadClassicBoard: vi.fn(),
    loadDailyBoard: vi.fn(),
    loadSurvivalBoard: vi.fn(),
  }),
}));

import Game from "@/src/Game";
import { readBestScores, writeBestScores } from "@/lib/game";
import {
  readDailyProgress,
  todayIso,
  writeDailyProgress,
} from "@/lib/daily";
import { readFormatRecords, writeFormatRecords } from "@/lib/formats";

async function playHistoryRound() {
  const user = userEvent.setup();
  render(<Game />);

  await user.click(screen.getByRole("button", { name: /^history/i }));
  for (let question = 1; question <= 5; question += 1) {
    await user.click(await screen.findByRole("button", { name: /lock in guess/i }));
    await user.click(
      await screen.findByRole("button", {
        name: question === 5 ? /see results/i : /next question/i,
      }),
    );
  }
}

async function playDailyRound() {
  const user = userEvent.setup();
  render(<Game />);

  await user.click(screen.getByRole("button", { name: /play today's daily/i }));
  for (let question = 1; question <= 5; question += 1) {
    await user.click(await screen.findByRole("button", { name: /lock in guess/i }));
    await user.click(
      await screen.findByRole("button", {
        name: question === 5 ? /see results/i : /next question/i,
      }),
    );
  }
}

async function playSurvivalRun() {
  const user = userEvent.setup();
  render(<Game />);

  await user.click(screen.getByRole("button", { name: /^survival$/i }));
  await user.click(screen.getByRole("button", { name: /^mixed/i }));
  for (let guard = 0; guard < 8; guard += 1) {
    const lock = screen.queryByRole("button", { name: /lock in guess/i });
    if (!lock) break;
    await user.click(lock);
    await user.click(
      await screen.findByRole("button", {
        name: /next question|see how far you got/i,
      }),
    );
  }
  expect(await screen.findByRole("heading", { name: /you lasted/i })).toBeInTheDocument();
}

describe("QA scoreless play", () => {
  beforeEach(() => {
    api.account = "qa";
    api.profile = {
      id: "qa-user",
      displayName: "Testasaurus Rex",
      avatarKey: "event-horizon",
    };
    api.publish.mockReset().mockResolvedValue(null);
    api.publishDaily.mockReset().mockResolvedValue(null);
    api.publishSurvival.mockReset().mockResolvedValue(null);
    api.saveDisplayName.mockReset().mockResolvedValue(null);
    api.updateAvatar.mockReset().mockResolvedValue(null);
    api.retryCapability.mockReset();
    api.progressPlayerIds.length = 0;
    api.socialPlayerIds.length = 0;
    window.localStorage.clear();
  });

  it("keeps a real QA identity in the header and account screen", async () => {
    const user = userEvent.setup();
    render(<Game />);

    expect(screen.getByText("QA mode · Results are not saved")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Profile, Testasaurus Rex" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Profile, Testasaurus Rex" }),
    );

    expect(
      screen.getByRole("heading", { name: "Testasaurus Rex" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/simulated rank 30/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Subjects")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Friends" })).toBeNull();
    expect(api.progressPlayerIds).toContain("qa-user");
    expect(api.socialPlayerIds.every((id) => id === null)).toBe(true);
  });

  it("hides device-local records from QA without erasing ordinary or guest progress", () => {
    const today = todayIso();
    writeBestScores({
      ...readBestScores(window.localStorage),
      history: 4321,
    });
    writeDailyProgress({
      current: 1,
      longest: 1,
      lastPlayedDate: today,
      dates: {
        [today]: {
          officialScore: 3210,
          practiceBest: null,
          attemptCount: 1,
        },
      },
    });
    writeFormatRecords({
      survivalBest: 7,
      survivalBestByMode: { history: 7 },
    });

    const view = render(<Game />);

    expect(screen.queryByText("Best 4,321")).toBeNull();
    expect(screen.queryByText("1-day streak")).toBeNull();
    expect(screen.getByText("QA results are not saved")).toBeInTheDocument();

    view.unmount();
    api.account = "ordinary";
    api.profile = {
      id: "ordinary-user",
      displayName: "Ordinary",
      avatarKey: "event-horizon",
    };
    render(<Game />);

    expect(screen.getByText("Best 4,321")).toBeInTheDocument();
    expect(screen.getByText("1-day streak")).toBeInTheDocument();
    expect(readFormatRecords(window.localStorage).survivalBest).toBe(7);
  });

  it("allows QA display-name editing and built-in avatar selection", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await user.click(
      screen.getByRole("button", { name: "Profile, Testasaurus Rex" }),
    );

    await user.click(
      screen.getByRole("button", { name: /change avatar, currently event horizon/i }),
    );
    await user.click(screen.getByRole("button", { name: /^Hermes/i }));
    expect(api.updateAvatar).toHaveBeenCalledWith("hermes");

    await user.click(screen.getByRole("button", { name: "Change display name" }));
    const input = screen.getByRole("textbox", { name: "Change display name" });
    await user.clear(input);
    await user.type(input, "QA Explorer");
    await user.click(screen.getByRole("button", { name: "Save display name" }));
    expect(api.saveDisplayName).toHaveBeenCalledWith("QA Explorer");
  });

  it("allows a QA account to create its initial display name", async () => {
    const user = userEvent.setup();
    api.profile = null;
    render(<Game />);

    await user.click(screen.getByRole("button", { name: /profile, qa@example.test/i }));
    const input = screen.getByRole("textbox", { name: "Create display name" });
    await user.type(input, "Testasaurus Rex");
    await user.click(screen.getByRole("button", { name: "Save display name" }));

    expect(api.saveDisplayName).toHaveBeenCalledWith("Testasaurus Rex");
  });

  it("shows a scoreless result without publishing or banking a local best", async () => {
    await playHistoryRound();

    expect(await screen.findByText(/QA play/i)).toBeInTheDocument();
    expect(api.publish).not.toHaveBeenCalled();
    expect(api.publishDaily).not.toHaveBeenCalled();
    expect(api.publishSurvival).not.toHaveBeenCalled();
    expect(readBestScores(window.localStorage).history).toBe(0);
    expect(screen.queryByText(/personal best/i)).toBeNull();
  });

  it("preserves ordinary account publishing and local best scores", async () => {
    api.account = "ordinary";
    api.profile = {
      id: "ordinary-user",
      displayName: "Ordinary",
      avatarKey: "event-horizon",
    };

    await playHistoryRound();

    expect(screen.queryByText(/QA play/i)).not.toBeInTheDocument();
    expect(api.publish).toHaveBeenCalledOnce();
    expect(readBestScores(window.localStorage).history).toBeGreaterThan(0);
    expect(api.progressPlayerIds).toContain("ordinary-user");
    expect(api.socialPlayerIds).toContain("ordinary-user");
  });

  it("keeps QA Daily scoreless locally and remotely", async () => {
    await playDailyRound();

    expect(await screen.findByText(/QA play/i)).toBeInTheDocument();
    expect(api.publishDaily).not.toHaveBeenCalled();
    expect(Object.keys(readDailyProgress(window.localStorage).dates)).toHaveLength(0);
  });

  it("keeps QA Survival scoreless locally and remotely", async () => {
    await playSurvivalRun();

    expect(screen.getByText(/QA play/i)).toBeInTheDocument();
    expect(api.publishSurvival).not.toHaveBeenCalled();
    expect(readFormatRecords(window.localStorage).survivalBest).toBe(0);
    expect(screen.queryByText(/your best run/i)).toBeNull();
  });

  it("preserves guest local Classic scores after auth resolves signed out", async () => {
    api.account = "guest";
    api.profile = null;

    await playHistoryRound();

    expect(api.publish).not.toHaveBeenCalled();
    expect(readBestScores(window.localStorage).history).toBeGreaterThan(0);
  });

  it("fails closed while authentication is loading", async () => {
    api.account = "loading";
    api.profile = null;

    await playHistoryRound();

    expect(readBestScores(window.localStorage).history).toBe(0);
    expect(screen.getByText(/checking sign-in/i)).toBeInTheDocument();
  });

  it("shows an accurate capability error and retry without saving locally", async () => {
    const user = userEvent.setup();
    api.account = "error";
    api.profile = null;

    await playHistoryRound();

    expect(readBestScores(window.localStorage).history).toBe(0);
    expect(
      screen.getByText(/account capability could not be verified/i),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Retry capability check" }),
    );
    expect(api.retryCapability).toHaveBeenCalledOnce();
    expect(screen.queryByText(/confirm your email/i)).toBeNull();
  });
});
