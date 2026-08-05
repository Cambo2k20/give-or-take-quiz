import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BADGE_RANK_FLOORS,
  type PlayerProgress,
} from "@/lib/progress";
import { BACKGROUND_THEMES } from "@/lib/themes";
import type { QuestionCategory } from "@/lib/types";

const avatarApi = vi.hoisted(() => ({
  updateAvatar: vi.fn(),
  loadDailyHistory: vi.fn().mockResolvedValue([]),
}));

// A player mid-ladder: two subjects titled, the rest still Newcomer, and a
// mix of earned and unearned achievements.
const fixtureCategories: PlayerProgress["categories"] = [
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
  }));

const badgeTitles: Partial<Record<QuestionCategory, readonly string[]>> = {
  population: [
    "People Watcher",
    "Crowd Counter",
    "Census Scout",
    "Demography Detective",
    "Population Expert",
    "Sage of the Census",
  ],
  history: [
    "Time Tourist",
    "Past Pupil",
    "Chronicle Keeper",
    "Era Expert",
    "Timeline Sage",
    "Master of Ages",
  ],
  geography: [
    "Globe Gazer",
    "Terrain Tracker",
    "Atlas Scholar",
    "Meridian Master",
    "Famed Pathfinder",
    "Master of the Earth",
  ],
  science: [
    "Curious Mind",
    "Lab Assistant",
    "Theory Tester",
    "Formula Finder",
    "Master of Matter",
    "Architect of Reality",
  ],
  animals: [
    "Creature Curious",
    "Wildlife Tracker",
    "Species Specialist",
    "Creature Connoisseur",
    "Beast Whisperer",
    "Guardian of the Wild",
  ],
  space: [
    "Stargazer",
    "Orbit Scout",
    "Planet Pathfinder",
    "Cosmic Navigator",
    "Galactic Sage",
    "Oracle of the Cosmos",
  ],
  technology: [
    "Tinkerer",
    "Gadget Scout",
    "Machine Maker",
    "Engineering Expert",
    "Master Inventor",
    "Titan of Technology",
  ],
  movies: [
    "Casual Viewer",
    "Film Fan",
    "Screen Scholar",
    "Movie Maestro",
    "Cinema Savant",
    "Legend of the Silver Screen",
  ],
};

function fixtureBadges(
  categories: PlayerProgress["categories"] = fixtureCategories,
): PlayerProgress["badges"] {
  const rankByCategory = new Map(
    categories.map((entry) => [entry.category, entry.rank]),
  );
  return Object.entries(badgeTitles).flatMap(([rawCategory, titles]) => {
    const category = rawCategory as QuestionCategory;
    const rank = rankByCategory.get(category) ?? 1;
    const currentFloor = [...BADGE_RANK_FLOORS]
      .reverse()
      .find((floor) => floor <= rank);
    return titles.map((title, index) => {
      const rankFloor = BADGE_RANK_FLOORS[index];
      return {
        badgeKey: `${category}-${String(rankFloor).padStart(2, "0")}`,
        category,
        rankFloor,
        title,
        earned: rankFloor <= rank,
        current: rankFloor === currentFloor,
      };
    });
  });
}

const fixture: PlayerProgress = {
  totalXp: 9_400,
  categories: fixtureCategories,
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
  badges: fixtureBadges(),
  badgeCatalogueAvailable: true,
};

vi.mock("@/src/useAuth", () => ({
  useAuth: () => ({
    enabled: true,
    status: "signed-in" as const,
    user: { id: "user-1", email: "player@example.com", emailConfirmed: true },
    qaStatus: "not-qa" as const,
    isQa: false,
    canUseAccountIdentity: true,
    canSubmitCompetitiveScores: true,
    canUseSocialCompetition: true,
    canPersistLocalScores: true,
    retryQaCapability: vi.fn(),
    recovering: false,
    endRecovery: () => {},
  }),
}));

vi.mock("@/src/useLeaderboard", () => ({
  useLeaderboard: () => ({
    enabled: true,
    ready: true,
    profile: {
      id: "user-1",
      displayName: "Ada",
      avatarKey: "event-horizon" as const,
    },
    join: vi.fn(),
    saveDisplayName: vi.fn(),
    updateAvatar: avatarApi.updateAvatar,
    publish: vi.fn().mockResolvedValue(null),
    publishDaily: vi.fn().mockResolvedValue(null),
    publishSurvival: vi.fn().mockResolvedValue(null),
    loadDailyHistory: avatarApi.loadDailyHistory,
    submit: { status: "idle" as const },
    resetSubmit: vi.fn(),
    board: [],
    boardLoading: false,
    boardError: null,
    loadBoard: vi.fn().mockResolvedValue(undefined),
  }),
}));

function defaultProgress() {
  return {
    enabled: true,
    progress: fixture,
    change: null,
    refresh: vi.fn().mockResolvedValue(null),
    clearChange: vi.fn(),
  };
}

function progressAtRank(
  category: QuestionCategory,
  rank: number,
  title: string,
): PlayerProgress {
  const categories = fixture.categories.map((entry) =>
    entry.category === category ? { ...entry, rank, title } : entry,
  );
  return {
    ...fixture,
    categories,
    badges: fixtureBadges(categories),
  };
}

vi.mock("@/src/useProgress", () => ({ useProgress: vi.fn() }));

import Game from "@/src/Game";
import { ProgressRibbon, ResultProgressCard } from "@/src/Progress";
import { MASCOT_IN_GAMES_STORAGE_KEY } from "@/src/mascot/mascotPreference";
import { useProgress } from "@/src/useProgress";

beforeEach(() => {
  avatarApi.updateAvatar.mockReset().mockResolvedValue(undefined);
  vi.mocked(useProgress).mockImplementation(defaultProgress);
});

async function openAccount(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Profile, Ada" }));
  return screen.findByRole("heading", { name: /^ada$/i });
}

describe("progression screens", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("keeps the shared home header across account and rank pages", async () => {
    const user = userEvent.setup();
    render(<Game />);

    await openAccount(user);
    expect(document.querySelector(".home-header")).toBeInTheDocument();
    expect(document.querySelector(".site-header")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /rank details/i }));
    await screen.findByRole("heading", { name: /^ranks$/i });
    expect(document.querySelector(".home-header")).toBeInTheDocument();
    expect(document.querySelector(".site-header")).not.toBeInTheDocument();
  });

  it("opens a profile dashboard with subjects, achievements and backgrounds", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);

    expect(screen.getByRole("heading", { name: /subjects/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /achievements/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /backgrounds/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Crowd Counter")).toBeInTheDocument();
    expect(screen.getByText("First Steps")).toBeInTheDocument();
  });

  it("pairs social cards and jumps to the mascot companion accessibly", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    let reducedMotion = true;
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        get matches() {
          return reducedMotion;
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    render(<Game />);
    await openAccount(user);

    const publicCard = screen
      .getByRole("heading", { name: /public profile/i })
      .closest("section");
    const friendsCard = screen
      .getByRole("heading", { name: /^friends$/i })
      .closest("section");
    expect(publicCard?.parentElement).toBe(friendsCard?.parentElement);
    expect(publicCard?.parentElement).toHaveClass("profile-social-row");

    const companion = screen.getByRole("region", {
      name: /mascot companion/i,
    });
    expect(
      companion.querySelector(".profile-mascot-companion-art"),
    ).toHaveClass("gt-mascot-pose-sleeping");
    expect(companion.querySelector(".gt-pose-sleep-tail")).not.toBeNull();
    await user.click(
      screen.getByRole("button", { name: /visit mascot/i }),
    );

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "center",
    });
    expect(companion).toHaveFocus();
    expect(companion).toHaveClass("is-highlighted");

    reducedMotion = false;
    await user.click(
      screen.getByRole("button", { name: /visit mascot/i }),
    );
    expect(scrollIntoView).toHaveBeenLastCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });

  it("adds the mascot to scored games from the profile preference", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);

    const toggle = screen.getByRole("switch", {
      name: /show mascot in real games/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(window.localStorage.getItem(MASCOT_IN_GAMES_STORAGE_KEY)).toBe(
      "true",
    );

    await user.click(screen.getByRole("button", { name: /give or take home/i }));
    const historyButton = screen.getByRole("button", { name: /^History/ });
    await user.click(historyButton);

    await screen.findByRole("button", { name: /lock in guess/i });
    expect(
      document.querySelector(".game-screen .gt-mascot-layer"),
    ).toBeInTheDocument();
  });

  it("changes the profile avatar to an earned rank badge", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);

    await user.click(
      screen.getByRole("button", {
        name: /change avatar, currently event horizon/i,
      }),
    );

    expect(
      screen.getByRole("heading", { name: /choose your avatar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /people watcher/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /volcano/i }),
    ).toBeInTheDocument();
    for (const avatarName of [
      "Hermes",
      "Aphrodite",
      "Storm Rocket",
      "Aurora Longship",
      "Mayan Temple",
      "Valkyrie Helm",
      "Mjolnir",
    ]) {
      expect(
        screen.getByRole("button", { name: new RegExp(avatarName, "i") }),
      ).toBeInTheDocument();
    }
    expect(
      screen.queryByRole("button", { name: /census scout/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /people watcher/i }));

    expect(avatarApi.updateAvatar).toHaveBeenCalledWith("population-05");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Avatar updated.",
    );
  });

  it("opens ranks on its own screen", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);

    await user.click(screen.getByRole("button", { name: /rank details/i }));

    expect(
      await screen.findByRole("heading", { name: /^ranks$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^ranks$/i }).closest(
        ".rank-overview-toolbar",
      ),
    ).not.toBeNull();
    expect(document.querySelector(".progress-screen-hero")).toBeNull();
    expect(document.querySelector(".rank-overview-sheen")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByRole("combobox", { name: /choose a subject/i })).toHaveValue(
      "population",
    );
    expect(
      screen.getByRole("heading", { name: "Crowd Counter" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /population collection/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Time Tourist")).not.toBeInTheDocument();
    // Achievements are not along for the ride.
    expect(screen.queryByText("First Steps")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back to account/i }));
    expect(
      await screen.findByRole("heading", { name: /^ada$/i }),
    ).toBeInTheDocument();
  });

  it("opens the clicked Profile subject and lets the dropdown switch in place", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);

    await user.click(
      screen.getByRole("button", { name: /open history ranks/i }),
    );

    const subject = await screen.findByRole("combobox", {
      name: /choose a subject/i,
    });
    expect(subject).toHaveValue("history");
    expect(screen.getByRole("heading", { name: "Time Tourist" })).toBeInTheDocument();

    await user.selectOptions(subject, "space");
    expect(subject).toHaveValue("space");
    expect(
      screen.getByRole("heading", { name: /space collection/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("First badge at rank 5")).toBeInTheDocument();
  });

  it("keeps locked artwork visible while making locked titles unreadable", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);
    await user.click(screen.getByRole("button", { name: /rank details/i }));

    const lockedCard = await screen.findByRole("listitem", {
      name: "Rank 15, locked title",
    });
    const blurredTitle = screen.getByText("Census Scout");
    expect(lockedCard).toBeInTheDocument();
    expect(blurredTitle).toHaveClass("is-blurred");
    expect(blurredTitle).toHaveAttribute("aria-hidden", "true");
    expect(
      screen.queryByRole("listitem", { name: /Census Scout/i }),
    ).not.toBeInTheDocument();
  });

  it("shows all six titles earned at rank 30", async () => {
    vi.mocked(useProgress).mockReturnValue({
      enabled: true,
      progress: progressAtRank("population", 30, "Sage of the Census"),
      change: null,
      refresh: vi.fn().mockResolvedValue(null),
      clearChange: vi.fn(),
    });

    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);
    await user.click(screen.getByRole("button", { name: /rank details/i }));

    expect(await screen.findByText("6 of 6 earned")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sage of the Census" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("listitem", { name: /locked title/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps ranks usable when the badge catalogue is unavailable", async () => {
    vi.mocked(useProgress).mockReturnValue({
      enabled: true,
      progress: {
        ...fixture,
        badges: [],
        badgeCatalogueAvailable: false,
      },
      change: null,
      refresh: vi.fn().mockResolvedValue(null),
      clearChange: vi.fn(),
    });

    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);
    await user.click(screen.getByRole("button", { name: /rank details/i }));

    expect(await screen.findByText("Badges temporarily unavailable")).toBeInTheDocument();
    expect(screen.getByText(/Your ranks and XP are still available/i)).toBeInTheDocument();
    expect(screen.getByText("4,200 XP")).toBeInTheDocument();
  });

  it("opens achievements on its own screen, earned and unearned", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);

    await user.click(screen.getByRole("button", { name: /see all 2/i }));

    expect(
      await screen.findByRole("heading", { name: /^achievements$/i }),
    ).toBeInTheDocument();
    const shimmer = document.querySelector(
      ".progress-screen-hero-achievements .progress-screen-hero-sheen",
    );
    expect(shimmer).toHaveAttribute("aria-hidden", "true");
    expect(shimmer).not.toHaveClass("is-active");
    expect(screen.getByText("First Steps")).toBeInTheDocument();
    expect(screen.getByText("Regular")).toBeInTheDocument();
    // Unearned ones show how far off they are.
    expect(screen.getByText("8 / 25")).toBeInTheDocument();
    expect(screen.queryByText("Crowd Counter")).not.toBeInTheDocument();
  });

  it("shows Deep Space locked while Space is below its gate", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);

    await user.click(
      screen.getByRole("button", { name: /manage backgrounds/i }),
    );

    expect(
      await screen.findByRole("heading", { name: /^unlocks$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Deep Space")).toBeInTheDocument();
    expect(screen.getAllByText("Dark mode")).toHaveLength(
      BACKGROUND_THEMES.length,
    );
    // The fixture's Space rank is 1; the gate is rank 5 (Stargazer).
    expect(screen.getByText(/Space rank 1 \/ 5 for Stargazer/)).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Deep Space, locked")).queryByText(
        /^Unlocked/,
      ),
    ).not.toBeInTheDocument();
  });

  it("shows Deep Space unlocked once Space reaches its gate", async () => {
    vi.mocked(useProgress).mockReturnValue({
      enabled: true,
      progress: {
        ...fixture,
        categories: fixture.categories.map((entry) =>
          entry.category === "space"
            ? { ...entry, rank: 6, title: "Orbit Scout" }
            : entry,
        ),
      },
      change: null,
      refresh: vi.fn().mockResolvedValue(null),
      clearChange: vi.fn(),
    });

    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);

    await user.click(
      screen.getByRole("button", { name: /manage backgrounds/i }),
    );

    expect(
      await screen.findByText(/Unlocked · Space rank 5 · Stargazer/),
    ).toBeInTheDocument();
  });

  it("keeps Moonlit Library locked below History rank 5", async () => {
    vi.mocked(useProgress).mockReturnValue({
      enabled: true,
      progress: {
        ...fixture,
        categories: fixture.categories.map((entry) =>
          entry.category === "history"
            ? { ...entry, rank: 4, title: "Newcomer" }
            : entry,
        ),
      },
      change: null,
      refresh: vi.fn().mockResolvedValue(null),
      clearChange: vi.fn(),
    });

    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);
    await user.click(
      screen.getByRole("button", { name: /manage backgrounds/i }),
    );

    const lockedCard = await screen.findByLabelText(
      "Moonlit Library, locked",
    );
    expect(lockedCard).toHaveTextContent("History rank 4 / 5 for Time Tourist");
    expect(
      screen.queryByRole("button", { name: /Moonlit Library/i }),
    ).not.toBeInTheDocument();
  });

  it("unlocks, applies and removes Moonlit Library at History rank 5", async () => {
    vi.mocked(useProgress).mockReturnValue({
      enabled: true,
      progress: {
        ...fixture,
        categories: fixture.categories.map((entry) =>
          entry.category === "history"
            ? { ...entry, rank: 5, title: "Time Tourist" }
            : entry,
        ),
      },
      change: null,
      refresh: vi.fn().mockResolvedValue(null),
      clearChange: vi.fn(),
    });

    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);
    await user.click(
      screen.getByRole("button", { name: /manage backgrounds/i }),
    );

    expect(
      await screen.findByText(/Unlocked · History rank 5 · Time Tourist/),
    ).toBeInTheDocument();
    const card = screen.getByRole("button", { name: /Moonlit Library/i });
    expect(card).toHaveAttribute("aria-pressed", "false");

    await user.click(card);
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.dataset.bgTheme).toBe("moonlit-library");
    expect(document.documentElement.dataset.bgThemeActive).toBeUndefined();
    expect(screen.getByText("Applied in dark mode")).toBeInTheDocument();

    await user.click(card);
    expect(card).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement.dataset.bgTheme).toBeUndefined();
  });

  it("applies and removes an unlocked background from its card", async () => {
    vi.mocked(useProgress).mockReturnValue({
      enabled: true,
      progress: {
        ...fixture,
        categories: fixture.categories.map((entry) =>
          entry.category === "space"
            ? { ...entry, rank: 5, title: "Stargazer" }
            : entry,
        ),
      },
      change: null,
      refresh: vi.fn().mockResolvedValue(null),
      clearChange: vi.fn(),
    });

    const user = userEvent.setup();
    render(<Game />);
    await openAccount(user);
    await user.click(
      screen.getByRole("button", { name: /manage backgrounds/i }),
    );

    const card = await screen.findByRole("button", { name: /Deep Space/i });
    const modeToggle = screen.getByRole("button", {
      name: /Switch to dark mode/i,
    });
    expect(card).toHaveAttribute("aria-pressed", "false");
    expect(modeToggle).toBeEnabled();

    await user.click(card);
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.dataset.bgTheme).toBe("deep-space");
    expect(document.documentElement.dataset.bgThemeActive).toBeUndefined();
    expect(screen.getByText("Applied in dark mode")).toBeInTheDocument();
    expect(modeToggle).toBeEnabled();

    // Selection and activation are separate. The selected card remains a
    // working remove control even while its artwork is unsupported.
    await user.click(card);
    expect(card).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement.dataset.bgTheme).toBeUndefined();
    await user.click(card);
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Applied in dark mode")).toBeInTheDocument();

    await user.click(modeToggle);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.bgTheme).toBe("deep-space");
    expect(document.documentElement.dataset.bgThemeActive).toBe("deep-space");
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(
      screen.queryByText("Applied in dark mode"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Switch to light mode/i }),
    ).toBeEnabled();

    await user.click(card);
    expect(card).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement.dataset.bgTheme).toBeUndefined();
    expect(document.documentElement.dataset.bgThemeActive).toBeUndefined();
    expect(screen.queryByText("Applied")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Switch to light mode/i }),
    ).toBeEnabled();
  });

  it("shows earned titles on the home cards but never Newcomer", async () => {
    render(<Game />);

    // Population and History are titled; the other six are not.
    expect(screen.getByText(/Crowd Counter/)).toBeInTheDocument();
    expect(screen.getByText(/Time Tourist/)).toBeInTheDocument();
    expect(screen.queryByText(/Newcomer/)).not.toBeInTheDocument();
  });
});

describe("rank badge rewards", () => {
  it("shows exact XP movement in the score-screen rank card", () => {
    const labels = Object.fromEntries(
      fixture.categories.map((entry) => [
        entry.category,
        { title: entry.category[0].toUpperCase() + entry.category.slice(1) },
      ]),
    ) as Record<QuestionCategory, { title: string }>;

    render(
      <ResultProgressCard
        category="population"
        progress={fixture}
        change={{
          xpGained: [{ category: "population", xp: 120 }],
          rankUps: [],
          unlocked: [],
          badgesUnlocked: [],
        }}
        labels={labels}
      >
        <span>Saved as Ada</span>
      </ResultProgressCard>,
    );

    expect(
      screen.getByRole("progressbar", { name: /population rank progress/i }),
    ).toHaveAttribute("aria-valuenow", "4200");
    expect(screen.getByText(/\+120 XP this round/i)).toBeInTheDocument();
    expect(screen.getByText("Saved as Ada")).toBeInTheDocument();
    expect(screen.getByText(/Rank 15/i)).toBeInTheDocument();
  });

  it("announces the badge and suppresses the duplicate rank-up line", () => {
    const badge = progressAtRank(
      "population",
      5,
      "People Watcher",
    ).badges.find((item) => item.badgeKey === "population-05");
    if (!badge) throw new Error("Missing population badge fixture.");
    const labels = Object.fromEntries(
      fixture.categories.map((entry) => [
        entry.category,
        { title: entry.category[0].toUpperCase() + entry.category.slice(1) },
      ]),
    ) as Record<QuestionCategory, { title: string }>;

    render(
      <ProgressRibbon
        change={{
          xpGained: [],
          rankUps: [
            { category: "population", rank: 5, title: "People Watcher" },
          ],
          unlocked: [],
          badgesUnlocked: [badge],
        }}
        labels={labels}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Badge unlocked · Population · People Watcher · Rank 5",
    );
    expect(screen.queryByText("Population rank 5")).not.toBeInTheDocument();
  });
});
