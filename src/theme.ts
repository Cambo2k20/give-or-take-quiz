import {
  resolveThemeMode,
  syncBackgroundThemePalette,
} from "../lib/backgroundTheme";

export type Theme = "light" | "dark";

// Kept in sync with the pre-paint script in index.html, which applies a saved
// theme before React mounts so a dark preference never flashes light.
export const THEME_STORAGE_KEY = "give-or-take:theme";

export function readTheme(): Theme {
  if (typeof document !== "undefined") {
    const applied = document.documentElement.dataset.theme;
    if (applied === "light" || applied === "dark") return applied;
  }

  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Disabled storage just means we follow the system preference.
  }

  return resolveThemeMode();
}

export function syncTheme(theme: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
    // Keep an equipped custom theme on the same mode in this synchronous
    // update, before the browser can paint a frame with its previous tokens.
    syncBackgroundThemePalette(theme);
  }
}

export function applyTheme(theme: Theme) {
  syncTheme(theme);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // A theme that cannot be remembered still applies for this session.
  }
}

/**
 * Follows operating-system changes only while there is no explicit stored
 * preference. Returns an effect-friendly cleanup function.
 */
export function subscribeToSystemTheme(
  onChange: (theme: Theme) => void,
): () => void {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => {};
  }

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = (event: MediaQueryListEvent) => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark") return;
    } catch {
      // With unavailable storage there is no persistent explicit preference.
    }
    onChange(event.matches ? "dark" : "light");
  };

  media.addEventListener("change", handleChange);
  return () => media.removeEventListener("change", handleChange);
}
