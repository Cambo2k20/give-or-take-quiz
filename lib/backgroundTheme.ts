import {
  BACKGROUND_THEME_TOKEN_NAMES,
  BACKGROUND_THEMES,
  type BackgroundTheme,
  type BackgroundThemeId,
  type BackgroundThemePalettes,
} from "./themes";

/**
 * Which unlocked background is currently applied behind the whole app, if
 * any. Mirrors theme.ts's read/apply pair: same storage pattern and the same
 * DOM-attribute mechanism. A custom theme supplies a palette for both modes,
 * so `data-theme` and `data-bg-theme` remain independent, live axes.
 *
 * Deliberately a local device preference, not a server one. Whether a theme
 * is *unlocked* is derived from rank (see lib/themes.ts) and lives on the
 * server; which one is *equipped* right now is cosmetic UI state, same tier
 * as the light/dark toggle, so it costs nothing to keep it local.
 */
export const BACKGROUND_THEME_STORAGE_KEY = "give-or-take:background:v1";

const KNOWN_THEME_IDS: ReadonlySet<string> = new Set(
  BACKGROUND_THEMES.map((theme) => theme.id),
);

export type BackgroundThemeMode = keyof BackgroundThemePalettes;

function normaliseThemeId(themeId: string | null): BackgroundThemeId | null {
  return themeId && KNOWN_THEME_IDS.has(themeId)
    ? (themeId as BackgroundThemeId)
    : null;
}

function themeById(themeId: BackgroundThemeId): BackgroundTheme {
  return BACKGROUND_THEMES.find((theme) => theme.id === themeId)!;
}

function currentMode(): BackgroundThemeMode {
  if (typeof document !== "undefined") {
    const applied = document.documentElement.dataset.theme;
    if (applied === "light" || applied === "dark") return applied;
  }

  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function clearTokenPalette() {
  if (typeof document === "undefined") return;

  for (const name of BACKGROUND_THEME_TOKEN_NAMES) {
    document.documentElement.style.removeProperty(name);
  }
}

/**
 * Replaces the complete inline palette in one synchronous task. Clearing first
 * prevents a removed or future theme with different values leaving stale
 * custom properties behind; the registry type ensures the next palette is
 * complete before it can compile.
 */
export function syncBackgroundThemePalette(
  mode: BackgroundThemeMode = currentMode(),
) {
  if (typeof document === "undefined") return;

  clearTokenPalette();
  const themeId = normaliseThemeId(
    document.documentElement.dataset.bgTheme ?? null,
  );
  if (!themeId) return;

  const palette = themeById(themeId).tokens[mode];
  for (const name of BACKGROUND_THEME_TOKEN_NAMES) {
    document.documentElement.style.setProperty(name, palette[name]);
  }
}

export function readEquippedBackgroundTheme(): BackgroundThemeId | null {
  if (typeof document !== "undefined") {
    const applied = normaliseThemeId(
      document.documentElement.dataset.bgTheme ?? null,
    );
    if (applied) {
      syncBackgroundThemePalette();
      return applied;
    }

    // Do not leave an unknown value on the root if markup or another script
    // supplied one. CSS ignores it, but the DOM should still reflect reality.
    delete document.documentElement.dataset.bgTheme;
    clearTokenPalette();
  }

  try {
    const saved = normaliseThemeId(
      window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY),
    );
    if (saved) {
      // Restore the visual state as well as the React state. Without this,
      // reloads showed "Applied" on the card while the artwork stayed hidden.
      if (typeof document !== "undefined") {
        document.documentElement.dataset.bgTheme = saved;
        syncBackgroundThemePalette();
      }
      return saved;
    }

    window.localStorage.removeItem(BACKGROUND_THEME_STORAGE_KEY);
  } catch {
    // Disabled storage just means no background is equipped.
  }

  return null;
}

export function applyBackgroundTheme(
  themeId: string | null,
  mode: BackgroundThemeMode = currentMode(),
) {
  const next = normaliseThemeId(themeId);

  if (typeof document !== "undefined") {
    if (next) {
      document.documentElement.dataset.bgTheme = next;
    } else {
      delete document.documentElement.dataset.bgTheme;
    }
    syncBackgroundThemePalette(mode);
  }

  try {
    if (next) {
      window.localStorage.setItem(BACKGROUND_THEME_STORAGE_KEY, next);
    } else {
      window.localStorage.removeItem(BACKGROUND_THEME_STORAGE_KEY);
    }
  } catch {
    // A choice that cannot be remembered still applies for this session.
  }
}
