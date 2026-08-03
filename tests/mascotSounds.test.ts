import { describe, expect, it, vi } from "vitest";

import {
  mascotSoundForReaction,
  nextMascotHowlClip,
  playMascotSound,
} from "@/src/mascot/mascotSounds";

describe("mascot sounds", () => {
  it("uses quiet howls for Not bad and big howls for higher scores", () => {
    expect(mascotSoundForReaction("perfectAnswer")).toBe("bigHowl");
    expect(mascotSoundForReaction("closeAnswer")).toBe("bigHowl");
    expect(mascotSoundForReaction("averageAnswer")).toBe("quietHowl");
    expect(mascotSoundForReaction("wideAnswer")).toBe("growl");
    expect(mascotSoundForReaction("farAnswer")).toBeNull();
  });

  it("plays every quiet howl once before reshuffling", () => {
    const cycle = Array.from({ length: 3 }, () =>
      nextMascotHowlClip("quietHowl"),
    );

    expect(new Set(cycle)).toEqual(
      new Set(["howl1quiet.wav", "howl2quiet.wav", "howl3quiet.wav"]),
    );
  });

  it("plays both big howls once before reshuffling", () => {
    const cycle = Array.from({ length: 2 }, () =>
      nextMascotHowlClip("bigHowl"),
    );

    expect(new Set(cycle)).toEqual(
      new Set(["howl4big.wav", "howl5big.wav"]),
    );
  });

  it("fails quietly when recorded audio is unavailable", () => {
    vi.stubGlobal("Audio", undefined);
    expect(() => playMascotSound("averageAnswer")).not.toThrow();
    vi.unstubAllGlobals();
  });
});
