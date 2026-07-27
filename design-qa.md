# Give or Take design QA

## Source

- Supplied handoff: `Leaderboard and profile redesign-handoff.zip`
- Implemented selection: `Leaderboard & Profile.dc.html`
- Supporting runtime reviewed: `support.js`
- Primary reference states: `1a` mobile leaderboard, `1d` mobile profile, `2a` desktop leaderboard, `3a` desktop profile, and the `4a` Front Row palette example

## Compared states

- Dark-mode leaderboard at a desktop browser size and a roughly 600 px mobile browser size
- Dark-mode profile at a desktop browser size and the same roughly 600 px mobile browser size as the supplied mobile reference
- Default light-mode leaderboard and profile with a selected dark-only background theme inactive
- Signed-in profile populated with the real local player, category, achievement, unlock, and account data
- Leaderboard populated with the real local score rows

## Acceptance notes

- The leaderboard keeps the handoff's title/format row, scope controls, standing hero, rank treatment, compact list, and open-seat ending.
- Desktop keeps a dedicated **Form** column. It currently renders a neutral unavailable slot because the backend does not expose form history; no sample metrics were invented.
- Responsive leaderboard hides secondary table columns while preserving the rank, player, and best-score hierarchy.
- The profile keeps XP as the hero, shows all eight real subject ladders, gives achievements and backgrounds their own visible sections, and finishes with real account facts.
- Existing theme artwork and mode fallback behavior remain intact. Default light mode remains clean and readable when a dark-only background is selected.
- Focus treatment, reduced-motion behavior, empty leaderboard space, long account text, and theme availability labels remain supported by the existing application systems.

## Deliberate differences from the mock data

- Weekly XP, streaks, membership dates, achievement dates, and leaderboard form histories are omitted because the current application does not provide those values.
- The profile renders all eight real subject cards instead of the handoff's abbreviated mobile subset.
- Existing app navigation and theme controls are retained rather than replaced with non-functional mock controls.

## Verification

- `npm run lint` — passed
- `npm test -- --run` — 187 tests passed
- `npm run build` — passed, including data validation, TypeScript, and production Vite build
- Visual side-by-side review of supplied reference and implementation — passed
- Dark and default-light visual review — passed

## Unified home header

### Evidence

- Source visual truth: `C:\Users\Cambo\Documents\0.1giveortake\Home page header bar redesign.zip`, rendered from `Home.dc.html#1a`.
- Focused source capture: `C:\Users\Cambo\AppData\Local\Temp\home-page-header-redesign-handoff\reference-header.jpg`.
- Focused implementation capture: `C:\Users\Cambo\AppData\Local\Temp\home-page-header-redesign-handoff\implementation-header-dark.jpg`.
- Combined comparison input: `C:\Users\Cambo\AppData\Local\Temp\home-page-header-redesign-handoff\comparison-dark.jpg`.
- Responsive captures: `desktop-dark.jpg`, `desktop-light.jpg`, `mobile-dark.jpg`, and `mobile-light.jpg` in the same temporary QA folder.
- Source capture: 1280 × 720 pixels. Implementation capture: 1265 × 712 pixels. Both were rendered at device scale 1 and normalized to equal-width columns in the focused comparison.
- Responsive implementation frames used 1200 × 700 and 390 × 844 CSS-pixel iframes inside 1265 × 712 browser captures.
- State: signed-in player, current Daily unplayed, Past available, homepage/category phase.

### Full-view comparison

- The implementation preserves the supplied three-part hierarchy: Daily status left, a genuinely centred wordmark, and account controls right.
- The single rounded shell has the same restrained border, compact height, warm surface treatment and sticky placement as the reference.
- The additional Past control is the previously agreed functional adaptation; the Daily cluster itself replaces the visible Play button.
- At 390 × 844 the shell becomes two rows without horizontal overflow: brand/navigation first, Daily/Past second.
- Default light mode falls back to the original warm palette; dark background artwork and theme tokens remain unchanged.

### Focused fidelity review

- **Fonts and typography:** Existing Nunito and Fraunces product fonts reproduce the reference hierarchy. Daily labels, date, wordmark and controls retain readable optical weights without wrapping.
- **Spacing and layout rhythm:** The balanced desktop grid keeps the wordmark centred; mobile spacing, 22px shell radius and 44px-class touch targets remain intact at 390px.
- **Colors and tokens:** The header uses only existing semantic surface, line, accent, ink and muted tokens. No theme palette or artwork token changed.
- **Image and asset fidelity:** The reference contains no raster artwork or bespoke icon asset in the header. Existing product mark and existing theme/flame icons were reused; no new placeholder asset was introduced.
- **Copy and content:** Daily, compact date, streak, Past, Leaderboard/Board, account name and theme labels match real application state. The score remains in the replay button's accessible name rather than adding visible density.

### Interaction and accessibility checks

- Daily starts the correct five-question round and switches back to the standard in-game header.
- Past opens the existing archive.
- Brand, leaderboard, account and theme controls retain their original destinations and behavior.
- Daily exposes distinct Play and Replay accessible names; Replay includes the saved score.
- Past is omitted when no archives exist, and leaderboard/account controls are omitted when that feature is disabled.
- Keyboard focus uses the existing global focus ring; reduced-motion behavior remains inherited from the existing global rule.

### Findings and comparison history

- Initial focused comparison found one P2 accessibility mismatch: the Daily, Past and navigation controls measured 40–42px rather than the planned 44px touch target.
- The controls were raised to a 44px minimum and desktop/mobile captures were refreshed in both modes. The post-fix evidence shows the larger targets still fit without wrapping or horizontal overflow.
- The final comparison found no remaining actionable P0, P1 or P2 implementation mismatch.
- The first comparison page cropped the source too high; the temporary comparison crop was normalized and captured again. This was evidence normalization only and required no product-code change.
- Accepted P3 difference: Past is visible beside the Daily action, as chosen to retain archive access.
- No additional focused crop was needed after the header-only comparison because all typography, controls, borders and spacing were readable at the captured scale.

### Verification

- `npm run lint` — passed.
- `npm test -- --run` — 14 files and 187 tests passed.
- `npm run build` — passed, including data validation, TypeScript and production Vite output.

## Adaptive brand mark

### Evidence

- Source visual truth: `C:\Users\Cambo\.codex\generated_images\019f9dfa-7a75-7d93-bde2-46607ecd925e\call_gWHLEl1tZjNsgcpNSEsRMCuT.png` (selected **Opposing Brackets** concept).
- Generated production asset source: `C:\Users\Cambo\.codex\generated_images\019f9dfa-7a75-7d93-bde2-46607ecd925e\call_BOR0WCLZw0ZMbEBKwjunq8hr.png`.
- Rendered implementation captures:
  - `C:\Users\Cambo\AppData\Local\Temp\give-or-take-logo-light.png`
  - `C:\Users\Cambo\AppData\Local\Temp\give-or-take-logo-deep-space.png`
  - `C:\Users\Cambo\AppData\Local\Temp\give-or-take-logo-city-pulse.png`
  - `C:\Users\Cambo\AppData\Local\Temp\give-or-take-logo-front-row.png`
- Combined full-view comparison: `C:\Users\Cambo\AppData\Local\Temp\give-or-take-logo-qa-full.png`.
- Combined focused comparison: `C:\Users\Cambo\AppData\Local\Temp\give-or-take-logo-qa-focused.png`.
- Source pixels: 1536 x 1024. Implementation screenshots: 1263 x 1257 pixels from a 1278 x 1272 CSS-pixel browser viewport at device scale 1.
- Comparison images normalize the source and implementation by proportional downscaling only; neither artifact was stretched.
- State: signed-in player on the homepage plus the standard account header, in default light, Deep Space, City Pulse, and Front Row.

### Full-view comparison

- The selected bracket-and-point idea is clearly recognizable in the live header without changing the existing homepage hierarchy or header proportions.
- The mark remains subordinate to the product name and does not compete with the Daily or navigation controls.
- Existing theme artwork, palettes, typography, and page composition remain unchanged.

### Focused fidelity review

- **Fonts and typography:** The existing product wordmark type remains unchanged. Its 800 weight, 17-23px responsive sizing, and spacing preserve the current header while matching the selected concept's heavy sans-serif character.
- **Spacing and layout rhythm:** The production mark uses a compact 28 x 21px base frame and a 32 x 24px homepage frame. It stays vertically centred and does not change the header shell height.
- **Colors and tokens:** The left bracket and centre point use the active semantic `--accent`; the right bracket uses the wordmark's current text colour. This intentionally adapts the concept to every current and future palette without adding theme-specific overrides.
- **Image quality and asset fidelity:** Both visible shapes come from transparent raster masks generated from the selected ImageGen artwork. Edges remain clean at header size, with no white halo, stretched crop, CSS drawing, inline SVG, or placeholder asset.
- **Copy and content:** “Give or Take” and the accessible “Give or Take home” label are unchanged.

### Interaction, accessibility, and browser checks

- Home navigation works from both the merged homepage header and the standard application header.
- Theme switching and selecting Deep Space, City Pulse, and Front Row update the mark immediately.
- The decorative mark remains `aria-hidden`; the button retains its accessible label and keyboard focus behavior.
- Browser console check found no errors.
- The fixed in-app browser viewport was used for visual comparison. The existing sub-720px mark sizing rule was updated in place; no surrounding responsive layout rule changed.

### Findings and comparison history

- The first generated mask split allowed a thin neutral sliver to overlap the centre point. The masks were regenerated from the same source with the split moved into the clear gap between the centre point and right bracket.
- The post-fix focused comparison shows a clean centre point in all four palettes, with no overlap or transparency halo.
- No actionable P0, P1, or P2 differences remain.
- Accepted P3 adaptation: the default app uses its established warm accent instead of the concept board's fixed violet, and City Pulse uses the semantic text colour for the neutral bracket instead of introducing an extra cyan-only logo token. This is deliberate theme-system integration, not visual drift.

### Verification

- `npm run lint` — passed.
- `npm test -- --run` — 15 files and 198 tests passed.
- `npm run build` — passed, including data validation, TypeScript, and production Vite output.

## Aurora Drift theme

### Evidence

- Source visual truth: `C:\Users\Cambo\Documents\Codex\2026-07-27\https-supabase-com-dashboard-project-zwovdyyuacuipfhtycxw\animated-space-background-options\audit\07-improved-1c-shooting-star.png`.
- Browser-rendered implementation: `C:\Users\Cambo\Documents\Codex\2026-07-27\https-supabase-com-dashboard-project-zwovdyyuacuipfhtycxw\animated-space-background-options\audit\aurora-drift-production-640x360.png`.
- Equal-size comparison input: `C:\Users\Cambo\Documents\Codex\2026-07-27\https-supabase-com-dashboard-project-zwovdyyuacuipfhtycxw\animated-space-background-options\audit\aurora-drift-source-vs-production.png` (source left, production right).
- Source and implementation pixels: 640 x 360. Implementation CSS frame: 640 x 360 at device scale 1. No scaling, stretching, density conversion or device-frame normalization was required.
- State: dark-only Aurora Drift artwork with the first meteor held at its visible keyframe for a deterministic comparison. The live preview uses the production timing and remains animated.

### Full-view comparison

- The production frame preserves the selected 1c composition: teal-black radial sky, violet atmosphere above, emerald light below, two soft horizontal aurora ribbons, a dark vignette and a top-right diagonal meteor.
- The meteor keeps the improved five-pixel luminous head, tapered blue-white trail and layered violet-blue bloom from the selected source.
- The final star field has comparable visual density without creating 150 DOM nodes. Small tiled CSS stars provide depth while the brighter hand-placed layer prevents visible repetition.

### Focused fidelity review

- **Fonts and typography:** not applicable; both the visual target and theme artwork contain no text.
- **Spacing and layout rhythm:** the source and implementation share the same 16:9 frame, ribbon band, meteor quadrant and edge vignette. The implementation is also responsive at the full portrait browser viewport without clipping or exposing a hard artwork boundary.
- **Colors and tokens:** the production tokens preserve the source values for the sky (`#0b1a1f` through `#030509`), violet, emerald, teal, purple, mint and magenta layers. The full UI palette passed the shared contrast checks.
- **Image quality and asset fidelity:** the source itself is generated CSS motion rather than a raster illustration. Production uses the same code-native layer technique, with sharper CSS stars and no stretched raster, compression, masking halo or substitute asset.
- **Copy and content:** the registry name is “Aurora Drift”; its unlock is Space rank 10, whose live rank title is “Orbit Scout.”
- A separate focused crop was not needed because the equal-size 640 x 360 comparison makes the meteor head, trail, stars, ribbons and vignette individually readable.

### Interaction, accessibility and browser checks

- The theme registry auto-discovers one artwork component for Aurora Drift and renders both locked preview and equipped backdrop variants.
- Gallery animation stays paused until hover, focus or active interaction. Reduced motion stops every aurora animation and removes the meteors.
- Aurora Drift is dark-only, persists through the existing background preference flow and remains independent of the free light/dark setting.
- The live production preview loads both aurora ribbons and both meteors. Reload checks found no console event or page error in either the integrated app or the isolated artwork preview.
- The unlock contract has a regression test for `{ category: "space", rank: 10 }`.

### Findings and comparison history

- Initial P2: the first production capture had much lower star density than the selected 1c source. The base layer was expanded with small, staggered repeating fields while retaining the brighter hand-placed stars. The post-fix equal-size comparison shows comparable density with less foreground glare behind game UI.
- Accepted P3: the production stars are slightly dimmer than the source. This preserves the source's depth while reducing competition with live game copy and controls.
- No actionable P0, P1 or P2 differences remain.

### Verification

- `npm run lint` — passed.
- `npm test` — 15 files and 209 tests passed.
- `npm run build` — passed, including data validation, TypeScript and production Vite output.

final result: passed
