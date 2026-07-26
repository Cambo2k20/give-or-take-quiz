import {
  BACKGROUND_THEMES,
  type BackgroundThemeId,
} from "./themes";

/**
 * Which unlocked background is currently applied behind the whole app, if
 * any. Mirrors theme.ts's read/apply pair: same storage pattern and the same
 * DOM-attribute mechanism. A custom theme owns its canonical UI while active,
 * but never overwrites the saved light/dark preference underneath it.
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

function normaliseThemeId(themeId: string | null): BackgroundThemeId | null {
  return themeId && KNOWN_THEME_IDS.has(themeId)
    ? (themeId as BackgroundThemeId)
    : null;
}

export function readEquippedBackgroundTheme(): BackgroundThemeId | null {
  if (typeof document !== "undefined") {
    const applied = normaliseThemeId(
      document.documentElement.dataset.bgTheme ?? null,
    );
    if (applied) return applied;

    // Do not leave an unknown value on the root if markup or another script
    // supplied one. CSS ignores it, but the DOM should still reflect reality.
    delete document.documentElement.dataset.bgTheme;
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
      }
      return saved;
    }

    window.localStorage.removeItem(BACKGROUND_THEME_STORAGE_KEY);
  } catch {
    // Disabled storage just means no background is equipped.
  }

  return null;
}

export function applyBackgroundTheme(themeId: string | null) {
  const next = normaliseThemeId(themeId);

  if (typeof document !== "undefined") {
    if (next) {
      document.documentElement.dataset.bgTheme = next;
    } else {
      delete document.documentElement.dataset.bgTheme;
    }
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
