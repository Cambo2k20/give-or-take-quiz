import type { PlayerProgress } from "./progress";
import type { QuestionCategory } from "./types";

/**
 * Unlockable background themes.
 *
 * A background theme is deliberately *only* a background: it never touches
 * `--ink`, `--surface`, or any token a card or button reads, so it can never
 * make existing UI illegible. It only ever overrides `--bg` — the one token
 * spoken for solely by `body`, nothing else — and paints its own artwork in a
 * layer behind everything. Adding a theme is adding a row here plus one CSS
 * block; nothing about the rest of the app has to know it exists.
 */
export type BackgroundTheme = {
  id: string;
  name: string;
  description: string;
  /** The rank that unlocks it, in the currency the player already earns. */
  gate: { category: QuestionCategory; rank: number; title: string };
};

export const BACKGROUND_THEMES: readonly BackgroundTheme[] = [
  {
    id: "deep-space",
    name: "Deep Space",
    description:
      "A drifting nebula and a slow orbit behind every screen. Reduced motion holds it still.",
    gate: { category: "space", rank: 5, title: "Stargazer" },
  },
];

/**
 * Local-only shortcut for visually testing a theme before its real rank gate
 * has been earned. `MODE` is "test" under Vitest and "production" in builds,
 * so neither automated coverage nor shipped code receives the shortcut.
 */
export function isThemeTemporarilyUnlocked(
  theme: BackgroundTheme,
): boolean {
  return (
    import.meta.env.MODE === "development" && theme.id === "deep-space"
  );
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
