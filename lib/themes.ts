import type { PlayerProgress } from "./progress";
import type { QuestionCategory } from "./types";

/**
 * Unlockable background themes.
 *
 * Each row owns its metadata and at least one complete mode variant. Artwork
 * is paired by id in src/themes/ThemeArtwork.tsx. UI tokens are applied to the
 * root; artwork tokens remain scoped to that theme's artwork wrapper.
 */
export const BACKGROUND_THEME_UI_TOKEN_NAMES = [
  "--bg",
  "--surface",
  "--sunk",
  "--rail",
  "--ink",
  "--ink-soft",
  "--muted",
  "--line",
  "--line-strong",
  "--accent",
  "--accent-hover",
  "--accent-shadow",
  "--accent-ink",
  "--accent-wash",
  "--on-accent",
  "--good",
  "--good-wash",
  "--warn",
  "--warn-wash",
  "--bad",
  "--bad-wash",
  "--shadow-card",
  "--shadow-press",
] as const;

export type BackgroundThemeUiTokenName =
  (typeof BACKGROUND_THEME_UI_TOKEN_NAMES)[number];

export type BackgroundThemeUiTokenPalette = Readonly<
  Record<BackgroundThemeUiTokenName, string>
>;

export type BackgroundThemeArtworkTokenName = `--artwork-${string}`;
export type BackgroundThemeArtworkTokenPalette = Readonly<
  Record<BackgroundThemeArtworkTokenName, string>
>;

export type BackgroundThemeMode = "light" | "dark";

export type AtLeastOne<T, Keys extends keyof T = keyof T> =
  Keys extends keyof T
    ? Required<Pick<T, Keys>> & Partial<Omit<T, Keys>>
    : never;

export type BackgroundThemeModeVariant<
  Artwork extends BackgroundThemeArtworkTokenPalette =
    BackgroundThemeArtworkTokenPalette,
> = Readonly<{
  ui: BackgroundThemeUiTokenPalette;
  artwork: Artwork;
}>;

export type BackgroundThemeModes<
  Artwork extends BackgroundThemeArtworkTokenPalette =
    BackgroundThemeArtworkTokenPalette,
> = Readonly<
  AtLeastOne<
    Record<BackgroundThemeMode, BackgroundThemeModeVariant<Artwork>>
  >
>;

export type BackgroundThemeMetadata<
  Artwork extends BackgroundThemeArtworkTokenPalette =
    BackgroundThemeArtworkTokenPalette,
> = {
  id: string;
  name: string;
  description: string;
  /** The rank that unlocks it, in the currency the player already earns. */
  gate: { category: QuestionCategory; rank: number };
  /** A theme may support one application mode or both, but never neither. */
  modes: BackgroundThemeModes<Artwork>;
};

export function defineBackgroundTheme<
  const ThemeDefinition extends BackgroundThemeMetadata,
>(theme: ThemeDefinition): ThemeDefinition {
  const { light, dark } = theme.modes;
  if (!light && !dark) {
    throw new Error(
      `Background theme "${theme.id}" must support at least one mode.`,
    );
  }

  if (light && dark) {
    const lightKeys = Object.keys(light.artwork).sort();
    const darkKeys = Object.keys(dark.artwork).sort();
    const keysMatch =
      lightKeys.length === darkKeys.length &&
      lightKeys.every((key, index) => key === darkKeys[index]);
    if (!keysMatch) {
      throw new Error(
        `Background theme "${theme.id}" must use the same artwork tokens in light and dark modes.`,
      );
    }
  }

  return theme;
}

export const BACKGROUND_THEMES = [
  defineBackgroundTheme({
    id: "deep-space",
    name: "Deep Space",
    description:
      "A drifting nebula and a slow orbit behind every screen. Reduced motion holds it still.",
    gate: { category: "space", rank: 5 },
    modes: {
      dark: {
        ui: {
        "--bg": "#050611",
        "--surface": "rgba(12, 14, 35, 0.86)",
        "--sunk": "rgba(20, 22, 49, 0.82)",
        "--rail": "rgba(147, 233, 255, 0.16)",
        "--ink": "#f8f5ff",
        "--ink-soft": "#ddd7f4",
        "--muted": "#aaa3c8",
        "--line": "rgba(178, 142, 255, 0.24)",
        "--line-strong": "rgba(147, 233, 255, 0.36)",
        "--accent": "#9b7cff",
        "--accent-hover": "#b49cff",
        "--accent-shadow": "#5236b2",
        "--accent-ink": "#c4b3ff",
        "--accent-wash": "rgba(112, 73, 255, 0.18)",
        "--on-accent": "#0a0b1c",
        "--good": "#72dbb7",
        "--good-wash": "rgba(67, 201, 156, 0.14)",
        "--warn": "#f0bf67",
        "--warn-wash": "rgba(224, 161, 55, 0.14)",
        "--bad": "#f18aaa",
        "--bad-wash": "rgba(225, 88, 133, 0.14)",
        "--shadow-card":
          "0 18px 54px rgba(0, 0, 12, 0.38), 0 1px 0 rgba(255, 255, 255, 0.04)",
        "--shadow-press": "0 3px 0 var(--accent-shadow)",
        },
        artwork: {
        "--artwork-deep-space-sky": "#050611",
        "--artwork-nebula-violet": "rgba(112, 73, 255, 0.5)",
        "--artwork-nebula-cyan": "rgba(0, 204, 255, 0.32)",
        "--artwork-nebula-magenta": "rgba(255, 70, 178, 0.28)",
        "--artwork-nebula-mint": "rgba(71, 255, 204, 0.16)",
        "--artwork-star": "rgba(255, 255, 255, 0.85)",
        "--artwork-star-bright": "rgba(178, 142, 255, 0.95)",
        "--artwork-shooting-star": "rgba(255, 255, 255, 0.75)",
        "--artwork-shooting-star-glow": "rgba(130, 198, 255, 0.72)",
        "--artwork-vignette-inner": "rgba(5, 6, 17, 0.02)",
        "--artwork-vignette-middle": "rgba(5, 6, 17, 0.4)",
        "--artwork-vignette-outer": "rgba(5, 6, 17, 0.88)",
        "--artwork-orbit-line": "rgba(255, 255, 255, 0.09)",
        "--artwork-orbit-inner-line": "rgba(255, 255, 255, 0.06)",
        "--artwork-orbit-body": "#93e9ff",
        "--artwork-orbit-glow": "rgba(91, 216, 255, 0.55)",
        "--artwork-lock-ink": "rgba(255, 255, 255, 0.85)",
        "--artwork-lock-bg": "rgba(5, 6, 17, 0.35)",
        "--artwork-flow-mask": "none",
        "--artwork-veil": "rgba(5, 6, 17, 0.2)",
        },
      },
    },
  }),
  defineBackgroundTheme({
    id: "city-pulse",
    name: "City Pulse",
    description:
      "Midnight towers, mixed city lights and slow connections gathering below the game.",
    gate: {
      category: "technology",
      rank: 5,
    },
    modes: {
      dark: {
        ui: {
        "--bg": "#080c16",
        "--surface": "rgba(13, 20, 33, 0.88)",
        "--sunk": "rgba(17, 27, 42, 0.84)",
        "--rail": "rgba(99, 213, 225, 0.15)",
        "--ink": "#f3f7fb",
        "--ink-soft": "#d2e1e9",
        "--muted": "#92a9b6",
        "--line": "rgba(102, 193, 205, 0.22)",
        "--line-strong": "rgba(113, 219, 230, 0.35)",
        "--accent": "#ef7770",
        "--accent-hover": "#ff8b83",
        "--accent-shadow": "#8f3e3a",
        "--accent-ink": "#ff9a93",
        "--accent-wash": "rgba(239, 119, 112, 0.16)",
        "--on-accent": "#180d10",
        "--good": "#6fd0aa",
        "--good-wash": "rgba(74, 189, 148, 0.14)",
        "--warn": "#e3b660",
        "--warn-wash": "rgba(211, 154, 54, 0.14)",
        "--bad": "#ef847f",
        "--bad-wash": "rgba(218, 87, 81, 0.14)",
        "--shadow-card":
          "0 18px 54px rgba(0, 3, 10, 0.4), 0 1px 0 rgba(255, 255, 255, 0.035)",
        "--shadow-press": "0 3px 0 var(--accent-shadow)",
        },
        artwork: {
        "--artwork-city-sky": "#080c16",
        "--artwork-city-wash-blue": "rgba(36, 112, 160, 0.11)",
        "--artwork-city-wash-cyan": "rgba(40, 153, 186, 0.15)",
        "--artwork-city-wash-coral": "rgba(238, 105, 104, 0.13)",
        "--artwork-city-wash-teal": "rgba(54, 173, 176, 0.06)",
        "--artwork-city-vignette-inner": "rgba(4, 7, 13, 0.01)",
        "--artwork-city-vignette-middle": "rgba(4, 7, 13, 0.1)",
        "--artwork-city-vignette-outer": "rgba(3, 6, 11, 0.44)",
        "--artwork-city-rooftop-cyan": "rgba(108, 211, 222, 0.68)",
        "--artwork-city-rooftop-coral": "rgba(237, 128, 114, 0.62)",
        "--artwork-city-building-near": "rgba(16, 26, 40, 0.96)",
        "--artwork-city-building-far": "rgba(17, 28, 43, 0.58)",
        "--artwork-city-window-cyan": "rgba(117, 232, 237, 0.86)",
        "--artwork-city-window-coral": "rgba(247, 127, 111, 0.84)",
        "--artwork-city-connection": "rgba(108, 211, 222, 0.58)",
        "--artwork-city-lock-ink": "rgba(243, 247, 251, 0.84)",
        "--artwork-city-lock-bg": "rgba(8, 12, 22, 0.48)",
        "--artwork-city-veil": "rgba(3, 6, 11, 0.08)",
        },
      },
    },
  }),
  defineBackgroundTheme({
    id: "front-row",
    name: "Front Row",
    description:
      "Receding cinema seats beneath a softly changing screen glow.",
    gate: {
      category: "movies",
      rank: 5,
    },
    modes: {
      dark: {
        ui: {
        "--bg": "#0a0806",
        "--surface": "rgba(21, 15, 12, 0.9)",
        "--sunk": "rgba(31, 20, 18, 0.86)",
        "--rail": "rgba(201, 162, 75, 0.14)",
        "--ink": "#f4ede1",
        "--ink-soft": "#ddd0be",
        "--muted": "#ae9b88",
        "--line": "rgba(151, 94, 80, 0.24)",
        "--line-strong": "rgba(201, 162, 75, 0.34)",
        "--accent": "#c9a24b",
        "--accent-hover": "#ddba62",
        "--accent-shadow": "#6c5021",
        "--accent-ink": "#e2bd64",
        "--accent-wash": "rgba(201, 162, 75, 0.16)",
        "--on-accent": "#1a1208",
        "--good": "#73c29f",
        "--good-wash": "rgba(70, 166, 126, 0.14)",
        "--warn": "#e0b75c",
        "--warn-wash": "rgba(201, 151, 55, 0.14)",
        "--bad": "#e0838b",
        "--bad-wash": "rgba(181, 66, 78, 0.15)",
        "--shadow-card":
          "0 18px 54px rgba(0, 0, 0, 0.44), 0 1px 0 rgba(255, 239, 211, 0.035)",
        "--shadow-press": "0 3px 0 var(--accent-shadow)",
        },
        artwork: {
        "--artwork-auditorium-bg": "#0a0806",
        "--artwork-auditorium-vignette-inner": "rgba(10, 8, 6, 0.02)",
        "--artwork-auditorium-vignette-middle": "rgba(10, 8, 6, 0.22)",
        "--artwork-auditorium-vignette-outer": "rgba(7, 5, 4, 0.74)",
        "--artwork-row-divider": "rgba(201, 162, 75, 0.3)",
        "--artwork-screen-frame": "rgba(230, 198, 126, 0.42)",
        "--artwork-screen-panel": "rgba(238, 227, 204, 0.32)",
        "--artwork-seat-near": "rgba(5, 4, 3, 0.99)",
        "--artwork-seat-far": "rgba(74, 20, 32, 0.56)",
        "--artwork-screen-light": "rgba(238, 227, 204, 0.72)",
        "--artwork-screen-gold": "rgba(201, 162, 75, 0.76)",
        "--artwork-seat-rim": "rgba(118, 54, 52, 0.42)",
        "--artwork-auditorium-lock-ink": "rgba(255, 244, 220, 0.88)",
        "--artwork-auditorium-lock-bg": "rgba(10, 8, 6, 0.64)",
        "--artwork-auditorium-veil": "rgba(10, 8, 6, 0.08)",
        },
      },
    },
  }),
  defineBackgroundTheme({
    id: "moonlit-library",
    name: "Moonlit Library",
    description:
      "A midnight reading room of moonbeams, drifting dust and turning pages.",
    gate: {
      category: "history",
      rank: 5,
    },
    modes: {
      dark: {
        ui: {
        "--bg": "#070a14",
        "--surface": "rgba(22, 28, 48, 0.92)",
        "--sunk": "rgba(11, 16, 32, 0.88)",
        "--rail": "rgba(201, 162, 77, 0.16)",
        "--ink": "#eaf1ff",
        "--ink-soft": "#c6d2ea",
        "--muted": "#9aaac8",
        "--line": "rgba(175, 201, 247, 0.22)",
        "--line-strong": "rgba(201, 162, 77, 0.42)",
        "--accent": "#c9a24d",
        "--accent-hover": "#ebcd86",
        "--accent-shadow": "#76581c",
        "--accent-ink": "#ebcd86",
        "--accent-wash": "rgba(201, 162, 77, 0.16)",
        "--on-accent": "#171105",
        "--good": "#79d8b1",
        "--good-wash": "rgba(67, 190, 145, 0.14)",
        "--warn": "#ebcd86",
        "--warn-wash": "rgba(201, 162, 77, 0.14)",
        "--bad": "#f09aaa",
        "--bad-wash": "rgba(184, 73, 91, 0.16)",
        "--shadow-card":
          "0 18px 54px rgba(0, 0, 8, 0.46), 0 1px 0 rgba(234, 241, 255, 0.04)",
        "--shadow-press": "0 3px 0 var(--accent-shadow)",
        },
        artwork: {
        "--artwork-library-void": "#070a14",
        "--artwork-library-shelf": "#161c30",
        "--artwork-library-board-top": "#3a2c1e",
        "--artwork-library-board": "#241b14",
        "--artwork-library-board-deep": "#120d09",
        "--artwork-library-moon": "#afc9f7",
        "--artwork-library-moon-bright": "#eaf1ff",
        "--artwork-library-brass": "#c9a24d",
        "--artwork-library-page": "#f4ecd7",
        "--artwork-library-page-mid": "#e2d5b4",
        "--artwork-library-page-edge": "#bfb08c",
        "--artwork-library-book-1": "#1b2136",
        "--artwork-library-book-2": "#232b48",
        "--artwork-library-book-3": "#16203a",
        "--artwork-library-book-4": "#2a2340",
        "--artwork-library-book-5": "#1e2b3d",
        "--artwork-library-book-6": "#332a3a",
        "--artwork-library-book-7": "#1a2b33",
        "--artwork-library-book-8": "#2b2733",
        "--artwork-library-book-9": "#302436",
        "--artwork-library-book-10": "#1d2545",
        "--artwork-library-book-11": "#3a2e22",
        "--artwork-library-book-12": "#212c3a",
        "--artwork-library-vignette": "rgba(4, 6, 12, 0.72)",
        "--artwork-library-lock-ink": "rgba(234, 241, 255, 0.9)",
        "--artwork-library-lock-bg": "rgba(7, 10, 20, 0.64)",
        },
      },
    },
  }),
  defineBackgroundTheme({
    id: "first-light",
    name: "First Light",
    description:
      "A misted Mesozoic valley waking beneath a slow-moving dinosaur herd.",
    gate: {
      category: "dinosaurs",
      rank: 5,
    },
    modes: {
      dark: {
        ui: {
          "--bg": "#0a110f",
          "--surface": "rgba(15, 26, 22, 0.88)",
          "--sunk": "rgba(22, 35, 30, 0.84)",
          "--rail": "rgba(121, 201, 143, 0.15)",
          "--ink": "#eef4ef",
          "--ink-soft": "#d3e0d6",
          "--muted": "#93a89a",
          "--line": "rgba(79, 157, 105, 0.24)",
          "--line-strong": "rgba(121, 201, 143, 0.34)",
          "--accent": "#e0a878",
          "--accent-hover": "#f0bb8d",
          "--accent-shadow": "#7d5334",
          "--accent-ink": "#edb684",
          "--accent-wash": "rgba(224, 168, 120, 0.16)",
          "--on-accent": "#14100b",
          "--good": "#74c795",
          "--good-wash": "rgba(79, 157, 105, 0.15)",
          "--warn": "#ddb469",
          "--warn-wash": "rgba(199, 154, 74, 0.14)",
          "--bad": "#e08a86",
          "--bad-wash": "rgba(196, 87, 82, 0.15)",
          "--shadow-card":
            "0 18px 54px rgba(0, 6, 4, 0.42), 0 1px 0 rgba(226, 240, 230, 0.035)",
          "--shadow-press": "0 3px 0 var(--accent-shadow)",
        },
        artwork: {
          "--artwork-first-light-base": "#0a110f",
          "--artwork-first-light-sky-top": "#030713",
          "--artwork-first-light-sky-middle": "#10243a",
          "--artwork-first-light-sky-low": "#2a3b45",
          "--artwork-first-light-sky-horizon": "#515148",
          "--artwork-first-light-ground-top": "#2e3630",
          "--artwork-first-light-ground-middle": "#202822",
          "--artwork-first-light-ground-bottom": "#090e0c",
          "--artwork-first-light-dawn-core": "#ffe2c4",
          "--artwork-first-light-dawn-middle": "#ffc79b",
          "--artwork-first-light-dawn-edge": "#ffb98a",
          "--artwork-first-light-shadow": "#030706",
          "--artwork-first-light-mist": "#cfe0dc",
          "--artwork-first-light-cloud-cool": "#8fa7b6",
          "--artwork-first-light-cloud-warm": "#a89a8c",
          "--artwork-first-light-bank": "#0f1714",
          "--artwork-first-light-valley": "#93a79d",
          "--artwork-first-light-pool-core": "#c3d8ce",
          "--artwork-first-light-pool-middle": "#b3cabf",
          "--artwork-first-light-pool-edge": "#a8c0b5",
          "--artwork-first-light-ridge": "#16201f",
          "--artwork-first-light-treeline": "#121b19",
          "--artwork-first-light-star": "#edf8ff",
          "--artwork-first-light-star-warm": "#ffd9aa",
          "--artwork-first-light-star-cool": "#9ed7ff",
          "--artwork-first-light-airglow-blue": "#4d8fb8",
          "--artwork-first-light-airglow-violet": "#7655a3",
          "--artwork-first-light-milky-way": "#c4dce8",
          "--artwork-first-light-constellation": "#b9dcf3",
          "--artwork-first-light-meteor": "#f6fcff",
          "--artwork-first-light-hero": "#0a1110",
          "--artwork-first-light-herd-sauropod": "#101a17",
          "--artwork-first-light-herd-juvenile": "#121c19",
          "--artwork-first-light-herd-ceratopsian": "#0e1815",
          "--artwork-first-light-pterosaur": "#101a18",
          "--artwork-first-light-foliage": "#070d0c",
          "--artwork-first-light-vignette-inner": "rgba(10, 17, 15, 0.02)",
          "--artwork-first-light-vignette-middle": "rgba(10, 17, 15, 0.26)",
          "--artwork-first-light-vignette-outer": "rgba(6, 11, 9, 0.76)",
          "--artwork-first-light-veil": "rgba(10, 17, 15, 0.05)",
          "--artwork-first-light-lock-ink": "rgba(238, 244, 239, 0.9)",
          "--artwork-first-light-lock-bg": "rgba(10, 17, 15, 0.64)",
        },
      },
    },
  }),
  defineBackgroundTheme({
    id: "aurora-drift",
    name: "Aurora Drift",
    description:
      "Slow emerald and violet ribbons beneath a sparse, meteor-lit night sky.",
    gate: {
      category: "space",
      rank: 10,
    },
    modes: {
      dark: {
        ui: {
        "--bg": "#030509",
        "--surface": "rgba(8, 19, 25, 0.89)",
        "--sunk": "rgba(10, 30, 34, 0.84)",
        "--rail": "rgba(94, 234, 212, 0.15)",
        "--ink": "#f3fbfa",
        "--ink-soft": "#d1eeeb",
        "--muted": "#9ebbb8",
        "--line": "rgba(94, 234, 212, 0.22)",
        "--line-strong": "rgba(139, 92, 246, 0.38)",
        "--accent": "#5eead4",
        "--accent-hover": "#8bf4e4",
        "--accent-shadow": "#187a70",
        "--accent-ink": "#76f3df",
        "--accent-wash": "rgba(45, 212, 191, 0.16)",
        "--on-accent": "#05120f",
        "--good": "#72e0bd",
        "--good-wash": "rgba(64, 199, 156, 0.14)",
        "--warn": "#f0c568",
        "--warn-wash": "rgba(224, 170, 55, 0.14)",
        "--bad": "#f08ba7",
        "--bad-wash": "rgba(225, 88, 133, 0.14)",
        "--shadow-card":
          "0 18px 54px rgba(0, 5, 9, 0.42), 0 1px 0 rgba(255, 255, 255, 0.04)",
        "--shadow-press": "0 3px 0 var(--accent-shadow)",
        },
        artwork: {
        "--artwork-aurora-sky-center": "#0b1a1f",
        "--artwork-aurora-sky-middle": "#060d14",
        "--artwork-aurora-sky-edge": "#030509",
        "--artwork-aurora-violet": "rgba(168, 85, 247, 0.4)",
        "--artwork-aurora-emerald": "rgba(16, 185, 129, 0.35)",
        "--artwork-aurora-teal": "rgba(45, 212, 191, 0.5)",
        "--artwork-aurora-purple": "rgba(139, 92, 246, 0.4)",
        "--artwork-aurora-mint": "rgba(94, 234, 212, 0.4)",
        "--artwork-aurora-magenta": "rgba(217, 70, 239, 0.35)",
        "--artwork-aurora-star": "rgba(255, 255, 255, 0.82)",
        "--artwork-aurora-star-bright": "rgba(204, 251, 241, 0.96)",
        "--artwork-aurora-meteor-faint": "rgba(132, 199, 255, 0.12)",
        "--artwork-aurora-meteor-tail": "rgba(206, 235, 255, 0.68)",
        "--artwork-aurora-meteor-head": "rgba(255, 255, 255, 1)",
        "--artwork-aurora-meteor-glow": "rgba(160, 214, 255, 0.4)",
        "--artwork-aurora-meteor-bloom": "rgba(151, 210, 255, 0.78)",
        "--artwork-aurora-meteor-halo": "rgba(196, 137, 255, 0.3)",
        "--artwork-aurora-vignette": "rgba(0, 0, 0, 0.55)",
        "--artwork-aurora-lock-ink": "rgba(243, 251, 250, 0.88)",
        "--artwork-aurora-lock-bg": "rgba(3, 5, 9, 0.52)",
        "--artwork-aurora-veil": "rgba(3, 5, 9, 0.04)",
        },
      },
    },
  }),
] as const satisfies readonly BackgroundThemeMetadata[];

export type BackgroundTheme = (typeof BACKGROUND_THEMES)[number];
export type BackgroundThemeId = BackgroundTheme["id"];

export function getThemeModeVariant(
  theme: BackgroundThemeMetadata,
  mode: BackgroundThemeMode,
): BackgroundThemeModeVariant | undefined {
  return (
    theme.modes as Partial<
      Record<BackgroundThemeMode, BackgroundThemeModeVariant>
    >
  )[mode];
}

export function supportedModesForTheme(
  theme: BackgroundThemeMetadata,
): readonly BackgroundThemeMode[] {
  return (["light", "dark"] as const).filter(
    (mode) => getThemeModeVariant(theme, mode) !== undefined,
  );
}

export function isThemeSupportedInMode(
  theme: BackgroundThemeMetadata,
  mode: BackgroundThemeMode,
): boolean {
  return getThemeModeVariant(theme, mode) !== undefined;
}

const DEV_UNLOCKED_THEME_IDS = [
  "city-pulse",
  "front-row",
  "first-light",
  "aurora-drift",
] as const satisfies readonly BackgroundThemeId[];
const DEV_UNLOCKED_THEME_ID_SET: ReadonlySet<BackgroundThemeId> = new Set(
  DEV_UNLOCKED_THEME_IDS,
);

/**
 * Local-only shortcut for visually testing a theme before its real rank gate
 * has been earned. `MODE` is "test" under Vitest and "production" in builds,
 * so neither automated coverage nor shipped code receives the shortcut.
 */
export function isThemeTemporarilyUnlocked(
  theme: BackgroundTheme,
): boolean {
  return (
    import.meta.env.MODE === "development" &&
    DEV_UNLOCKED_THEME_ID_SET.has(theme.id)
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
