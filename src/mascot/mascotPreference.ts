export const MASCOT_IN_GAMES_STORAGE_KEY =
  "give-or-take:mascot-in-games";

export function readMascotInGames(): boolean {
  try {
    return window.localStorage.getItem(MASCOT_IN_GAMES_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeMascotInGames(enabled: boolean): void {
  try {
    window.localStorage.setItem(
      MASCOT_IN_GAMES_STORAGE_KEY,
      String(enabled),
    );
  } catch {
    // The preference still applies for this session when storage is unavailable.
  }
}
