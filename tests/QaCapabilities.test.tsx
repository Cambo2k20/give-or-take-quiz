import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
};

const api = vi.hoisted(() => ({
  currentUser: vi.fn(),
  capability: vi.fn(),
  listener: null as null | ((user: MockUser | null, event: string) => void),
}));

vi.mock("@/lib/auth", () => ({
  currentUser: api.currentUser,
  currentQaAccountCapability: api.capability,
  onAuthChange: (
    listener: (user: MockUser | null, event: string) => void,
  ) => {
    api.listener = listener;
    return () => {
      api.listener = null;
    };
  },
}));

vi.mock("@/lib/supabase", () => ({
  leaderboardEnabled: true,
}));

import { useAuth } from "@/src/useAuth";

const confirmed = (id: string): MockUser => ({
  id,
  email: `${id}@example.test`,
  emailConfirmed: true,
});

function AuthProbe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{auth.status}</span>
      <span data-testid="qa-status">{auth.qaStatus}</span>
      <span data-testid="identity">{String(auth.canUseAccountIdentity)}</span>
      <span data-testid="scores">{String(auth.canSubmitCompetitiveScores)}</span>
      <span data-testid="social">{String(auth.canUseSocialCompetition)}</span>
      <span data-testid="local">{String(auth.canPersistLocalScores)}</span>
      <span data-testid="user">{auth.user?.id ?? "none"}</span>
      <button type="button" onClick={auth.retryQaCapability}>Retry</button>
    </div>
  );
}

beforeEach(() => {
  api.listener = null;
  api.currentUser.mockReset();
  api.capability.mockReset();
});

describe("QA account capability state", () => {
  it("fails closed while auth loads, then enables guest-only local persistence", async () => {
    let resolveSession: ((user: MockUser | null) => void) | null = null;
    api.currentUser.mockReturnValue(
      new Promise<MockUser | null>((resolve) => {
        resolveSession = resolve;
      }),
    );

    render(<AuthProbe />);

    expect(screen.getByTestId("auth-status")).toHaveTextContent("loading");
    expect(screen.getByTestId("local")).toHaveTextContent("false");

    await act(async () => resolveSession?.(null));

    expect(screen.getByTestId("auth-status")).toHaveTextContent("signed-out");
    expect(screen.getByTestId("local")).toHaveTextContent("true");
  });

  it("separates QA identity from scores and social competition", async () => {
    api.currentUser.mockResolvedValue(confirmed("qa-user"));
    api.capability.mockResolvedValue(true);

    render(<AuthProbe />);

    await waitFor(() =>
      expect(screen.getByTestId("qa-status")).toHaveTextContent("qa"),
    );
    expect(screen.getByTestId("identity")).toHaveTextContent("true");
    expect(screen.getByTestId("scores")).toHaveTextContent("false");
    expect(screen.getByTestId("social")).toHaveTextContent("false");
    expect(screen.getByTestId("local")).toHaveTextContent("false");
  });

  it("shows a capability error until an explicit retry succeeds", async () => {
    const user = userEvent.setup();
    api.currentUser.mockResolvedValue(confirmed("qa-user"));
    api.capability
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(true);

    render(<AuthProbe />);

    await waitFor(() =>
      expect(screen.getByTestId("qa-status")).toHaveTextContent("error"),
    );
    expect(screen.getByTestId("identity")).toHaveTextContent("false");
    expect(screen.getByTestId("local")).toHaveTextContent("false");

    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(screen.getByTestId("qa-status")).toHaveTextContent("qa"),
    );
    expect(api.capability).toHaveBeenCalledTimes(2);
  });

  it("does not leak capability state while accounts switch", async () => {
    api.currentUser.mockResolvedValue(confirmed("qa-user"));
    api.capability
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    render(<AuthProbe />);

    await waitFor(() =>
      expect(screen.getByTestId("qa-status")).toHaveTextContent("qa"),
    );

    act(() => api.listener?.(confirmed("ordinary-user"), "SIGNED_IN"));

    expect(screen.getByTestId("user")).toHaveTextContent("ordinary-user");
    expect(screen.getByTestId("qa-status")).toHaveTextContent("loading");
    expect(screen.getByTestId("identity")).toHaveTextContent("false");

    await waitFor(() =>
      expect(screen.getByTestId("qa-status")).toHaveTextContent("not-qa"),
    );
    expect(screen.getByTestId("scores")).toHaveTextContent("true");
    expect(screen.getByTestId("social")).toHaveTextContent("true");
  });
});
