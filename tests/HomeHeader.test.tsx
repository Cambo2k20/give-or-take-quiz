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
    onOpenLeaderboard: vi.fn(),
    onOpenAccount: vi.fn(),
    onToggleTheme: vi.fn(),
  };

  render(
    <HomeHeader
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
  it("keeps the compact brand and global navigation controls together", async () => {
    const user = userEvent.setup();
    const callbacks = renderHeader({
      musicControls: <button type="button">Music</button>,
    });

    const header = document.querySelector(".home-header-redesign");
    expect(header).not.toBeNull();
    expect(
      within(header as HTMLElement).getByRole("button", { name: "Music" }),
    ).toBeInTheDocument();
    expect(document.querySelector(".home-header-music")).not.toBeNull();
    expect(
      within(header as HTMLElement).getByRole("button", {
        name: "Switch to light mode",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Give or Take home" }));
    await user.click(screen.getByRole("button", { name: "Leaderboard" }));
    await user.click(screen.getByRole("button", { name: "Profile, Cambo" }));
    await user.click(
      screen.getByRole("button", { name: "Switch to light mode" }),
    );

    expect(callbacks.onHome).toHaveBeenCalledOnce();
    expect(callbacks.onOpenLeaderboard).toHaveBeenCalledOnce();
    expect(callbacks.onOpenAccount).toHaveBeenCalledOnce();
    expect(callbacks.onToggleTheme).toHaveBeenCalledOnce();
  });

  it("shows social updates without adding the account name to the compact label", () => {
    renderHeader({
      socialUnreadCount: 3,
      theme: "light",
    });

    expect(screen.getByText("3")).toHaveAccessibleName("3 unread friend updates");
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.queryByText("Cambo")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    ).toBeInTheDocument();
  });

  it("keeps global navigation when leaderboard data is unavailable", async () => {
    const user = userEvent.setup();
    const callbacks = renderHeader({ leaderboardEnabled: false });

    const leaderboard = screen.getByRole("button", { name: "Leaderboard" });
    const profile = screen.getByRole("button", { name: "Profile, Cambo" });
    expect(leaderboard).toHaveAttribute(
      "title",
      "Leaderboard data is unavailable in this local setup",
    );
    expect(profile).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toBeInTheDocument();

    await user.click(leaderboard);
    await user.click(profile);
    expect(callbacks.onOpenLeaderboard).toHaveBeenCalledOnce();
    expect(callbacks.onOpenAccount).toHaveBeenCalledOnce();
  });

  it("uses the existing sign-in destination for signed-out players", () => {
    renderHeader({ accountLabel: "Sign in" });

    expect(
      screen.getByRole("button", { name: "Profile, sign in" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

});
