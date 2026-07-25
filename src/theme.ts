export type Theme = "light" | "dark";

// Kept in sync with the pre-paint script in index.html, which applies a saved
// theme before React mounts so a dark preference never flashes light.
export const THEME_STORAGE_KEY = "give-or-take:theme";

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

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

  return prefersDark() ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // A theme that cannot be remembered still applies for this session.
  }
}
