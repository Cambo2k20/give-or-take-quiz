import type { ComponentProps } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DailyHero } from "@/src/DailyHero";
import type { DailySet, QuestionCategory } from "@/lib/types";

/** Five questions across five subjects, as a real daily set is. */
function fixtureSet(): DailySet {
  const categories: QuestionCategory[] = [
    "geography",
    "history",
    "science",
    "space",
    "animals",
  ];
  return {
    date: "2026-07-28",
    questions: categories.map((category, index) => ({
      id: `fixture-${index + 1}`,
      category,
      measure: "physics" as const,
      subtype: "duration" as const,
      prompt: `Fixture question ${index + 1}, how long?`,
      answer: 40 + index,
      min: 1,
      max: 100,
      scale: "linear" as const,
      unit: "second" as const,
      source: { title: "Fixture source", url: "https://example.com/fixture" },
      explanation: "A fixture question used only by the test suite.",
    })),
  };
}

function renderHero(overrides: Partial<ComponentProps<typeof DailyHero>> = {}) {
  const callbacks = {
    onPlay: vi.fn(),
    onReplay: vi.fn(),
    onOpenBoard: vi.fn(),
    onShare: vi.fn(),
  };

  render(
    <DailyHero
      set={fixtureSet()}
      streak={0}
      today={undefined}
      rank={null}
      boardEnabled
      shareStatus=""
      {...callbacks}
      {...overrides}
    />,
  );

  return callbacks;
}

describe("DailyHero", () => {
  describe("before today's puzzle is played", () => {
    it("offers the puzzle with its shape and streak", async () => {
      const user = userEvent.setup();
      const { onPlay } = renderHero({ streak: 4 });

      expect(screen.getByText(/5 questions/)).toBeInTheDocument();
      expect(screen.getByText(/5\s*subjects/)).toBeInTheDocument();
      expect(screen.getByText("4-day streak")).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: /play today's daily/i }),
      );
      expect(onPlay).toHaveBeenCalledOnce();
    });

    it("says so plainly when there is no streak to show", () => {
      renderHero({ streak: 0 });
      expect(screen.getByText("No streak yet")).toBeInTheDocument();
    });

    it("offers no score, board or replay before the puzzle is played", () => {
      renderHero();
      expect(document.querySelector(".daily-hero-score")).toBeNull();
      expect(
        screen.queryByRole("button", { name: /today's board/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /replay for practice/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("once today's puzzle is played", () => {
    const played = {
      officialScore: 1067,
      practiceBest: null,
      attemptCount: 1,
      officialPoints: [211, 212, 120, 95, 429],
    };

    it("leads with the official score and its per-question breakdown", () => {
      renderHero({ today: played, streak: 1 });

      expect(screen.getByText("1,067")).toBeInTheDocument();
      expect(screen.getByText("/ 5,000")).toBeInTheDocument();

      const blocks = screen.getByRole("list", { name: /question by question/i });
      const points = within(blocks)
        .getAllByRole("listitem")
        .map((item) => item.querySelector("strong")?.textContent);
      expect(points).toEqual(["211", "212", "120", "95", "429"]);
    });

    it("shows the daily rank once there is one", () => {
      renderHero({ today: played, rank: 7 });
      expect(screen.getByText("Daily rank #7")).toBeInTheDocument();
    });

    it("omits the rank when the player is not on the board", () => {
      renderHero({ today: played, rank: null });
      expect(screen.queryByText(/daily rank/i)).not.toBeInTheDocument();
    });

    it("routes the board, share and practice replay actions", async () => {
      const user = userEvent.setup();
      const { onOpenBoard, onShare, onReplay, onPlay } = renderHero({
        today: played,
      });

      await user.click(screen.getByRole("button", { name: /today's board/i }));
      await user.click(screen.getByRole("button", { name: /share result/i }));
      await user.click(
        screen.getByRole("button", { name: /replay for practice/i }),
      );

      expect(onOpenBoard).toHaveBeenCalledOnce();
      expect(onShare).toHaveBeenCalledOnce();
      expect(onReplay).toHaveBeenCalledOnce();
      // Replaying is a separate action from a first play.
      expect(onPlay).not.toHaveBeenCalled();
    });

    it("hides the board action when no leaderboard is configured", () => {
      renderHero({ today: played, boardEnabled: false });

      expect(
        screen.queryByRole("button", { name: /today's board/i }),
      ).not.toBeInTheDocument();
      // Sharing still stands on its own, so the hub is not left actionless.
      expect(
        screen.getByRole("button", { name: /share result/i }),
      ).toBeInTheDocument();
    });

    it("renders no breakdown for a score recorded without one", () => {
      renderHero({
        today: { officialScore: 1067, practiceBest: null, attemptCount: 1 },
      });

      expect(screen.getByText("1,067")).toBeInTheDocument();
      expect(
        screen.queryByRole("list", { name: /question by question/i }),
      ).not.toBeInTheDocument();
    });

    it("treats a zero score as played rather than missing", () => {
      renderHero({
        today: { officialScore: 0, practiceBest: null, attemptCount: 1 },
      });

      expect(screen.getByText("0")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /play today's daily/i }),
      ).not.toBeInTheDocument();
    });
  });
});
