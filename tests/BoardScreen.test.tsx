import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ClassicLeaderboardRow } from "@/lib/leaderboard";
import { BoardScreen } from "@/src/BoardScreen";

const modes = [
  { mode: "science" as const, title: "Science" },
  { mode: "history" as const, title: "History" },
];

const labels = {
  population: "Population",
  history: "History",
  geography: "Geography",
  science: "Science",
  animals: "Animals",
  space: "Space",
  technology: "Technology",
  movies: "Movies",
  mixed: "Mixed",
};

const rows: ClassicLeaderboardRow[] = [
  {
    playerId: "ada",
    displayName: "Ada",
    category: "science",
    bestScore: 9200,
    roundsPlayed: 3,
    rank: 1,
    correctAnswers: 4,
    accuracy: 92,
    bestDate: "2026-07-27T09:00:00Z",
  },
  {
    playerId: "grace",
    displayName: "Grace",
    category: "history",
    bestScore: 8700,
    roundsPlayed: 2,
    rank: 1,
    correctAnswers: 2,
    accuracy: 87,
    bestDate: "2026-07-26T09:00:00Z",
  },
  {
    playerId: "ada",
    displayName: "Ada",
    category: "history",
    bestScore: 8100,
    roundsPlayed: 1,
    rank: 2,
    correctAnswers: 1,
    accuracy: 81,
    bestDate: "2026-07-25T09:00:00Z",
  },
];

function renderBoard() {
  const onFormatChange = vi.fn();
  const onReturnHome = vi.fn();
  render(
    <BoardScreen
      modes={modes}
      modeLabels={labels}
      rows={rows}
      loading={false}
      error={null}
      profile={{ id: "ada", displayName: "Ada" }}
      format="classic"
      onFormatChange={onFormatChange}
      onPlay={vi.fn()}
      onPlaySurvival={vi.fn()}
      onReturnHome={onReturnHome}
      headingRef={{ current: null }}
    />,
  );
  return { onFormatChange, onReturnHome };
}

describe("Classic leaderboard screen", () => {
  it("shows one combined detailed list by default", () => {
    renderBoard();

    expect(screen.getByText("Classic")).toBeInTheDocument();
    expect(screen.getByText("Survival")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /category/i })).toHaveValue(
      "all",
    );

    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getAllByText("Ada")).toHaveLength(2);
    expect(screen.getByText("Correct")).toBeInTheDocument();
    expect(screen.getByText("Accuracy")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
  });

  it("filters rows to a selected category and reranks the result", async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.selectOptions(
      screen.getByRole("combobox", { name: /category/i }),
      "history",
    );

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("Grace")).toBeInTheDocument();
    expect(within(items[0]).getByText("1")).toBeInTheDocument();
    expect(within(items[1]).getByText("Ada")).toBeInTheDocument();
    expect(within(items[1]).getByText("2")).toBeInTheDocument();
  });

  it("keeps Survival available and labels the left action Return to Home", async () => {
    const user = userEvent.setup();
    const { onFormatChange, onReturnHome } = renderBoard();

    await user.click(screen.getByRole("button", { name: "Survival" }));
    expect(onFormatChange).toHaveBeenCalledWith("survival");

    await user.click(screen.getByRole("button", { name: "Return to Home" }));
    expect(onReturnHome).toHaveBeenCalledOnce();
  });
});
