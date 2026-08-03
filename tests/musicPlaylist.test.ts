import { describe, expect, it } from "vitest";

import { MUSIC_TRACKS, trackFromAsset } from "@/src/musicPlaylist";

describe("music playlist", () => {
  it("auto-discovers every supplied track without duplicate URLs", () => {
    expect(MUSIC_TRACKS.length).toBeGreaterThanOrEqual(13);
    expect(new Set(MUSIC_TRACKS.map((track) => track.url)).size).toBe(
      MUSIC_TRACKS.length,
    );
    expect(
      MUSIC_TRACKS.some((track) => track.title === "Wildwood Acres"),
    ).toBe(true);
  });

  it("builds readable metadata from permanent-folder filenames", () => {
    expect(
      trackFromAsset(
        "./assets/music/camila_noir-soft-lofi-soundscape-326851.mp3",
        "/track.mp3",
      ),
    ).toEqual({
      artist: "Camila Noir",
      fileName: "camila_noir-soft-lofi-soundscape-326851.mp3",
      title: "Soft Lofi Soundscape",
      url: "/track.mp3",
    });
  });
});
