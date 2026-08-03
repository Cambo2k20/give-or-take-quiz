import { describe, expect, it } from "vitest";

import {
  MASCOT_IN_GAMES_STORAGE_KEY,
  readMascotInGames,
  writeMascotInGames,
} from "@/src/mascot/mascotPreference";

describe("mascot game preference", () => {
  it("defaults off and persists either choice", () => {
    expect(readMascotInGames()).toBe(false);

    writeMascotInGames(true);
    expect(window.localStorage.getItem(MASCOT_IN_GAMES_STORAGE_KEY)).toBe(
      "true",
    );
    expect(readMascotInGames()).toBe(true);

    writeMascotInGames(false);
    expect(readMascotInGames()).toBe(false);
  });
});
