import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ChallengeResultCallout,
  type ChallengeSubmitState,
} from "@/src/ChallengeUI";

const opponent = {
  id: "player-2",
  displayName: "Grace",
  avatarKey: "event-horizon" as const,
};

function renderCallout(state: ChallengeSubmitState) {
  render(
    <ChallengeResultCallout
      state={state}
      onRetry={vi.fn()}
      onShare={vi.fn()}
      onBack={vi.fn()}
      onRematch={vi.fn()}
      shareStatus=""
    />,
  );
}

describe("ChallengeResultCallout", () => {
  it("keeps the challenger score hidden while showing the seven-day deadline", () => {
    renderCallout({
      status: "sent",
      challenge: {
        id: "challenge-1",
        format: "classic",
        classicMode: "space",
        state: "pending",
        role: "challenger",
        opponent,
        myResult: 9000,
        opponentResult: null,
        activatedAt: "2026-08-02T10:00:00Z",
        expiresAt: "2026-08-09T10:00:00Z",
        completedAt: null,
        createdAt: "2026-08-02T09:00:00Z",
      },
    });

    expect(screen.getByRole("heading", { name: /Grace is up next/i })).toBeVisible();
    expect(screen.getByText(/score stays hidden/i)).toBeVisible();
    expect(screen.queryByText("9,000 points")).toBeNull();
  });

  it("reveals both results and a win only when the match is complete", () => {
    renderCallout({
      status: "sent",
      challenge: {
        id: "challenge-1",
        format: "survival",
        classicMode: null,
        state: "completed",
        role: "recipient",
        opponent,
        myResult: 8,
        opponentResult: 6,
        activatedAt: "2026-08-02T10:00:00Z",
        expiresAt: "2026-08-09T10:00:00Z",
        completedAt: "2026-08-03T10:00:00Z",
        createdAt: "2026-08-02T09:00:00Z",
      },
    });

    expect(screen.getByRole("heading", { name: "You won." })).toBeVisible();
    expect(screen.getByText("8 survived")).toBeVisible();
    expect(screen.getByText("6 survived")).toBeVisible();
    expect(screen.getByRole("button", { name: "Rematch" })).toBeVisible();
  });
});
