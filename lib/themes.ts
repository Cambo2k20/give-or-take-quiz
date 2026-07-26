import type { PlayerProgress } from "./progress";
import type { QuestionCategory } from "./types";

/**
 * Unlockable background themes.
 *
 * This file is the data-only piece of the theme registry. Each row is paired
 * with artwork in src/themes/ThemeArtwork.tsx and semantic UI tokens in that
 * theme's dedicated stylesheet. Custom themes own one canonical appearance;
 * the saved light/dark preference resumes when the custom theme is removed.
 */
type BackgroundThemeMetadata = {
  id: string;
  name: string;
  description: string;
  /** The rank that unlocks it, in the currency the player already earns. */
  gate: { category: QuestionCategory; rank: number; title: string };
};

export const BACKGROUND_THEMES = [
  {
    id: "deep-space",
    name: "Deep Space",
    description:
      "A drifting nebula and a slow orbit behind every screen. Reduced motion holds it still.",
    gate: { category: "space", rank: 5, title: "Stargazer" },
  },
] as const satisfies readonly BackgroundThemeMetadata[];

export type BackgroundTheme = (typeof BACKGROUND_THEMES)[number];
export type BackgroundThemeId = BackgroundTheme["id"];

/**
 * Local-only shortcut for visually testing a theme before its real rank gate
 * has been earned. `MODE` is "test" under Vitest and "production" in builds,
 * so neither automated coverage nor shipped code receives the shortcut.
 */
export function isThemeTemporarilyUnlocked(
  theme: BackgroundTheme,
): boolean {
  return import.meta.env.MODE === "development" && theme.id === "deep-space";
}

export function isThemeUnlocked(
  progress: PlayerProgress,
  theme: BackgroundTheme,
): boolean {
  if (isThemeTemporarilyUnlocked(theme)) return true;

  const entry = progress.categories.find(
    (category) => category.category === theme.gate.category,
  );
  return (entry?.rank ?? 1) >= theme.gate.rank;
}
