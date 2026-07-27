# Adding a custom theme

Custom themes are unlockable backgrounds. A theme may be **light-only**,
**dark-only**, or support **both modes**. Selecting a single-mode theme does
not disable the app's light/dark toggle:

- In a supported mode, the theme's UI palette and artwork are active.
- In an unsupported mode, the app uses its original default palette and no
  custom backdrop.
- The selected theme is still remembered, shown as “Applied in light mode” or
  “Applied in dark mode”, and returns automatically when that mode is active
  again.

Adding a theme requires one registry entry and one artwork component. Optional
theme CSS is imported by that component; there is no component map or shared
stylesheet index to edit.

## 1. Add the registry entry

Add a `defineBackgroundTheme(...)` entry to `BACKGROUND_THEMES` in
`lib/themes.ts`. The id is stable, lowercase kebab-case and connects the
metadata, saved selection and artwork module.

Each supported mode contains separate `ui` and `artwork` palettes:

```ts
defineBackgroundTheme({
  id: "ocean-depths",
  name: "Ocean Depths",
  description: "Bioluminescent currents below the game.",
  gate: {
    category: "geography",
    rank: 5,
  },
  modes: {
    dark: {
      ui: {
        "--bg": "#03141b",
        // Every BACKGROUND_THEME_UI_TOKEN_NAMES entry is required.
      },
      artwork: {
        "--artwork-ocean-base": "#03141b",
        "--artwork-ocean-glow": "rgba(67, 220, 205, 0.18)",
        // Theme-local names are encouraged.
      },
    },
  },
}),
```

`modes` is an `AtLeastOne` type, so omitting both modes is a compile-time
error. A supported mode must provide every semantic UI token. Artwork tokens
are scoped to that theme's wrapper and may use meaningful theme-local names.

The UI palette owns:

- Canvas and surfaces: `--bg`, `--surface`, `--sunk`, `--rail`
- Text and borders: `--ink`, `--ink-soft`, `--muted`, `--line`,
  `--line-strong`
- Actions: `--accent`, `--accent-hover`, `--accent-shadow`, `--accent-ink`,
  `--accent-wash`, `--on-accent`
- Feedback: `--good`, `--warn`, `--bad`, and their `-wash` partners
- Depth: `--shadow-card`, `--shadow-press`

`category` must be a real `QuestionCategory`. The example uses `geography`;
inventing a category such as `depth` will fail the typecheck.

Gate titles are not duplicated in this registry. The unlock card resolves the
matching `(category, rank)` title from the public `rank_titles` badge
catalogue, so correcting a ladder title updates ranks, rewards and theme copy
together.

### Light-only

```ts
modes: {
  light: {
    ui: { /* complete light UI palette */ },
    artwork: { /* light artwork tokens */ },
  },
},
```

### Dark-only

```ts
modes: {
  dark: {
    ui: { /* complete dark UI palette */ },
    artwork: { /* dark artwork tokens */ },
  },
},
```

Deep Space, City Pulse and Front Row are currently dark-only.

### Dual-mode

```ts
modes: {
  light: {
    ui: { /* complete light UI palette */ },
    artwork: {
      "--artwork-ocean-base": "#dff4f2",
      "--artwork-ocean-glow": "rgba(16, 105, 116, 0.12)",
    },
  },
  dark: {
    ui: { /* complete dark UI palette */ },
    artwork: {
      "--artwork-ocean-base": "#03141b",
      "--artwork-ocean-glow": "rgba(67, 220, 205, 0.18)",
    },
  },
},
```

For a dual-mode theme, use the same artwork-token keys in both modes. That
lets one artwork component change colour without changing structure.

## 2. Add the artwork component

Create `src/themes/OceanDepthsArtwork.tsx`. `ThemeArtwork` auto-discovers
every `*Artwork.tsx` module except itself and verifies one component exists for
each registry id.

```tsx
import type { BackgroundThemeId } from "../../lib/themes";
import type { ThemeArtworkProps } from "./ThemeArtwork";
import { SvgArtworkFrame } from "./SvgArtworkFrame";
import "./ocean-depths.css";

export const themeId = "ocean-depths" satisfies BackgroundThemeId;

export default function OceanDepthsArtwork(props: ThemeArtworkProps) {
  return (
    <SvgArtworkFrame
      {...props}
      className="ocean-depths"
      washCount={2}
    >
      <svg
        className="ocean-depths__scene"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
        focusable="false"
      >
        {/* Use var(--artwork-ocean-...) for every colour. */}
      </svg>
    </SvgArtworkFrame>
  );
}
```

Put buildings, windows, silhouettes, paths, trees and discrete lights in one
inline SVG viewBox. If one shape must contain another, share its geometry
through an SVG `clipPath` or `mask`. `xMidYMax slice` anchors the scene to the
bottom centre and crops it on narrow screens instead of squashing it.

Keep large blurred washes, broad colour fields and the vignette in CSS. The
shared frame can render zero to three atmosphere washes with `washCount`.
Do not convert large CSS blur effects to SVG filters.

Import optional CSS from the artwork module itself:

```css
.ocean-depths__current {
  animation: ocean-current-drift 29s ease-in-out infinite alternate;
}

.svg-theme-artwork--preview .ocean-depths__current {
  animation-play-state: paused;
}

.theme-card-button:is(:hover, :focus-visible, :active)
  .ocean-depths__current {
  animation-play-state: running;
}

@media (prefers-reduced-motion: reduce) {
  .ocean-depths__current {
    animation: none;
  }
}
```

Never render a `<style>` tag from the component. Co-located imported CSS is
deduplicated and processed by Vite. Preview motion stays paused until hover,
keyboard focus or press; reduced motion disables every animation.

## Performance and accessibility rules

- Preserve the established visual identity when hardening an existing theme.
  Moving animation rules into co-located CSS or grouping repeated elements
  must not silently remove signature motion, depth or atmospheric layers.
- Animate only group-level `transform` and `opacity`, never `filter`,
  `background-position`, SVG geometry or hundreds of individual elements.
- Use the fewest coherent moving groups the artwork needs. City Pulse groups
  its windows into six shared cycles; it does not animate windows one by one.
- Put `will-change` only on actively animated backdrop groups, not static
  previews or children.
- Do not use `backdrop-filter` over animated artwork.
- Below 600px, reduce blur radii and drop an atmospheric layer if necessary.
- Artwork remains `aria-hidden="true"`, non-interactive and behind the app.
- Keep the centre readable and verify at 390×844 and 1920×1080.

## Temporary development unlock

Add only the theme id being worked on to the typed development allowlist used
by `isThemeTemporarilyUnlocked`. Do not make all non-empty ids pass:

```ts
const DEV_UNLOCKED_THEME_IDS = ["ocean-depths"] satisfies
  readonly BackgroundThemeId[];
```

The shortcut must remain restricted to `import.meta.env.MODE ===
"development"` so tests and production still exercise locked cards.

## Verification checklist

- Locked and unlocked cards show the correct gate and interaction state.
- A single-mode card shows its “Light mode” or “Dark mode” badge.
- Applying in an unsupported mode keeps the selection but renders the default
  app palette and no custom backdrop.
- Returning to a supported mode restores the theme without another click.
- Tapping the selected card removes it in either supported or unsupported
  mode and clears all inline theme tokens.
- Refresh restores the saved selection and only activates it in a supported
  mode.
- Dual-mode themes update both UI and artwork tokens without stale values.
- Card previews use the theme's real supported artwork in every app mode.
- Text, controls, focus states, feedback colours and footer remain readable.
- Normal and reduced-motion rendering stay smooth in Chrome and Edge.
- `npm run lint`, `npm test` and `npm run build` pass.

Current SVG references:

- Front Row: three static atmospheric washes and one screen-glow animation
- City Pulse: shared viewBox geometry, clipped windows, six grouped light
  cycles, backdrop-only traffic and subtle skyline parallax
- Deep Space: legacy CSS artwork kept as a compatibility reference
