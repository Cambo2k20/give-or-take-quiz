import { describe, expect, it } from "vitest";
import {
  playerIdFromUrl,
  playerProfileReturnState,
  playerProfileShareUrl,
  pushPlayerProfileLink,
  replacePlayerProfileLink,
} from "@/lib/playerProfileLink";

describe("public player profile links", () => {
  it("reads a direct player target", () => {
    expect(
      playerIdFromUrl(
        "https://giveortakequiz.com/?theme=dark&player=player-123",
      ),
    ).toBe("player-123");
  });

  it("preserves the current path while replacing a challenge target", () => {
    expect(
      playerProfileShareUrl(
        "player-456",
        "https://giveortakequiz.com/give-or-take-quiz/?challenge=old&theme=dark#board",
      ),
    ).toBe(
      "https://giveortakequiz.com/give-or-take-quiz/?theme=dark&player=player-456#board",
    );
  });

  it("adds and removes a player without losing the leaderboard URL state", () => {
    window.history.replaceState(
      {},
      "",
      "/give-or-take-quiz/?format=classic&category=space",
    );

    replacePlayerProfileLink("player-789");
    expect(window.location.search).toBe(
      "?format=classic&category=space&player=player-789",
    );

    replacePlayerProfileLink(null);
    expect(window.location.search).toBe("?format=classic&category=space");
  });

  it("keeps the return format and filter in refresh-safe history state", () => {
    window.history.replaceState({}, "", "/give-or-take-quiz/");

    pushPlayerProfileLink("player-1", {
      phase: "leaderboard",
      format: "survival",
      category: "animals",
    });

    expect(playerProfileReturnState()).toEqual({
      phase: "leaderboard",
      format: "survival",
      category: "animals",
    });
  });
});
