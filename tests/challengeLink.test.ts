import { describe, expect, it } from "vitest";
import {
  challengeIdFromUrl,
  challengeShareUrl,
  replaceChallengeLink,
} from "@/lib/challengeLink";

describe("challenge links", () => {
  it("retains a target while authentication happens", () => {
    expect(
      challengeIdFromUrl(
        "https://giveortakequiz.com/?theme=dark&challenge=match-123",
      ),
    ).toBe("match-123");
  });

  it("builds a clean share link without carrying unrelated query or hash state", () => {
    expect(
      challengeShareUrl(
        "match-456",
        "https://giveortakequiz.com/give-or-take-quiz/?old=1#results",
      ),
    ).toBe(
      "https://giveortakequiz.com/give-or-take-quiz/?challenge=match-456",
    );
  });

  it("adds and removes the target in the current URL", () => {
    window.history.replaceState({}, "", "/give-or-take-quiz/?keep=yes");
    replaceChallengeLink("match-789");
    expect(window.location.search).toBe("?keep=yes&challenge=match-789");

    replaceChallengeLink(null);
    expect(window.location.search).toBe("?keep=yes");
  });
});
