import {
  BACKGROUND_THEME_UI_TOKEN_NAMES,
  BACKGROUND_THEMES,
  getThemeModeVariant,
  type BackgroundTheme,
  type BackgroundThemeId,
  type BackgroundThemeMode,
} from "./themes";

/**
 * The selected background is a local cosmetic preference. Selection and
 * activation are deliberately separate: a light-only or dark-only theme
 * remains selected while the app is in its unsupported mode.
 */
export const BACKGROUND_THEME_STORAGE_KEY = "give-or-take:background:v1";

const KNOWN_THEME_IDS: ReadonlySet<string> = new Set(
  BACKGROUND_THEMES.map((theme) => theme.id),
);

export function normaliseBackgroundThemeId(
  themeId: string | null,
): BackgroundThemeId | null {
  return themeId && KNOWN_THEME_IDS.has(themeId)
    ? (themeId as BackgroundThemeId)
    : null;
}

export function backgroundThemeById(
  themeId: BackgroundThemeId,
): BackgroundTheme {
  return BACKGROUND_THEMES.find((theme) => theme.id === themeId)!;
}

/**
 * One source of truth for resolving the active application mode when a caller
 * does not already have it. An explicit mode wins, followed by the pre-paint
 * root attribute, then the system preference.
 */
export function resolveThemeMode(
  mode?: BackgroundThemeMode,
): BackgroundThemeMode {
  if (mode) return mode;

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

function clearUiTokenPalette() {
  if (typeof document === "undefined") return;

  const rootStyle = document.documentElement.style;
  for (const name of BACKGROUND_THEME_UI_TOKEN_NAMES) {
    rootStyle.removeProperty(name);
  }

  // Clean up artwork properties written by the pre-v2 implementation. New
  // artwork tokens live only on component wrappers.
  for (let index = rootStyle.length - 1; index >= 0; index -= 1) {
    const name = rootStyle.item(index);
    if (name.startsWith("--artwork-")) rootStyle.removeProperty(name);
  }
}

/**
 * Synchronizes only semantic UI tokens. Artwork tokens are component-local
 * inline properties and never leak onto the root element.
 */
export function syncBackgroundThemePalette(
  mode: BackgroundThemeMode = resolveThemeMode(),
) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  clearUiTokenPalette();
  delete root.dataset.bgThemeActive;

  const selectedId = normaliseBackgroundThemeId(root.dataset.bgTheme ?? null);
  if (!selectedId) return;

  const variant = getThemeModeVariant(
    backgroundThemeById(selectedId),
    mode,
  );
  if (!variant) return;

  for (const name of BACKGROUND_THEME_UI_TOKEN_NAMES) {
    root.style.setProperty(name, variant.ui[name]);
  }
  root.dataset.bgThemeActive = selectedId;
}

export function readEquippedBackgroundTheme(): BackgroundThemeId | null {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    const selected = normaliseBackgroundThemeId(root.dataset.bgTheme ?? null);
    if (selected) {
      syncBackgroundThemePalette();
      return selected;
    }

    delete root.dataset.bgTheme;
    delete root.dataset.bgThemeActive;
    clearUiTokenPalette();
  }

  try {
    const saved = normaliseBackgroundThemeId(
      window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY),
    );
    if (saved) {
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

export function readActiveBackgroundTheme(): BackgroundThemeId | null {
  if (typeof document === "undefined") return null;
  return normaliseBackgroundThemeId(
    document.documentElement.dataset.bgThemeActive ?? null,
  );
}

export function applyBackgroundTheme(
  themeId: string | null,
  mode: BackgroundThemeMode = resolveThemeMode(),
) {
  const next = normaliseBackgroundThemeId(themeId);

  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (next) {
      root.dataset.bgTheme = next;
    } else {
      delete root.dataset.bgTheme;
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
