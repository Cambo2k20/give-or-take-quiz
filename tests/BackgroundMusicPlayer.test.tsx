import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { BackgroundMusicPlayer } from "@/src/BackgroundMusicPlayer";
import { MUSIC_TRACKS } from "@/src/musicPlaylist";
import { MUSIC_PREFERENCE_STORAGE_KEY } from "@/src/musicPreference";

describe("BackgroundMusicPlayer", () => {
  it("exposes persistent volume and mute controls", async () => {
    const user = userEvent.setup();
    const { container } = render(<BackgroundMusicPlayer />);

    await user.click(screen.getByRole("button", { name: /^music$/i }));
    const slider = screen.getByRole("slider", { name: /music volume/i });
    expect(slider).toHaveValue("30");
    expect(screen.getByText(MUSIC_TRACKS[0].title)).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: "64" } });
    expect(slider).toHaveValue("64");
    expect(
      JSON.parse(
        window.localStorage.getItem(MUSIC_PREFERENCE_STORAGE_KEY) ?? "null",
      ),
    ).toEqual({ muted: false, volume: 64 });

    const mute = screen.getByRole("button", { name: /mute music/i });
    await user.click(mute);
    expect(mute).toHaveAttribute("aria-pressed", "true");

    fireEvent.ended(container.querySelector("audio")!);
    expect(screen.getByText(MUSIC_TRACKS[1].title)).toBeInTheDocument();
  });
});
