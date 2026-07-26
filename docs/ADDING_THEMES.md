# Adding a custom theme

Custom themes are unlockable, full-app visual treatments. Light/dark mode and
the equipped custom theme are independent choices: every custom theme supplies
a complete light palette and a complete dark palette, and the mode toggle
continues working while the theme is equipped.

Every theme consists of three pieces:

1. **Metadata and palettes** — display copy, unlock requirement, and complete
   light and dark semantic-token sets.
2. **Artwork** — both the card preview and the full-viewport backdrop.
3. **Visual CSS** — token-driven layout, effects, animation, and reduced-motion
   behaviour.

The theme id connects all three. Use a stable, lowercase, kebab-case id such as
`deep-space`; changing an id later also invalidates the stored equipped value.

## 1. Add the metadata and both palettes

Add an entry to `BACKGROUND_THEMES` in `lib/themes.ts`:

```ts
{
  id: "ocean-depths",
  name: "Ocean Depths",
  description: "Bioluminescent currents drift behind every screen.",
  gate: {
    category: "depth",
    rank: 5,
    title: "Abyss Diver",
  },
  tokens: {
    light: {
      "--bg": "#e7f4f4",
      // Every name in BACKGROUND_THEME_TOKEN_NAMES is required.
    },
    dark: {
      "--bg": "#03141b",
      // Every name in BACKGROUND_THEME_TOKEN_NAMES is required.
    },
  },
},
```

Copy Deep Space's token structure, then replace every value for both modes.
The `BackgroundThemeTokenPalette` type is a `Record` over
`BACKGROUND_THEME_TOKEN_NAMES`; omitting a token or either palette is a
compile-time error. Do not use `Partial`, optional properties, casts, or
fallback values to bypass that guarantee.

The shared UI consumes semantic roles rather than theme-specific colours:

- Canvas and surfaces: `--bg`, `--surface`, `--sunk`, `--rail`
- Text and borders: `--ink`, `--ink-soft`, `--muted`, `--line`,
  `--line-strong`
- Actions: `--accent`, `--accent-hover`, `--accent-shadow`, `--accent-ink`,
  `--accent-wash`, `--on-accent`
- Feedback: `--good`, `--warn`, `--bad`, and their `-wash` partners
- Depth: `--shadow-card`, `--shadow-press`
- Artwork roles: the `--artwork-*` tokens

Artwork tokens belong in both palettes too, even when their values are
identical. This keeps colour ownership in one typed registry and lets a future
theme intentionally adapt its illustration between light and dark.

`category` must be a valid `QuestionCategory`. The card unlocks when the
player's rank in that category reaches `rank`; `title` is the rank name shown
on the locked card.

`BackgroundThemeId` is derived from the metadata array, so TypeScript will
require the new id in the artwork registry in the next step.

## 2. Add one auto-discovered artwork component

Create `src/themes/OceanDepthsArtwork.tsx`. `ThemeArtwork` discovers every
`*Artwork.tsx` module except itself and verifies that there is exactly one for
every registry id. Do not edit a component map or stylesheet index.

New artwork uses one inline SVG for all structural geometry. Buildings,
windows, silhouettes, paths, trees and discrete lights belong inside its
viewBox so they cannot separate at a responsive breakpoint. Large blurred
washes and the vignette stay in the shared CSS frame.

```tsx
import type { BackgroundThemeId } from "../../lib/themes";
import type { ThemeArtworkProps } from "./ThemeArtwork";
import { SvgArtworkFrame } from "./SvgArtworkFrame";

export const themeId = "ocean-depths" satisfies BackgroundThemeId;

export default function OceanDepthsArtwork(
  props: ThemeArtworkProps,
) {
  return (
    <SvgArtworkFrame {...props} className="ocean-depths">
      <svg
        className="svg-theme-artwork__scene"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
        focusable="false"
      >
        {/* Structural artwork only; use var(--artwork-…) for colour. */}
      </svg>
    </SvgArtworkFrame>
  );
}
```

`xMidYMax slice` pins the scene to the bottom centre and crops its sides on
narrow screens instead of squashing it. Keep every structural relationship in
that same coordinate system. When one shape must contain another, use the same
geometry in an SVG `clipPath` or `mask`.

The component receives the complete light or dark token palette. It may include
theme-specific SVG animation rules through `SvgArtworkFrame`'s `motionStyles`
slot, but every colour must come from a CSS custom property and every animation
must stop under `prefers-reduced-motion: reduce`.

The shared frame already provides:

- CSS gradient atmosphere and vignette behind the SVG
- preview and fixed-backdrop geometry
- `aria-hidden="true"` and `pointer-events: none`
- a negative backdrop z-index
- reduced-motion handling for shared atmospheric animation

Deep Space deliberately remains on its existing CSS artwork path while City
Pulse proves the SVG format.

## The complete diff for another theme

After the extraction, adding a theme changes only the data registry and adds
one component:

```diff
diff --git a/lib/themes.ts b/lib/themes.ts
@@
   {
+    id: "ocean-depths",
+    name: "Ocean Depths",
+    description: "Bioluminescent currents below the game.",
+    gate: { category: "geography", rank: 5, title: "Abyss Diver" },
+    tokens: {
+      light: { /* every required token */ },
+      dark: { /* every required token */ },
+    },
+  },

diff --git a/src/themes/OceanDepthsArtwork.tsx b/src/themes/OceanDepthsArtwork.tsx
new file mode 100644
+export const themeId = "ocean-depths" satisfies BackgroundThemeId;
+export default function OceanDepthsArtwork(props: ThemeArtworkProps) {
+  return (
+    <SvgArtworkFrame {...props} className="ocean-depths">
+      <svg
+        className="svg-theme-artwork__scene"
+        viewBox="0 0 1600 900"
+        preserveAspectRatio="xMidYMax slice"
+        aria-hidden="true"
+        focusable="false"
+      >
+        {/* Structural artwork */}
+      </svg>
+    </SvgArtworkFrame>
+  );
+}
```

There is no third registration or CSS-index edit.

## Optional: unlock it temporarily during development

For visual development before the real rank is earned, add the new id to the
development-only condition in `isThemeTemporarilyUnlocked` in
`lib/themes.ts`. Keep it behind:

```ts
import.meta.env.MODE === "development"
```

Never weaken `isThemeUnlocked` for production. The temporary shortcut must not
apply in tests or production builds.

## Verification checklist

Before considering a theme complete:

- The locked card shows the correct gate and cannot be equipped.
- The unlocked card can apply and remove the theme.
- The card preview and full-screen backdrop render in both light and dark.
- The light/dark toggle remains enabled while the theme is equipped.
- Switching modes updates every semantic token without removing the artwork.
- Refreshing restores both the equipped theme and saved light/dark mode.
- Removing the custom theme clears its inline tokens and restores the base
  palette for the current mode.
- Text, controls, focus states, verdict colours and disabled states remain
  readable in both palettes.
- Narrow mobile layouts do not overflow.
- Reduced-motion mode removes or substantially reduces animation.
- `tests/backgroundTheme.test.ts` covers both complete palettes.
- `npm run lint`, `npm test` and `npm run build` all pass.

Deep Space is the reference implementation:

- Metadata and palettes: `lib/themes.ts`
- Palette application: `lib/backgroundTheme.ts`
- Artwork: `src/themes/DeepSpaceArtwork.tsx`
- Token-driven visual CSS: `src/themes/deep-space.css`
- Artwork registry: `src/themes/ThemeArtwork.tsx`
- Stylesheet registry: `src/themes/theme-styles.css`
