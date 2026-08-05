import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerProfile } from "@/lib/leaderboard";

const api = vi.hoisted(() => ({
  currentProfile: vi.fn(),
}));

vi.mock("@/lib/leaderboard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/leaderboard")>(
    "@/lib/leaderboard",
  );
  return { ...actual, currentProfile: api.currentProfile };
});

vi.mock("@/lib/supabase", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase")>(
    "@/lib/supabase",
  );
  return { ...actual, leaderboardEnabled: true };
});

import { useLeaderboard } from "@/src/useLeaderboard";

function IdentityProbe({
  userId,
  allowed,
}: {
  userId: string;
  allowed: boolean;
}) {
  const identity = useLeaderboard(userId, allowed);
  return (
    <div>
      <span data-testid="ready">{String(identity.ready)}</span>
      <span data-testid="profile">{identity.profile?.displayName ?? "none"}</span>
    </div>
  );
}

beforeEach(() => {
  api.currentProfile.mockReset();
});

describe("account identity loading", () => {
  it("loads a profile whenever account identity is allowed, including QA", async () => {
    api.currentProfile.mockResolvedValue({
      id: "qa-user",
      displayName: "Testasaurus Rex",
      avatarKey: "hermes",
    } satisfies PlayerProfile);

    render(<IdentityProbe userId="qa-user" allowed />);

    await waitFor(() =>
      expect(screen.getByTestId("profile")).toHaveTextContent("Testasaurus Rex"),
    );
    expect(screen.getByTestId("ready")).toHaveTextContent("true");
  });

  it("does not load identity before capability resolution", () => {
    render(<IdentityProbe userId="qa-user" allowed={false} />);

    expect(api.currentProfile).not.toHaveBeenCalled();
    expect(screen.getByTestId("profile")).toHaveTextContent("none");
    expect(screen.getByTestId("ready")).toHaveTextContent("true");
  });

  it("does not leak a late profile response across account switches", async () => {
    let resolveFirst: ((profile: PlayerProfile) => void) | null = null;
    api.currentProfile
      .mockReturnValueOnce(
        new Promise<PlayerProfile>((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce({
        id: "ordinary-user",
        displayName: "Ordinary",
        avatarKey: "event-horizon",
      } satisfies PlayerProfile);

    const view = render(<IdentityProbe userId="qa-user" allowed />);
    view.rerender(<IdentityProbe userId="ordinary-user" allowed />);

    await waitFor(() =>
      expect(screen.getByTestId("profile")).toHaveTextContent("Ordinary"),
    );

    await act(async () => {
      resolveFirst?.({
        id: "qa-user",
        displayName: "Late QA",
        avatarKey: "hermes",
      });
    });

    expect(screen.getByTestId("profile")).toHaveTextContent("Ordinary");
  });
});
