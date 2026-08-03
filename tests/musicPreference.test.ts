import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_MUSIC_PREFERENCE,
  MUSIC_PREFERENCE_STORAGE_KEY,
  readMusicPreference,
  writeMusicPreference,
} from "@/src/musicPreference";

describe("music preference", () => {
  beforeEach(() => window.localStorage.clear());

  it("defaults to an audible but restrained volume", () => {
    expect(readMusicPreference()).toEqual(DEFAULT_MUSIC_PREFERENCE);
  });

  it("persists mute and volume settings", () => {
    writeMusicPreference({ muted: true, volume: 64 });

    expect(readMusicPreference()).toEqual({ muted: true, volume: 64 });
  });

  it("clamps stored volume and rejects malformed values", () => {
    window.localStorage.setItem(
      MUSIC_PREFERENCE_STORAGE_KEY,
      JSON.stringify({ muted: false, volume: 140.4 }),
    );
    expect(readMusicPreference()).toEqual({ muted: false, volume: 100 });

    window.localStorage.setItem(MUSIC_PREFERENCE_STORAGE_KEY, "broken");
    expect(readMusicPreference()).toEqual(DEFAULT_MUSIC_PREFERENCE);
  });
});
