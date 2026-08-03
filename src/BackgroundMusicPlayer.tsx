import { MusicNotesIcon } from "@phosphor-icons/react/dist/csr/MusicNotes";
import { SpeakerHighIcon } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import { SpeakerSlashIcon } from "@phosphor-icons/react/dist/csr/SpeakerSlash";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { MUSIC_TRACKS } from "./musicPlaylist";
import {
  readMusicPreference,
  writeMusicPreference,
  type MusicPreference,
} from "./musicPreference";

export function BackgroundMusicPlayer() {
  const [trackIndex, setTrackIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [preference, setPreference] = useState(readMusicPreference);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);
  const panelId = useId();
  const currentTrack = MUSIC_TRACKS[trackIndex];

  const attemptPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return false;

    try {
      const playback = audio.play();
      if (playback) await playback;
      startedRef.current = true;
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let disposed = false;

    const removeGestureListeners = () => {
      document.removeEventListener("pointerdown", startAfterGesture);
      document.removeEventListener("keydown", startAfterGesture);
    };
    const startAfterGesture = () => {
      void attemptPlayback().then((started) => {
        if (started && !disposed) removeGestureListeners();
      });
    };

    startAfterGesture();
    document.addEventListener("pointerdown", startAfterGesture);
    document.addEventListener("keydown", startAfterGesture);

    return () => {
      disposed = true;
      removeGestureListeners();
    };
  }, [attemptPlayback]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = preference.volume / 100;
    audio.muted = preference.muted;
  }, [preference, trackIndex]);

  useEffect(() => {
    if (startedRef.current) void attemptPlayback();
  }, [attemptPlayback, trackIndex]);

  if (!currentTrack) return null;

  const savePreference = (nextPreference: MusicPreference) => {
    setPreference(nextPreference);
    writeMusicPreference(nextPreference);
  };
  const advanceTrack = () => {
    setTrackIndex((current) => (current + 1) % MUSIC_TRACKS.length);
  };
  const changeVolume = (event: ChangeEvent<HTMLInputElement>) => {
    savePreference({
      ...preference,
      volume: Number(event.currentTarget.value),
    });
  };
  const toggleMuted = () => {
    savePreference({ ...preference, muted: !preference.muted });
  };
  const silent = preference.muted || preference.volume === 0;

  return (
    <aside className="music-player" aria-label="Background music">
      {open && (
        <div className="music-player-panel" id={panelId}>
          <p className="music-player-kicker">Now playing</p>
          <p className="music-player-track" aria-live="polite">
            <strong>{currentTrack.title}</strong>
            <span>{currentTrack.artist}</span>
          </p>
          <label className="music-player-volume">
            <span>
              Volume <output>{preference.volume}%</output>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={preference.volume}
              onChange={changeVolume}
              aria-label="Music volume"
            />
          </label>
          <small>All tracks play in sequence and loop automatically.</small>
        </div>
      )}

      <div className="music-player-dock">
        <button
          className="music-player-open"
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          <MusicNotesIcon size={18} weight="bold" aria-hidden="true" />
          <span>Music</span>
        </button>
        <button
          className="music-player-mute"
          type="button"
          aria-label={preference.muted ? "Unmute music" : "Mute music"}
          aria-pressed={preference.muted}
          onClick={toggleMuted}
        >
          {silent ? (
            <SpeakerSlashIcon size={18} weight="bold" aria-hidden="true" />
          ) : (
            <SpeakerHighIcon size={18} weight="bold" aria-hidden="true" />
          )}
        </button>
      </div>

      <audio
        ref={audioRef}
        src={currentTrack.url}
        preload="auto"
        loop={MUSIC_TRACKS.length === 1}
        muted={preference.muted}
        onEnded={advanceTrack}
        onError={advanceTrack}
      />
    </aside>
  );
}
