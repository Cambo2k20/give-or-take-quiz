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
    onToggleSoundEffects: vi.fn(),
    onToggleTheme: vi.fn(),
  };

  render(
    <HomeHeader
      leaderboardEnabled
      accountLabel="Cambo"
      soundEffectsEnabled
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
      within(header as HTMLElement).getByRole("toolbar", {
        name: "Quick controls",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Give or Take")).toHaveClass(
      "home-header-wordmark-text",
    );
    expect(screen.getByText("Sound")).toBeInTheDocument();
    expect(screen.getByText("Board")).toBeInTheDocument();
    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(
      within(header as HTMLElement).getByRole("button", {
        name: "Switch to light mode",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Give or Take home" }));
    await user.click(
      screen.getByRole("button", { name: "Disable sound effects" }),
    );
    await user.click(screen.getByRole("button", { name: "Leaderboard" }));
    await user.click(screen.getByRole("button", { name: "Profile, Cambo" }));
    await user.click(
      screen.getByRole("button", { name: "Switch to light mode" }),
    );

    expect(callbacks.onHome).toHaveBeenCalledOnce();
    expect(callbacks.onToggleSoundEffects).toHaveBeenCalledOnce();
    expect(callbacks.onOpenLeaderboard).toHaveBeenCalledOnce();
    expect(callbacks.onOpenAccount).toHaveBeenCalledOnce();
    expect(callbacks.onToggleTheme).toHaveBeenCalledOnce();
  });

  it("shows social updates on the profile-only avatar button", () => {
    renderHeader({
      socialUnreadCount: 3,
      theme: "light",
    });

    expect(screen.getByText("3")).toHaveAccessibleName("3 unread friend updates");
    expect(
      screen.getByRole("button", { name: "Profile, Cambo" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Profile")).toBeNull();
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
    expect(screen.queryByText("Profile")).toBeNull();
  });

  it("exposes the inactive states without changing their destinations", () => {
    renderHeader({
      leaderboardActive: true,
      soundEffectsEnabled: false,
      theme: "light",
    });

    expect(screen.getByRole("button", { name: "Leaderboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("button", { name: "Enable sound effects" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

});
