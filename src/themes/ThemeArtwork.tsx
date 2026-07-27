import {
  createElement,
  type ComponentType,
  type CSSProperties,
} from "react";
import {
  BACKGROUND_THEMES,
  getThemeModeVariant,
  supportedModesForTheme,
  type BackgroundThemeArtworkTokenName,
  type BackgroundThemeArtworkTokenPalette,
  type BackgroundThemeId,
} from "../../lib/themes";
import type { Theme } from "../theme";

export type ThemeArtworkProps = {
  variant: "preview" | "backdrop";
  locked?: boolean;
  tokens: BackgroundThemeArtworkTokenPalette;
};

export type ThemeArtworkStyle = CSSProperties &
  Record<BackgroundThemeArtworkTokenName, string>;

type ThemeArtworkModule = {
  default: ComponentType<ThemeArtworkProps>;
  themeId: BackgroundThemeId;
};

const artworkModules = import.meta.glob<ThemeArtworkModule>(
  ["./*Artwork.tsx", "!./ThemeArtwork.tsx"],
  { eager: true },
);

function buildArtworkRegistry() {
  const artworkByTheme = new Map<
    BackgroundThemeId,
    ComponentType<ThemeArtworkProps>
  >();

  for (const [path, module] of Object.entries(artworkModules)) {
    if (artworkByTheme.has(module.themeId)) {
      throw new Error(
        `Duplicate artwork registration for "${module.themeId}" (${path}).`,
      );
    }
    artworkByTheme.set(module.themeId, module.default);
  }

  const knownThemeIds = new Set(BACKGROUND_THEMES.map((theme) => theme.id));
  for (const theme of BACKGROUND_THEMES) {
    if (!artworkByTheme.has(theme.id)) {
      throw new Error(`Missing artwork component for "${theme.id}".`);
    }
  }
  for (const themeId of artworkByTheme.keys()) {
    if (!knownThemeIds.has(themeId)) {
      throw new Error(`Artwork registered for unknown theme "${themeId}".`);
    }
  }

  return artworkByTheme;
}

const ARTWORK_BY_THEME = buildArtworkRegistry();

export const REGISTERED_THEME_ARTWORK_IDS = Object.freeze(
  [...ARTWORK_BY_THEME.keys()].sort(),
);

export function ThemeArtwork({
  themeId,
  mode,
  variant,
  locked = false,
}: Omit<ThemeArtworkProps, "tokens"> & {
  themeId: BackgroundThemeId | null;
  mode: Theme;
}) {
  if (!themeId) return null;

  const Artwork = ARTWORK_BY_THEME.get(themeId)!;
  const theme = BACKGROUND_THEMES.find((entry) => entry.id === themeId)!;
  const requestedModeVariant = getThemeModeVariant(theme, mode);
  const fallbackMode = supportedModesForTheme(theme)[0];
  const resolvedModeVariant =
    requestedModeVariant ??
    (variant === "preview" && fallbackMode
      ? getThemeModeVariant(theme, fallbackMode)
      : undefined);

  if (!resolvedModeVariant) return null;

  return createElement(Artwork, {
    variant,
    locked,
    tokens: resolvedModeVariant.artwork,
  });
}
