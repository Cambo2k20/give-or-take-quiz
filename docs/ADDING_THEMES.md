# Adding a custom theme

Custom themes are unlockable, full-app visual treatments. Each theme has one
canonical appearance: while it is equipped, its semantic UI colours replace
both the normal light and dark palettes and the light/dark control is disabled.
Removing the custom theme restores the player's saved light/dark preference.

Every theme consists of three pieces:

1. **Metadata** — its id, display copy and unlock requirement.
2. **Artwork** — both the card preview and the full-viewport backdrop.
3. **Semantic UI tokens** — the colours and surfaces used by the existing UI.

The theme id connects all three. Use a stable, lowercase, kebab-case id such as
`deep-space`; changing an id later also invalidates the stored equipped value.

## 1. Add the metadata

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
},
```

`category` must be a valid `QuestionCategory`. The card unlocks when the
player's rank in that category reaches `rank`; `title` is the rank name shown
on the locked card.

`BackgroundThemeId` is derived from this array. TypeScript will therefore
require the new id to be added to the artwork registry in the next step.

## 2. Add the artwork

Create `src/themes/OceanDepthsArtwork.tsx`. One component supplies two
variants:

```tsx
import type { ThemeArtworkProps } from "./ThemeArtwork";

export function OceanDepthsArtwork({
  variant,
  locked = false,
}: ThemeArtworkProps) {
  if (variant === "preview") {
    return (
      <div
        className={`ocean-depths-preview${locked ? " is-locked" : ""}`}
        aria-hidden="true"
      >
        {/* Decorative preview layers */}
      </div>
    );
  }

  return (
    <div className="ocean-depths-backdrop" aria-hidden="true">
      {/* Decorative full-viewport layers */}
    </div>
  );
}
```

The preview appears inside the Unlocks card. The backdrop is mounted once
behind the whole application when the theme is equipped.

Keep the artwork decorative:

- Use `aria-hidden="true"` so it is ignored by assistive technology.
- Prefix class names with the theme id to avoid collisions.
- Set `pointer-events: none` on full-screen artwork.
- Keep the backdrop beneath the UI with an appropriate `z-index`.
- Provide a `prefers-reduced-motion` rule for every animation.
- Avoid remote images or fonts; the application is designed to work offline.

Register the component in `src/themes/ThemeArtwork.tsx`:

```ts
import { OceanDepthsArtwork } from "./OceanDepthsArtwork";

const ARTWORK_BY_THEME = {
  "deep-space": DeepSpaceArtwork,
  "ocean-depths": OceanDepthsArtwork,
} satisfies Record<BackgroundThemeId, ComponentType<ThemeArtworkProps>>;
```

The `satisfies Record<...>` check deliberately makes a missing artwork
registration a compile-time error.

## 3. Add the semantic tokens and artwork CSS

Create `src/themes/ocean-depths.css`. Scope the palette to the theme's root
attribute:

```css
:root[data-bg-theme="ocean-depths"] {
  --bg: #03141b;
  --surface: rgba(6, 31, 40, 0.88);
  --sunk: rgba(8, 42, 52, 0.84);
  --rail: rgba(105, 230, 221, 0.16);

  --ink: #f1fffd;
  --ink-soft: #cce8e4;
  --muted: #91b8b3;

  --line: rgba(123, 224, 214, 0.24);
  --line-strong: rgba(123, 224, 214, 0.38);

  --accent: #55d8cc;
  --accent-hover: #79e7dc;
  --accent-shadow: #16786f;
  --accent-ink: #75e3d8;
  --accent-wash: rgba(85, 216, 204, 0.16);
  --on-accent: #031716;

  --good: #78ddb0;
  --good-wash: rgba(68, 190, 137, 0.14);
  --warn: #edc878;
  --warn-wash: rgba(221, 169, 64, 0.14);
  --bad: #ef8d9d;
  --bad-wash: rgba(220, 83, 107, 0.14);

  --shadow-card: 0 18px 54px rgba(0, 8, 12, 0.4);
  --shadow-press: 0 3px 0 var(--accent-shadow);
}

/* Preview and backdrop rules follow here. */

@media (prefers-reduced-motion: reduce) {
  .ocean-depths-preview *,
  .ocean-depths-backdrop * {
    animation: none;
  }
}
```

Define every semantic colour token above, even if some values match the base
palette. This prevents the saved light/dark palette underneath the custom
theme from leaking into its canonical appearance.

Do not create separate `[data-theme="light"]` or `[data-theme="dark"]`
variants for a custom theme. Custom themes intentionally have one authored
appearance.

Add the stylesheet to `src/themes/theme-styles.css`:

```css
@import "./deep-space.css";
@import "./ocean-depths.css";
```

This index loads after `globals.css`, allowing custom theme tokens to override
the base palette without `!important`.

## Optional: unlock it temporarily during development

For visual development before the real rank is earned, add the new id to the
development-only condition in `isThemeTemporarilyUnlocked` in
`lib/themes.ts`. Keep the check behind:

```ts
import.meta.env.MODE === "development"
```

Never weaken `isThemeUnlocked` for production. The temporary shortcut must
not apply in tests or production builds.

## Verification checklist

Before considering a theme complete:

- The locked card shows the correct gate and cannot be equipped.
- The unlocked card can apply and remove the theme.
- The card preview and full-screen backdrop both render correctly.
- Refreshing the page restores the equipped theme.
- The light/dark control is disabled while the theme is equipped.
- The theme looks identical whether the saved base preference is light or
  dark.
- Removing the theme restores that saved base preference.
- Text, controls, focus states, verdict colours and disabled states remain
  readable.
- Narrow mobile layouts do not overflow.
- Reduced-motion mode removes or substantially reduces animation.
- `npm run lint`, `npm test` and `npm run build` all pass.

Deep Space is the reference implementation:

- Metadata: `lib/themes.ts`
- Artwork: `src/themes/DeepSpaceArtwork.tsx`
- Semantic tokens and visual CSS: `src/themes/deep-space.css`
- Artwork registry: `src/themes/ThemeArtwork.tsx`
- Stylesheet registry: `src/themes/theme-styles.css`
