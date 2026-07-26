import type { ComponentType } from "react";
import type { BackgroundThemeId } from "../../lib/themes";
import { DeepSpaceArtwork } from "./DeepSpaceArtwork";

export type ThemeArtworkProps = {
  variant: "preview" | "backdrop";
  locked?: boolean;
};

const ARTWORK_BY_THEME = {
  "deep-space": DeepSpaceArtwork,
} satisfies Record<BackgroundThemeId, ComponentType<ThemeArtworkProps>>;

export function ThemeArtwork({
  themeId,
  variant,
  locked = false,
}: ThemeArtworkProps & { themeId: BackgroundThemeId | null }) {
  if (!themeId) return null;

  const Artwork = ARTWORK_BY_THEME[themeId];
  return <Artwork variant={variant} locked={locked} />;
}
