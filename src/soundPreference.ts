export const SOUND_EFFECTS_STORAGE_KEY = "give-or-take:sound-effects:v1";

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;

export function readSoundEffectsEnabled(
  storage: ReadableStorage | null =
    typeof window === "undefined" ? null : window.localStorage,
): boolean {
  if (!storage) return true;

  try {
    const stored = storage.getItem(SOUND_EFFECTS_STORAGE_KEY);
    return stored === null ? true : stored !== "false";
  } catch {
    return true;
  }
}

export function writeSoundEffectsEnabled(
  enabled: boolean,
  storage: WritableStorage | null =
    typeof window === "undefined" ? null : window.localStorage,
) {
  if (!storage) return;

  try {
    storage.setItem(SOUND_EFFECTS_STORAGE_KEY, String(enabled));
  } catch {
    // The in-memory preference still applies when storage is unavailable.
  }
}
