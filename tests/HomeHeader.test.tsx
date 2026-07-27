import type { ComponentProps } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HomeHeader } from "@/src/HomeHeader";

function renderHeader(
  overrides: Partial<ComponentProps<typeof HomeHeader>> = {},
) {
  const callbacks = {
    onHome: vi.fn(),
    onPlayDaily: vi.fn(),
    onOpenArchive: vi.fn(),
    onOpenLeaderboard: vi.fn(),
    onOpenAccount: vi.fn(),
    onToggleTheme: vi.fn(),
  };

  render(
    <HomeHeader
      date="2026-07-27"
      streak={0}
      playedToday={false}
      score={null}
      archiveCount={3}
      leaderboardEnabled
      accountLabel="Cambo"
      theme="dark"
      {...callbacks}
      {...overrides}
    />,
  );

  return callbacks;
}

describe("HomeHeader", () => {
  it("merges the playable daily, centred brand, and navigation controls", async () => {
    const user = userEvent.setup();
    const callbacks = renderHeader();

    const daily = screen.getByRole("button", {
      name: "Play today's daily, Monday 27 July",
    });
    expect(screen.getByText("Mon 27 Jul")).toBeInTheDocument();
    expect(screen.getByText("No streak")).toBeInTheDocument();
    expect(screen.queryByText("Play")).not.toBeInTheDocument();
    const lowerRow = document.querySelector(".home-header-lower");
    expect(lowerRow).not.toBeNull();
    expect(
      within(lowerRow as HTMLElement).getByRole("button", {
        name: "Past dailies",
      }),
    ).toBeInTheDocument();
    expect(
      within(lowerRow as HTMLElement).getByRole("button", {
        name: "Switch to light mode",
      }),
    ).toBeInTheDocument();

    await user.click(daily);
    await user.click(screen.getByRole("button", { name: "Past dailies" }));
    await user.click(screen.getByRole("button", { name: "Give or Take home" }));
    await user.click(screen.getByRole("button", { name: "Leaderboard" }));
    await user.click(screen.getByRole("button", { name: "Cambo" }));
    await user.click(
      screen.getByRole("button", { name: "Switch to light mode" }),
    );

    expect(callbacks.onPlayDaily).toHaveBeenCalledOnce();
    expect(callbacks.onOpenArchive).toHaveBeenCalledOnce();
    expect(callbacks.onHome).toHaveBeenCalledOnce();
    expect(callbacks.onOpenLeaderboard).toHaveBeenCalledOnce();
    expect(callbacks.onOpenAccount).toHaveBeenCalledOnce();
    expect(callbacks.onToggleTheme).toHaveBeenCalledOnce();
  });

  it("announces replay score without adding visible density", () => {
    renderHeader({
      playedToday: true,
      score: 4321,
      streak: 3,
      archiveCount: 0,
      theme: "light",
    });

    expect(
      screen.getByRole("button", {
        name: "Replay today's daily, Monday 27 July. Your score is 4,321 out of 5,000 points",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("3 days")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Past dailies" })).toBeNull();
    expect(screen.queryByText("4,321")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    ).toBeInTheDocument();
  });

  it("keeps the theme control when leaderboard features are unavailable", () => {
    renderHeader({ leaderboardEnabled: false });

    expect(screen.queryByRole("button", { name: "Leaderboard" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cambo" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toBeInTheDocument();
  });

  it("uses the existing sign-in destination for signed-out players", () => {
    renderHeader({ accountLabel: "Sign in" });

    expect(
      screen.getByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

});
