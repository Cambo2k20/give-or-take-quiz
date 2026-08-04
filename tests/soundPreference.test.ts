import { beforeEach, describe, expect, it } from "vitest";

import {
  SOUND_EFFECTS_STORAGE_KEY,
  readSoundEffectsEnabled,
  writeSoundEffectsEnabled,
} from "@/src/soundPreference";

describe("sound effects preference", () => {
  beforeEach(() => window.localStorage.clear());

  it("defaults to enabled", () => {
    expect(readSoundEffectsEnabled()).toBe(true);
  });

  it("persists enabled and disabled states", () => {
    writeSoundEffectsEnabled(false);
    expect(readSoundEffectsEnabled()).toBe(false);

    writeSoundEffectsEnabled(true);
    expect(readSoundEffectsEnabled()).toBe(true);
  });

  it("uses the safe enabled default for unknown stored values", () => {
    window.localStorage.setItem(SOUND_EFFECTS_STORAGE_KEY, "broken");
    expect(readSoundEffectsEnabled()).toBe(true);
  });
});
