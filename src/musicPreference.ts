export const MUSIC_PREFERENCE_STORAGE_KEY = "give-or-take:music:v1";

export type MusicPreference = Readonly<{
  muted: boolean;
  volume: number;
}>;

export const DEFAULT_MUSIC_PREFERENCE: MusicPreference = {
  muted: false,
  volume: 30,
};

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;

export function readMusicPreference(
  storage: ReadableStorage | null =
    typeof window === "undefined" ? null : window.localStorage,
): MusicPreference {
  if (!storage) return DEFAULT_MUSIC_PREFERENCE;

  try {
    const stored = JSON.parse(
      storage.getItem(MUSIC_PREFERENCE_STORAGE_KEY) ?? "null",
    ) as { muted?: unknown; volume?: unknown } | null;
    if (!stored || typeof stored !== "object") {
      return DEFAULT_MUSIC_PREFERENCE;
    }

    const volume =
      typeof stored.volume === "number" && Number.isFinite(stored.volume)
        ? Math.min(100, Math.max(0, Math.round(stored.volume)))
        : DEFAULT_MUSIC_PREFERENCE.volume;
    const muted =
      typeof stored.muted === "boolean"
        ? stored.muted
        : DEFAULT_MUSIC_PREFERENCE.muted;
    return { muted, volume };
  } catch {
    return DEFAULT_MUSIC_PREFERENCE;
  }
}

export function writeMusicPreference(
  preference: MusicPreference,
  storage: WritableStorage | null =
    typeof window === "undefined" ? null : window.localStorage,
) {
  if (!storage) return;
  storage.setItem(MUSIC_PREFERENCE_STORAGE_KEY, JSON.stringify(preference));
}
